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

// DELETE /api/escrow/[id]/cancel
// Client can cancel the escrow only while status is 'locked' (worker hasn't started yet).
// Funds are refunded to the client's wallet.
export async function DELETE(request, { params }) {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, admin } = auth

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Escrow ID required' }, { status: 400 })

    const { data: escrow, error: fetchErr } = await admin
        .from('escrow_payments')
        .select('id, client_id, amount_xof, status')
        .eq('id', id)
        .single()

    if (fetchErr || !escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })

    if (user.id !== escrow.client_id) {
        return NextResponse.json({ error: 'Only the client can cancel the escrow' }, { status: 403 })
    }

    if (escrow.status !== 'locked') {
        return NextResponse.json({
            error: `Cannot cancel escrow with status "${escrow.status}". Once the worker has confirmed work, please use the dispute option.`,
        }, { status: 400 })
    }

    const amount = Number(escrow.amount_xof)

    // 1. Refund to client wallet
    await admin.rpc('credit_wallet', { p_user_id: user.id, p_amount_xof: amount })

    // 2. Mark escrow cancelled
    const { data: updated } = await admin
        .from('escrow_payments')
        .update({ status: 'refunded' })
        .eq('id', id)
        .select('id, status')
        .single()

    // 3. Log refund in ledger
    await admin.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'escrow_refund',
        amount_xof: amount,
        reference_id: id,
        description: 'Escrow cancelled – funds returned to wallet',
    })

    return NextResponse.json({
        success: true,
        escrow: updated,
        message: `${amount.toLocaleString()} XOF has been refunded to your wallet.`,
    })
}
