import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

// POST /api/wallet/webhook — FedaPay calls this after a deposit is approved
export async function POST(request) {
  // Always respond 200 immediately so FedaPay doesn't retry
  const response = NextResponse.json({ received: true })

  try {
    if (!supabaseUrl || !supabaseServiceKey) return response
    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json().catch(() => ({}))
    const { name: eventType, entity } = body || {}

    if (eventType !== 'transaction.approved') return response
    if (entity?.status !== 'approved') return response

    const meta = entity?.custom_metadata || {}
    const { user_id, deposit_id, session_type } = meta

    if (session_type !== 'wallet_deposit') return response
    if (!user_id || !deposit_id) return response

    // Check deposit is still pending (idempotency)
    const { data: deposit } = await admin
      .from('wallet_deposits')
      .select('id, status, amount_xof')
      .eq('id', deposit_id)
      .single()

    if (!deposit || deposit.status !== 'pending') return response

    const amount = Number(deposit.amount_xof)

    // 1. Mark deposit completed
    await admin
      .from('wallet_deposits')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', deposit_id)

    // 2. Credit wallet atomically via RPC
    await admin.rpc('credit_wallet', { p_user_id: user_id, p_amount_xof: amount })

    // 3. Record ledger entry
    await admin.from('wallet_transactions').insert({
      user_id,
      type: 'deposit',
      amount_xof: amount,
      reference_id: deposit_id,
      description: `Wallet top-up: ${amount} XOF`,
    })

    console.log(`[wallet/webhook] Credited ${amount} XOF to user ${user_id}`)
  } catch (err) {
    console.error('[wallet/webhook] Processing error:', err)
  }

  return response
}
