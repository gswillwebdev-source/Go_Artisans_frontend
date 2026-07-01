import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY
const FEDAPAY_API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api.fedapay.com/v1'
    : 'https://sandbox-api.fedapay.com/v1'

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

// POST /api/wallet/deposit — create a FedaPay checkout to top up the wallet
export async function POST(request) {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, admin } = auth

    let body
    try { body = await request.json() } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { amount_xof, payment_method, phone_number } = body || {}
    const allowed = ['mtn', 'moov', 'orange', 'togocel', 'visa']

    const amount = Number(amount_xof)
    if (!Number.isFinite(amount) || amount < 500) {
        return NextResponse.json({ error: 'Minimum deposit is 500 XOF' }, { status: 400 })
    }
    if (!allowed.includes(String(payment_method || '').toLowerCase())) {
        return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 })
    }
    if (!String(phone_number || '').trim()) {
        return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Get user profile for FedaPay customer details
    const { data: profile } = await admin
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single()

    // Create deposit record
    const { data: deposit, error: insertErr } = await admin
        .from('wallet_deposits')
        .insert({
            user_id: user.id,
            amount_xof: amount,
            payment_method: String(payment_method).toLowerCase(),
            phone_number: String(phone_number).trim(),
            status: 'pending',
        })
        .select('id')
        .single()

    if (insertErr || !deposit) {
        return NextResponse.json({ error: 'Failed to create deposit record' }, { status: 500 })
    }

    if (!process.env.FEDAPAY_SECRET_KEY) {
        return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 })
    }

    const backendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goartisans.online'

    // Call FedaPay to create a transaction
    try {
        const fedaRes = await fetch(`${FEDAPAY_API_BASE}/transactions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: `GoArtisans wallet deposit – ${amount} XOF`,
                amount,
                currency: { iso: 'XOF' },
                callback_url: `${backendUrl}/api/wallet/webhook`,
                custom_metadata: {
                    user_id: user.id,
                    deposit_id: deposit.id,
                    session_type: 'wallet_deposit',
                },
                customer: {
                    firstname: profile?.first_name || 'User',
                    lastname: profile?.last_name || '',
                    email: profile?.email || user.email,
                },
            }),
        })

        const fedaBody = await fedaRes.json().catch(() => ({}))
        if (!fedaRes.ok) {
            const msg = fedaBody?.message || `FedaPay error ${fedaRes.status}`
            return NextResponse.json({ error: msg }, { status: 502 })
        }

        const tx = fedaBody?.v1?.transaction || fedaBody?.transaction || fedaBody
        const txId = tx?.id

        // Generate payment token/URL
        const tokenRes = await fetch(`${FEDAPAY_API_BASE}/transactions/${txId}/token`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}` },
        })
        const tokenBody = await tokenRes.json().catch(() => ({}))
        const checkoutUrl = tokenBody?.url || tokenBody?.token?.url
            || `https://checkout.fedapay.com/pay/${tokenBody?.token}`

        // Store FedaPay tx id on deposit record
        await admin
            .from('wallet_deposits')
            .update({ fedapay_tx_id: String(txId || '') })
            .eq('id', deposit.id)

        return NextResponse.json({ success: true, checkout_url: checkoutUrl, deposit_id: deposit.id })
    } catch (err) {
        console.error('[wallet/deposit]', err)
        return NextResponse.json({ error: 'Failed to create payment checkout' }, { status: 500 })
    }
}
