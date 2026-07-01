import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY
const PLATFORM_FEE_RATE = 0.05 // 5%

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

// POST /api/escrow/create
// Client creates an escrow for a job. Funds are locked from their wallet immediately.
export async function POST(request) {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, admin } = auth

    let body
    try { body = await request.json() } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { worker_id, amount_xof, description, job_id } = body || {}

    const amount = Number(amount_xof)
    if (!Number.isFinite(amount) || amount < 100) {
        return NextResponse.json({ error: 'Minimum escrow amount is 100 XOF' }, { status: 400 })
    }
    if (!String(worker_id || '').trim()) {
        return NextResponse.json({ error: 'Worker ID is required' }, { status: 400 })
    }
    if (!String(description || '').trim()) {
        return NextResponse.json({ error: 'Job description is required' }, { status: 400 })
    }
    if (worker_id === user.id) {
        return NextResponse.json({ error: 'You cannot create an escrow with yourself' }, { status: 400 })
    }

    // Verify worker exists
    const { data: worker } = await admin
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', worker_id)
        .single()
    if (!worker) return NextResponse.json({ error: 'Worker not found' }, { status: 404 })

    // Check client wallet balance
    const { data: wallet } = await admin
        .from('wallets')
        .select('balance_xof')
        .eq('user_id', user.id)
        .single()

    const balance = Number(wallet?.balance_xof ?? 0)
    if (balance < amount) {
        return NextResponse.json({
            error: `Insufficient wallet balance. Available: ${balance.toLocaleString()} XOF, required: ${amount.toLocaleString()} XOF. Please top up your wallet first.`,
            available: balance,
        }, { status: 400 })
    }

    // Calculate fees
    const platformFee = Math.round(amount * PLATFORM_FEE_RATE)
    const workerReceives = amount - platformFee

    // Atomic: debit wallet + create escrow + write transaction log
    const { error: debitErr } = await admin.rpc('debit_wallet', {
        p_user_id: user.id,
        p_amount_xof: amount,
    })
    if (debitErr) {
        return NextResponse.json({ error: debitErr.message || 'Failed to lock funds' }, { status: 400 })
    }

    const { data: escrow, error: escrowErr } = await admin
        .from('escrow_payments')
        .insert({
            job_id: job_id || null,
            client_id: user.id,
            worker_id,
            amount_xof: amount,
            platform_fee_xof: platformFee,
            worker_receives_xof: workerReceives,
            description: String(description).trim(),
            status: 'locked',
        })
        .select('id, amount_xof, worker_receives_xof, platform_fee_xof, status, created_at, description')
        .single()

    if (escrowErr || !escrow) {
        // Refund wallet if escrow insert failed
        await admin.rpc('credit_wallet', { p_user_id: user.id, p_amount_xof: amount })
        console.error('[escrow/create] insert error:', escrowErr)
        return NextResponse.json({ error: 'Failed to create escrow record' }, { status: 500 })
    }

    // Log the lock in wallet ledger
    await admin.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'escrow_lock',
        amount_xof: amount,
        reference_id: escrow.id,
        description: `Escrow locked for: ${description.trim().slice(0, 80)}`,
    })

    return NextResponse.json({
        success: true,
        escrow,
        worker: { id: worker.id, name: `${worker.first_name} ${worker.last_name}`.trim() },
        message: `${amount.toLocaleString()} XOF locked in escrow. Your worker will be paid ${workerReceives.toLocaleString()} XOF after job completion.`,
    })
}
