const { createClient } = require('@supabase/supabase-js')
const { randomUUID } = require('crypto')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FEDAPAY_API_BASE = process.env.FEDAPAY_API_BASE || (process.env.NODE_ENV === 'production'
    ? 'https://api.fedapay.com/v1'
    : 'https://sandbox-api.fedapay.com/v1')

// ── FedaPay setup ─────────────────────────────────────────────────────────────
let FedaPayLib = null
try {
    FedaPayLib = require('fedapay')
    if (process.env.FEDAPAY_SECRET_KEY) {
        FedaPayLib.FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY)
        FedaPayLib.FedaPay.setEnvironment(process.env.NODE_ENV === 'production' ? 'live' : 'sandbox')
        if (process.env.FEDAPAY_ACCOUNT_ID) {
            FedaPayLib.FedaPay.setAccountId(process.env.FEDAPAY_ACCOUNT_ID)
        }
    }
} catch (e) { console.warn('FedaPay SDK not available:', e.message) }

// ─── CREATE COIN PURCHASE CHECKOUT ────────────────────────────────────────
const createCoinCheckout = async (req, res) => {
    try {
        const userId = req.user.id
        const { purchase_id, coins_amount, price_xof, payment_method, phone_number } = req.body
        const allowedMethods = ['mtn', 'moov', 'orange', 'visa']

        if (!purchase_id || !coins_amount || !price_xof) {
            return res.status(400).json({ error: 'Missing required fields' })
        }
        if (!allowedMethods.includes(payment_method)) {
            return res.status(400).json({ error: 'Unsupported payment method' })
        }

        if (!FedaPayLib || !process.env.FEDAPAY_SECRET_KEY) {
            return res.status(503).json({ error: 'Payment gateway not configured' })
        }

        const { data: purchase, error: purchaseErr } = await supabase
            .from('coin_purchases')
            .select('id, user_id, status, coins_amount, price_xof')
            .eq('id', purchase_id)
            .single()

        if (purchaseErr || !purchase) {
            return res.status(404).json({ error: 'Purchase record not found' })
        }
        if (purchase.user_id !== userId) {
            return res.status(403).json({ error: 'You cannot pay for another user purchase.' })
        }
        if (purchase.status !== 'pending') {
            return res.status(409).json({ error: 'This purchase is no longer pending.' })
        }
        if (Number(purchase.coins_amount) !== Number(coins_amount) || Number(purchase.price_xof) !== Number(price_xof)) {
            return res.status(400).json({ error: 'Purchase amount mismatch. Please retry checkout.' })
        }

        // Get user profile for email
        const { data: userProfile } = await supabase
            .from('users').select('email, first_name, last_name').eq('id', userId).single()

        const backendUrl = process.env.BACKEND_URL || 'https://api.goartisans.online'

        // Create FedaPay transaction
        const tx = await FedaPayLib.Transaction.create({
            description: `GoArtisans - Buy ${coins_amount} Coins`,
            amount: price_xof,
            currency: { iso: 'XOF' },
            callback_url: `${backendUrl}/api/subscriptions/fedapay/coin-webhook`,
            custom_metadata: {
                user_id: userId,
                purchase_id,
                coins_amount: String(coins_amount),
                payment_method,
                session_type: 'coin_purchase'
            },
            customer: {
                firstname: userProfile?.first_name || 'User',
                lastname: userProfile?.last_name || '',
                email: userProfile?.email
            }
        })

        const token = await tx.generateToken()
        const checkoutUrl = token.url || `https://checkout.fedapay.com/pay/${token.token}`

        await supabase
            .from('coin_purchases')
            .update({
                payment_method,
                phone_number: phone_number || null,
            })
            .eq('id', purchase_id)

        return res.json({ success: true, checkout_url: checkoutUrl })
    } catch (err) {
        console.error('createCoinCheckout error:', err)
        res.status(500).json({ error: 'Failed to create checkout' })
    }
}

