import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

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

// POST /api/wallet/send
// Transfer money from sender's wallet to recipient's wallet (P2P)
export async function POST(request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, admin } = auth

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { recipient_id, amount_xof, note } = body || {}
  const amount = Number(amount_xof)

  if (!String(recipient_id || '').trim()) {
    return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: 'Minimum transfer amount is 100 XOF' }, { status: 400 })
  }
  if (recipient_id === user.id) {
    return NextResponse.json({ error: 'You cannot send money to yourself' }, { status: 400 })
  }

  // Verify recipient exists
  const { data: recipient } = await admin
    .from('users')
    .select('id, first_name, last_name')
    .eq('id', recipient_id)
    .single()

  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  }

  // Perform atomic transfer via database function
  const { data: transferId, error: transferErr } = await admin.rpc('transfer_wallet', {
    p_sender_id: user.id,
    p_recipient_id: recipient_id,
    p_amount_xof: amount,
    p_note: String(note || '').trim().slice(0, 200) || null,
  })

  if (transferErr) {
    return NextResponse.json({
      error: transferErr.message?.includes('Insufficient')
        ? transferErr.message
        : 'Transfer failed. Please try again.',
    }, { status: 400 })
  }

  // Write ledger entries for both parties
  await Promise.all([
    admin.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'send',
      amount_xof: amount,
      reference_id: transferId,
      description: `Sent to ${recipient.first_name} ${recipient.last_name}${note ? `: ${note}` : ''}`.trim(),
    }),
    admin.from('wallet_transactions').insert({
      user_id: recipient_id,
      type: 'receive',
      amount_xof: amount,
      reference_id: transferId,
      description: `Received from ${user.email || 'a user'}${note ? `: ${note}` : ''}`.trim(),
    }),
  ])

  return NextResponse.json({
    success: true,
    transfer_id: transferId,
    recipient_name: `${recipient.first_name} ${recipient.last_name}`.trim(),
    amount_xof: amount,
    message: `${amount.toLocaleString()} XOF sent to ${recipient.first_name} ${recipient.last_name}.`,
  })
}
