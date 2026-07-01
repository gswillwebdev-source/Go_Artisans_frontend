import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY
const FEDAPAY_API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1'

const MIN_WITHDRAW = 1000

async function getAuthUser(request) {
  if (!supabaseUrl || !supabaseServiceKey) return null
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const admin = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null
  return { user, admin }
}

// POST /api/wallet/withdraw
// Request a withdrawal from wallet to mobile money via FedaPay
export async function POST(request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, admin } = auth

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { amount_xof, payment_method, phone_number } = body || {}
  const allowed = ['mtn', 'moov', 'orange', 'togocel']
  const amount = Number(amount_xof)

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
    return NextResponse.json({ error: `Minimum withdrawal is ${MIN_WITHDRAW.toLocaleString()} XOF` }, { status: 400 })
  }
  if (!allowed.includes(String(payment_method || '').toLowerCase())) {
    return NextResponse.json({ error: 'Unsupported payment method. Use mtn, moov, orange, or togocel.' }, { status: 400 })
  }
  if (!String(phone_number || '').trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }

  const method = String(payment_method).toLowerCase()
  const phone = String(phone_number).trim()

  // Check wallet balance
  const { data: wallet } = await admin
    .from('wallets')
    .select('balance_xof')
    .eq('user_id', user.id)
    .single()

  const balance = Number(wallet?.balance_xof ?? 0)
  if (balance < amount) {
    return NextResponse.json({
      error: `Insufficient balance. Available: ${balance.toLocaleString()} XOF, requested: ${amount.toLocaleString()} XOF`,
      available: balance,
    }, { status: 400 })
  }

  if (!process.env.FEDAPAY_SECRET_KEY) {
    return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 })
  }

  // Pre-generate withdrawal record ID for traceability
  const { data: withdrawal, error: insertErr } = await admin
    .from('wallet_withdrawals')
    .insert({
      user_id: user.id,
      amount_xof: amount,
      payment_method: method,
      phone_number: phone,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !withdrawal) {
    return NextResponse.json({ error: 'Failed to create withdrawal record' }, { status: 500 })
  }

  // Debit wallet immediately (hold funds during processing)
  const { error: debitErr } = await admin.rpc('debit_wallet', {
    p_user_id: user.id,
    p_amount_xof: amount,
  })

  if (debitErr) {
    // Clean up record and return error
    await admin.from('wallet_withdrawals').delete().eq('id', withdrawal.id)
    return NextResponse.json({ error: debitErr.message || 'Failed to debit wallet' }, { status: 400 })
  }

  // Log the debit in transaction ledger
  await admin.from('wallet_transactions').insert({
    user_id: user.id,
    type: 'withdrawal',
    amount_xof: amount,
    reference_id: withdrawal.id,
    description: `Withdrawal to ${method.toUpperCase()} ${phone}`,
  })

  // Submit payout request to FedaPay
  try {
    const fedaRes = await fetch(`${FEDAPAY_API_BASE}/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: { iso: 'XOF' },
        description: `GoArtisans wallet withdrawal ${withdrawal.id}`,
        metadata: { withdrawal_id: withdrawal.id, user_id: user.id, source: 'wallet_withdrawal' },
        destination: { type: 'mobile_money', operator: method, number: phone },
      }),
    })

    const fedaBody = await fedaRes.json().catch(() => ({}))
    const transfer = fedaBody?.transfer || fedaBody?.data || fedaBody
    const requestId = String(transfer?.id || transfer?.reference || withdrawal.id)
    const requestStatus = transfer?.status || 'requested'

    await admin.from('wallet_withdrawals').update({
      fedapay_request_id: requestId,
      fedapay_request_status: requestStatus,
      status: 'processing',
    }).eq('id', withdrawal.id)
  } catch (err) {
    // FedaPay call failed — mark as pending for admin to process manually
    console.error('[wallet/withdraw] FedaPay error:', err)
    await admin.from('wallet_withdrawals').update({
      admin_note: 'FedaPay API call failed. Needs manual processing.',
    }).eq('id', withdrawal.id)
  }

  return NextResponse.json({
    success: true,
    withdrawal_id: withdrawal.id,
    amount_xof: amount,
    message: `Withdrawal of ${amount.toLocaleString()} XOF submitted. Funds will arrive within 24 hours.`,
  })
}