// ─── FEDAPAY WEBHOOK FOR COIN PURCHASES ───────────────────────────────────
const handleCoinWebhook = async (req, res) => {
    // ── Respond 200 immediately so FedaPay doesn't retry ──────────────────
    res.json({ received: true })

    try {
        const { name: eventType, entity } = req.body || {}

        // Only handle approved transactions
        if (eventType !== 'transaction.approved') return
        if (entity?.status !== 'approved') return

        const meta = entity?.custom_metadata || {}
        const { user_id: userId, purchase_id, coins_amount, session_type } = meta

        // Only process coin purchases
        if (session_type !== 'coin_purchase') return
        if (!userId || !purchase_id || !coins_amount) return

        const coinsToAdd = parseInt(coins_amount, 10)

        // 1. Update purchase status to completed + set completed_at
        const { data: purchase } = await supabase
            .from('coin_purchases')
            .select('id, status')
            .eq('id', purchase_id)
            .single()

        if (!purchase || purchase.status !== 'pending') return

        await supabase.from('coin_purchases').update({
            status: 'completed',
            completed_at: new Date().toISOString()
        }).eq('id', purchase_id)

        // 2. Credit coins atomically via RPC to avoid race conditions with concurrent webhooks
        const { error: rpcError } = await supabase.rpc('increment_user_coins', {
            p_user_id: userId,
            p_amount: coinsToAdd,
        })

        // Fallback: if RPC doesn't exist yet, use a safe upsert approach
        if (rpcError) {
            const { data: existing } = await supabase
                .from('user_coins')
                .select('balance, version')
                .eq('user_id', userId)
                .single()

            if (existing) {
                await supabase.from('user_coins')
                    .update({
                        balance: (existing.balance || 0) + coinsToAdd,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId)
            } else {
                await supabase.from('user_coins').insert({
                    user_id: userId,
                    balance: coinsToAdd
                })
            }
        }

        console.log(`Coin webhook: credited ${coinsToAdd} coins to user ${userId} (purchase ${purchase_id})`)
    } catch (err) {
        console.error('Coin webhook processing error:', err)
    }
}

const submitPayoutRequestToFedaPay = async ({ withdrawalId, userId, payoutXof, paymentMethod, phoneNumber }) => {
    if (!process.env.FEDAPAY_SECRET_KEY) {
        throw new Error('FedaPay secret key is not configured')
    }

    const payload = {
        amount: payoutXof,
        currency: { iso: 'XOF' },
        description: `GoArtisans payout request ${withdrawalId}`,
        metadata: {
            withdrawal_id: withdrawalId,
            user_id: userId,
            payment_method: paymentMethod,
            phone_number: phoneNumber,
            source: 'goartisans_creator_withdrawal'
        },
        destination: {
            type: 'mobile_money',
            operator: paymentMethod,
            number: phoneNumber
        }
    }

    // Prefer official SDK endpoint if available.
    if (FedaPayLib?.Transfer?.create) {
        const transfer = await FedaPayLib.Transfer.create(payload)
        return {
            requestId: String(transfer?.id || transfer?.reference || withdrawalId),
            status: transfer?.status || 'requested',
            raw: transfer,
        }
    }

    // Fallback to direct API call for payout/transfer request creation.
    const response = await fetch(`${FEDAPAY_API_BASE}/transfers`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    let body = null
    try { body = responseText ? JSON.parse(responseText) : {} } catch { body = { raw: responseText } }

    if (!response.ok) {
        const message = body?.message || body?.error || `FedaPay transfer request failed with status ${response.status}`
        throw new Error(message)
    }

    const transfer = body?.transfer || body?.data || body
    return {
        requestId: String(transfer?.id || transfer?.reference || withdrawalId),
        status: transfer?.status || 'requested',
        raw: transfer,
    }
}

// ─── CREATE CREATOR PAYOUT REQUEST ───────────────────────────────────────
const createPayoutRequest = async (req, res) => {
    try {
        const userId = req.user.id
        const { coins_amount, payment_method, phone_number } = req.body || {}
        const allowedMethods = ['mtn', 'moov', 'orange', 'togocel', 'visa']

        const coins = Number(coins_amount)
        if (!Number.isFinite(coins) || coins <= 0) {
            return res.status(400).json({ error: 'Invalid coins amount' })
        }
        if (coins < 5000) {
            return res.status(400).json({ error: 'Minimum withdrawal is 5000 coins' })
        }
        if (!allowedMethods.includes(String(payment_method || '').toLowerCase())) {
            return res.status(400).json({ error: 'Unsupported payout method' })
        }
        if (!String(phone_number || '').trim()) {
            return res.status(400).json({ error: 'Payout phone/account number is required' })
        }

        const normalizedMethod = String(payment_method).toLowerCase()
        const phoneNumber = String(phone_number).trim()

        // Server-side available-balance and partner-eligibility enforcement.
        const [
            { data: gifts },
            { data: existingWithdrawals },
            { data: profile },
            { count: followerCount },
            { data: creatorVideos },
        ] = await Promise.all([
            supabase
                .from('video_gifts')
                .select('gift_cost')
                .eq('recipient_id', userId),
            supabase
                .from('gift_withdrawals')
                .select('coins_amount,status')
                .eq('user_id', userId)
                .in('status', ['pending', 'processing', 'paid']),
            supabase
                .from('users')
                .select('first_name,last_name,phone_number')
                .eq('id', userId)
                .single(),
            supabase
                .from('follows')
                .select('id', { count: 'exact', head: true })
                .eq('following_id', userId)
                .eq('status', 'active'),
            supabase
                .from('videos')
                .select('id,views_count')
                .eq('user_id', userId)
        ])

        const totalReceivedCoins = (gifts || []).reduce((sum, row) => sum + Number(row.gift_cost || 0), 0)
        const totalCommittedCoins = (existingWithdrawals || []).reduce((sum, row) => sum + Number(row.coins_amount || 0), 0)
        const availableCoins = Math.max(0, totalReceivedCoins - totalCommittedCoins)
        const totalViews = (creatorVideos || []).reduce((sum, row) => sum + Number(row.views_count || 0), 0)
        const mediaCount = (creatorVideos || []).length
        const profileName = [profile?.first_name || '', profile?.last_name || ''].join(' ').trim()
        const hasCompleteProfile = Boolean(profileName) && Boolean(String(profile?.phone_number || '').trim())

        if (!hasCompleteProfile) {
            return res.status(400).json({
                error: 'Partner requirement not met: complete your profile with your name and phone number.'
            })
        }

        if ((followerCount || 0) < 50) {
            return res.status(400).json({
                error: `Partner requirement not met: at least 50 followers required. Current: ${followerCount || 0}`
            })
        }

        if (totalViews < 1000) {
            return res.status(400).json({
                error: `Partner requirement not met: at least 1000 total views required. Current: ${totalViews}`
            })
        }

        if (mediaCount < 5) {
            return res.status(400).json({
                error: `Partner requirement not met: publish at least 5 photos/videos. Current: ${mediaCount}`
            })
        }

        if (coins > availableCoins) {
            return res.status(400).json({
                error: `Insufficient withdrawable coins. Available: ${availableCoins}, requested: ${coins}`
            })
        }

        const grossXof = Math.round((coins * 22727) / 5000)
        const platformFeeXof = Math.round(grossXof * 0.20)
        const payoutXof = Math.max(0, grossXof - platformFeeXof)

        // Pre-generate row ID to embed in Fedapay metadata.
        const withdrawalId = randomUUID()

        const fedapay = await submitPayoutRequestToFedaPay({
            withdrawalId,
            userId,
            payoutXof,
            paymentMethod: normalizedMethod,
            phoneNumber,
        })

        const nowIso = new Date().toISOString()
        const insertPayload = {
            id: withdrawalId,
            user_id: userId,
            coins_amount: coins,
            estimated_xof: payoutXof,
            gross_xof: grossXof,
            platform_fee_xof: platformFeeXof,
            payout_xof: payoutXof,
            payment_method: normalizedMethod,
            phone_number: phoneNumber,
            status: 'pending',
            fedapay_request_id: fedapay.requestId,
            fedapay_request_status: fedapay.status,
            fedapay_requested_at: nowIso,
            admin_note: 'Sent to FedaPay for manual payout approval (24-48h).',
        }

        const { data: created, error: insertErr } = await supabase
            .from('gift_withdrawals')
            .insert(insertPayload)
            .select('id,coins_amount,gross_xof,platform_fee_xof,payout_xof,payment_method,phone_number,status,fedapay_request_id,fedapay_request_status,fedapay_requested_at,created_at')
            .single()

        if (insertErr) {
            console.error('createPayoutRequest insert error:', insertErr)
            return res.status(500).json({ error: 'Failed to create payout request record' })
        }

        return res.json({
            success: true,
            message: 'Withdrawal request submitted to FedaPay. Admin approval within 24-48 hours.',
            withdrawal: created,
            available_coins: availableCoins - coins,
        })
    } catch (err) {
        console.error('createPayoutRequest error:', err)
        return res.status(500).json({ error: err.message || 'Failed to submit payout request' })
    }
}

module.exports = {
    createCoinCheckout,
    handleCoinWebhook,
    createPayoutRequest
}
