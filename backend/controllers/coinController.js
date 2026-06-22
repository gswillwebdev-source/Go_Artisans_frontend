const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

const USD_TO_XOF = 655

// ─── CREATE COIN PURCHASE CHECKOUT ────────────────────────────────────────
const createCoinCheckout = async (req, res) => {
    try {
        const userId = req.user.id
        const { purchase_id, coins_amount, price_xof, payment_method, phone_number } = req.body

        if (!purchase_id || !coins_amount || !price_xof) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        if (!FedaPayLib || !process.env.FEDAPAY_SECRET_KEY) {
            return res.status(503).json({ error: 'Payment gateway not configured' })
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
            callback_url: `${backendUrl}/api/coins/fedapay/webhook`,
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
        await supabase.from('coin_purchases').update({
            status: 'completed',
            completed_at: new Date().toISOString()
        }).eq('id', purchase_id)

        // 2. Credit coins to user
        const { data: existing } = await supabase
            .from('user_coins')
            .select('balance')
            .eq('user_id', userId)
            .single()

        if (existing) {
            const newBalance = existing.balance + coinsToAdd
            await supabase.from('user_coins')
                .update({ balance: newBalance, updated_at: new Date().toISOString() })
                .eq('user_id', userId)
        } else {
            await supabase.from('user_coins').insert({
                user_id: userId,
                balance: coinsToAdd
            })
        }

        console.log(`Coin webhook: credited ${coinsToAdd} coins to user ${userId} (purchase ${purchase_id})`)
    } catch (err) {
        console.error('Coin webhook processing error:', err)
    }
}

module.exports = {
    createCoinCheckout,
    handleCoinWebhook
}
