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

// 1 USD ≈ 655 XOF (West African CFA franc)
const USD_TO_XOF = 655

// ─── GET ALL PLANS ───────────────────────────────────────────────────────────
const getPlans = async (req, res) => {
    try {
        const { role } = req.query  // 'worker' | 'client' | undefined (returns all)

        let query = supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order')

        if (role && ['worker', 'client'].includes(role)) {
            query = query.in('target_role', [role, 'both'])
        }

        const { data, error } = await query
        if (error) throw error

        res.json({ plans: data })
    } catch (err) {
        console.error('getPlans error:', err)
        res.status(500).json({ error: 'Failed to fetch plans' })
    }
}

// ─── GET CURRENT USER SUBSCRIPTION ──────────────────────────────────────────
const getUserSubscription = async (req, res) => {
    try {
        const userId = req.user.id

        const { data, error } = await supabase.rpc('get_user_subscription', {
            p_user_id: userId
        })

        if (error) throw error

        // Also check verification badge
        const { data: badge } = await supabase
            .from('verification_badges')
            .select('status, badge_type, verified_fields, submitted_at, reviewed_at')
            .eq('user_id', userId)
            .single()

        // Get monthly usage
        const [appUsage, msgUsage, postUsage] = await Promise.all([
            supabase.rpc('get_monthly_usage', { p_user_id: userId, p_usage_type: 'job_application' }),
            supabase.rpc('get_monthly_usage', { p_user_id: userId, p_usage_type: 'direct_message' }),
            supabase.rpc('get_monthly_usage', { p_user_id: userId, p_usage_type: 'job_post' })
        ])

        res.json({
            subscription: data?.[0] || null,
            badge: badge || null,
            usage: {
                job_applications: appUsage.data || 0,
                direct_messages: msgUsage.data || 0,
                job_posts: postUsage.data || 0
            }
        })
    } catch (err) {
        console.error('getUserSubscription error:', err)
        res.status(500).json({ error: 'Failed to fetch subscription' })
    }
}

// ─── START FREE TRIAL ────────────────────────────────────────────────────────
const startFreeTrial = async (req, res) => {
    try {
        const userId = req.user.id
        const { plan_id } = req.body   // e.g. 'worker_pro' or 'client_pro'

        if (!plan_id) {
            return res.status(400).json({ error: 'plan_id is required' })
        }

        // Validate plan exists and has a trial
        const { data: plan, error: planErr } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', plan_id)
            .eq('is_active', true)
            .single()

        if (planErr || !plan) {
            return res.status(404).json({ error: 'Plan not found' })
        }

        if (plan.trial_days <= 0) {
            return res.status(400).json({ error: 'This plan does not offer a free trial' })
        }

        // Extract tier from plan_id (e.g. 'worker_pro' → 'pro')
        const planTier = plan_id.split('_')[1]

        // Check if user already used this trial
        const { data: hasUsed } = await supabase.rpc('has_used_trial', {
            p_user_id: userId,
            p_plan_tier: planTier
        })

        if (hasUsed) {
            return res.status(409).json({
                error: 'You have already used your free trial for this plan tier'
            })
        }

        // Check for existing active subscription
        const { data: existingSub } = await supabase
            .from('user_subscriptions')
            .select('id, status, plan_id')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing'])
            .single()

        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + plan.trial_days)
        const now = new Date()

        // Cancel existing free sub / update
        if (existingSub) {
            const { error: updateErr } = await supabase
                .from('user_subscriptions')
                .update({
                    plan_id,
                    status: 'trialing',
                    trial_start: now.toISOString(),
                    trial_end: trialEnd.toISOString(),
                    current_period_start: now.toISOString(),
                    current_period_end: trialEnd.toISOString(),
                    updated_at: now.toISOString()
                })
                .eq('id', existingSub.id)

            if (updateErr) throw updateErr
        } else {
            const { error: insertErr } = await supabase
                .from('user_subscriptions')
                .insert({
                    user_id: userId,
                    plan_id,
                    status: 'trialing',
                    billing_cycle: 'monthly',
                    trial_start: now.toISOString(),
                    trial_end: trialEnd.toISOString(),
                    current_period_start: now.toISOString(),
                    current_period_end: trialEnd.toISOString()
                })

            if (insertErr) throw insertErr
        }

        // Record trial usage
        await supabase
            .from('subscription_trials')
            .insert({ user_id: userId, plan_tier: planTier })
            .on('conflict', () => { })  // ignore duplicates

        res.json({
            success: true,
            message: `${plan.trial_days}-day free trial started for ${plan.name}`,
            trial_end: trialEnd.toISOString()
        })
    } catch (err) {
        console.error('startFreeTrial error:', err)
        res.status(500).json({ error: 'Failed to start trial' })
    }
}

// ─── START TRIAL CHECKOUT (FedaPay — activates trial immediately) ─────────────
// ─── START TRIAL CHECKOUT ─────────────────────────────────────────────────────
// User MUST verify their card via FedaPay ($1 charged + immediately refunded).
// The 14-day trial only activates on successful webhook from FedaPay.
// At day 14 a cron job sends them a billing email with a FedaPay checkout link.
const startTrialCheckout = async (req, res) => {
    try {
        const userId = req.user.id
        const { plan_id, billing_cycle = 'monthly' } = req.body

        if (!plan_id) return res.status(400).json({ error: 'plan_id is required' })

        if (!FedaPayLib || !process.env.FEDAPAY_SECRET_KEY) {
            return res.status(503).json({ error: 'Payment gateway not configured. Please contact support.' })
        }

        const { data: plan, error: planErr } = await supabase
            .from('subscription_plans').select('*').eq('id', plan_id).eq('is_active', true).single()

        if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' })
        if (!plan.trial_days || plan.trial_days <= 0) {
            return res.status(400).json({ error: 'This plan does not offer a free trial' })
        }

        const planTier = plan_id.split('_')[1]
        const { data: hasUsed } = await supabase.rpc('has_used_trial', { p_user_id: userId, p_plan_tier: planTier })
        if (hasUsed) {
            return res.status(409).json({ error: 'You have already used your free trial for this plan tier' })
        }

        const { data: userProfile } = await supabase
            .from('users').select('email, first_name, last_name').eq('id', userId).single()

        const backendUrl = process.env.BACKEND_URL || 'https://api.goartisans.online'

        // Charge $1 (655 XOF) to verify the card is valid and active.
        // This is refunded on webhook success. The real subscription billing starts on day 14.
        const tx = await FedaPayLib.Transaction.create({
            description: `GoArtisans Card Verification — ${plan.name} Free Trial`,
            amount: USD_TO_XOF,   // $1
            currency: { iso: 'XOF' },
            callback_url: `${backendUrl}/api/subscriptions/fedapay/webhook`,
            custom_metadata: {
                user_id: userId,
                plan_id,
                billing_cycle,
                session_type: 'trial_activate',
                trial_days: String(plan.trial_days)
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
        console.error('startTrialCheckout error:', err)
        res.status(500).json({ error: 'Failed to start trial checkout' })
    }
}

// ─── PROCESS EXPIRED TRIALS (called by Vercel cron) ──────────────────────────
// 1. Find trials that have expired → send billing email + FedaPay checkout link + set payment_due
// 2. Find payment_due subs older than 3 days → disable subscription (set inactive)
const chargeExpiredTrials = async (req, res) => {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const now = new Date()
    const gracePeriodCutoff = new Date(now)
    gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - 3)

    let activated = 0
    let disabled = 0
    const errors = []

    try {
        // ── Step 1: disable subscriptions that are payment_due for > 3 days ──
        const { data: pastDue } = await supabase
            .from('user_subscriptions')
            .select('id, user_id, plan_id')
            .eq('status', 'payment_due')
            .lte('updated_at', gracePeriodCutoff.toISOString())

        if (pastDue?.length) {
            const ids = pastDue.map(s => s.id)
            await supabase.from('user_subscriptions')
                .update({ status: 'inactive', updated_at: now.toISOString() })
                .in('id', ids)
            disabled = ids.length
            console.log(`Cron: disabled ${disabled} past_due subscriptions`)
        }

        // ── Step 2: find newly expired trials → send billing email + set payment_due ──
        const { data: expiredTrials } = await supabase
            .from('user_subscriptions')
            .select(`
                id, plan_id, billing_cycle, user_id,
                user:user_id (id, email, first_name, last_name)
            `)
            .eq('status', 'trialing')
            .lte('trial_end', now.toISOString())

        if (!expiredTrials?.length) {
            return res.json({ success: true, activated, disabled, message: 'No expired trials found.' })
        }

        const backendUrl = process.env.BACKEND_URL || 'https://api.goartisans.online'

        for (const sub of expiredTrials) {
            try {
                const { data: plan } = await supabase
                    .from('subscription_plans')
                    .select('name, price_monthly, price_yearly')
                    .eq('id', sub.plan_id)
                    .single()

                const amount = sub.billing_cycle === 'yearly'
                    ? (plan?.price_yearly || 0)
                    : (plan?.price_monthly || 0)
                const amountXof = Math.round(amount * USD_TO_XOF)
                const user = sub.user

                let checkoutUrl = null

                // Attempt to create a FedaPay checkout link for the subscription charge
                if (FedaPayLib && process.env.FEDAPAY_SECRET_KEY && amountXof > 0) {
                    try {
                        const tx = await FedaPayLib.Transaction.create({
                            description: `GoArtisans ${plan?.name} Plan — Trial Ended (${sub.billing_cycle})`,
                            amount: amountXof,
                            currency: { iso: 'XOF' },
                            callback_url: `${backendUrl}/api/subscriptions/fedapay/webhook`,
                            custom_metadata: {
                                user_id: sub.user_id,
                                plan_id: sub.plan_id,
                                billing_cycle: sub.billing_cycle,
                                session_type: 'subscribe',
                                amount_usd: String(amount)
                            },
                            customer: {
                                firstname: user?.first_name || 'User',
                                lastname: user?.last_name || '',
                                email: user?.email
                            }
                        })
                        const token = await tx.generateToken()
                        checkoutUrl = token.url || `https://checkout.fedapay.com/pay/${token.token}`
                    } catch (txErr) {
                        console.error(`Cron: FedaPay checkout failed for user ${sub.user_id}:`, txErr.message)
                    }
                }

                // Mark subscription as payment_due (3-day grace period)
                await supabase.from('user_subscriptions')
                    .update({ status: 'payment_due', updated_at: now.toISOString() })
                    .eq('id', sub.id)

                // Send billing email
                if (user?.email) {
                    await sendTrialEndBillingEmail(
                        user.email,
                        user.first_name || 'there',
                        plan?.name || sub.plan_id,
                        amount,
                        checkoutUrl
                    )
                }

                activated++
            } catch (subErr) {
                console.error(`Cron: error processing trial for sub ${sub.id}:`, subErr.message)
                errors.push(sub.id)
            }
        }

        res.json({ success: true, processed: activated, disabled, errors })
    } catch (err) {
        console.error('chargeExpiredTrials error:', err)
        res.status(500).json({ error: err.message })
    }
}

// ─── SEND TRIAL-END BILLING EMAIL ────────────────────────────────────────────
const sendTrialEndBillingEmail = async (email, firstName, planName, amountUsd, checkoutUrl) => {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
    })

    const payBtn = checkoutUrl
        ? `<div style="text-align:center;margin:30px 0;">
               <a href="${checkoutUrl}"
                  style="background:#1e3a8a;color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:16px;">
                  Pay $${amountUsd} Now
               </a>
           </div>
           <p style="color:#6b7280;text-align:center;font-size:13px;">This link expires in 24 hours. You can also renew from your <a href="${process.env.APP_URL || 'https://goartisans.online'}/subscription">subscription page</a>.</p>`
        : `<div style="text-align:center;margin:30px 0;">
               <a href="${process.env.APP_URL || 'https://goartisans.online'}/pricing"
                  style="background:#1e3a8a;color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:16px;">
                  Renew Subscription
               </a>
           </div>`

    await transporter.sendMail({
        from: `"GoArtisans" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Your GoArtisans Free Trial Has Ended — Activate Your ${planName} Plan`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#1e3a8a;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                    <h1 style="color:white;margin:0;font-size:24px;">GoArtisans</h1>
                </div>
                <div style="padding:30px;background:#f9fafb;border-radius:0 0 8px 8px;">
                    <h2 style="color:#1f2937;">Hi ${firstName}, your free trial has ended 👋</h2>
                    <p style="color:#6b7280;">Your <strong>${planName}</strong> free trial has expired. To keep your premium access, please complete your subscription payment of <strong>$${amountUsd}</strong>.</p>
                    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0;">
                        <p style="color:#92400e;margin:0;font-weight:bold;">⚠️ Your subscription access will be disabled in <strong>3 days</strong> if payment is not received.</p>
                    </div>
                    ${payBtn}
                    <p style="color:#6b7280;font-size:14px;">Need help? Contact us at <a href="mailto:support@goartisans.online">support@goartisans.online</a> or <a href="https://wa.me/22893495719">WhatsApp</a>.</p>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                    <p style="color:#9ca3af;font-size:12px;">GoArtisans Team — Thank you for using our platform.</p>
                </div>
            </div>
        `
    })
}

// ─── SUBSCRIBE (FedaPay — mobile money or international card) ────────────────
const createSubscription = async (req, res) => {
    try {
        const userId = req.user.id
        const { plan_id, billing_cycle = 'monthly' } = req.body

        if (!plan_id) return res.status(400).json({ error: 'plan_id is required' })

        const { data: plan, error: planErr } = await supabase
            .from('subscription_plans').select('*').eq('id', plan_id).eq('is_active', true).single()
        if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' })

        // Free plan — activate directly
        if (plan.price_monthly === 0) {
            const now = new Date()
            const periodEnd = new Date(); periodEnd.setFullYear(periodEnd.getFullYear() + 100)
            const { error: upsertErr } = await supabase.from('user_subscriptions').upsert({
                user_id: userId, plan_id, status: 'active', billing_cycle,
                current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(), updated_at: now.toISOString()
            }, { onConflict: 'user_id,status' })
            if (upsertErr) throw upsertErr
            return res.json({ success: true, requires_payment: false, plan })
        }

        if (!FedaPayLib || !process.env.FEDAPAY_SECRET_KEY) {
            return res.status(503).json({ error: 'Payment gateway not configured. Please contact support.' })
        }

        const { data: userProfile } = await supabase
            .from('users').select('email, first_name, last_name').eq('id', userId).single()
        const amount = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly
        const amountXof = Math.round(amount * USD_TO_XOF)
        const backendUrl = process.env.BACKEND_URL || 'https://api.goartisans.online'

        const tx = await FedaPayLib.Transaction.create({
            description: `GoArtisans ${plan.name} Plan (${billing_cycle})`,
            amount: amountXof,
            currency: { iso: 'XOF' },
            callback_url: `${backendUrl}/api/subscriptions/fedapay/webhook`,
            custom_metadata: { user_id: userId, plan_id, billing_cycle, session_type: 'subscribe', amount_usd: String(amount) },
            customer: { firstname: userProfile?.first_name || 'User', lastname: userProfile?.last_name || '', email: userProfile?.email }
        })
        const token = await tx.generateToken()
        const checkoutUrl = token.url || `https://checkout.fedapay.com/pay/${token.token}`
        return res.json({ success: true, requires_payment: true, checkout_url: checkoutUrl })
    } catch (err) {
        console.error('createSubscription error:', err)
        res.status(500).json({ error: 'Failed to create subscription' })
    }
}

// ─── FEDAPAY WEBHOOK ──────────────────────────────────────────────────────────
const handleFedaPayWebhook = async (req, res) => {
    // ── Respond 200 immediately so FedaPay never retries due to timeout ──────
    // Processing happens asynchronously after the response is sent.
    res.json({ received: true })

    try {
        const { name: eventType, entity } = req.body || {}

        // Only handle approved transactions
        if (eventType !== 'transaction.approved') return
        // Trust the entity.status from the signed webhook payload — no extra API call needed
        if (entity?.status !== 'approved') return

        const meta = entity?.custom_metadata || {}
        const { user_id: userId, plan_id, billing_cycle = 'monthly', session_type, amount_usd } = meta
        if (!userId || !plan_id) return

        const now = new Date()
        const periodEnd = new Date()
        billing_cycle === 'yearly'
            ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
            : periodEnd.setMonth(periodEnd.getMonth() + 1)

        // ── verify_and_subscribe: refund $1 (fire & forget), then activate plan ──
        if (session_type === 'verify_and_subscribe') {
            // Refund asynchronously — don't block activation if refund fails
            if (FedaPayLib && entity?.id) {
                FedaPayLib.Transaction.retrieve(entity.id)
                    .then(tx => typeof tx.refund === 'function' ? tx.refund() : null)
                    .then(() => console.log(`FedaPay webhook: refunded $1 for user ${userId}, tx ${entity.id}`))
                    .catch(err => console.error(`FedaPay webhook: refund failed for tx ${entity.id}:`, err.message))
            }

            await supabase.from('user_subscriptions').upsert({
                user_id: userId, plan_id, status: 'active', billing_cycle,
                current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
                payment_provider: 'fedapay_verified', payment_provider_subscription_id: String(entity?.id || ''),
                amount_paid: 0, currency: 'XOF',
                cancelled_at: null, cancel_at_period_end: false, updated_at: now.toISOString()
            }, { onConflict: 'user_id' })
            console.log(`FedaPay webhook: verify_and_subscribe — activated ${plan_id} for user ${userId}`)
            return
        }

        // ── trial_activate: refund $1 (fire & forget), then start trial ──────
        if (session_type === 'trial_activate') {
            const trialDays = parseInt(meta.trial_days || '14', 10)

            // Refund asynchronously — don't block trial activation if refund fails
            if (FedaPayLib && entity?.id) {
                FedaPayLib.Transaction.retrieve(entity.id)
                    .then(tx => typeof tx.refund === 'function' ? tx.refund() : null)
                    .then(() => console.log(`FedaPay webhook: refunded $1 trial for user ${userId}, tx ${entity.id}`))
                    .catch(err => console.error(`FedaPay webhook: trial refund failed for tx ${entity.id}:`, err.message))
            }

            const planTier = plan_id.split('_')[1]
            const trialEnd = new Date()
            trialEnd.setDate(trialEnd.getDate() + trialDays)

            await supabase.from('user_subscriptions').upsert({
                user_id: userId, plan_id, status: 'trialing', billing_cycle,
                trial_start: now.toISOString(), trial_end: trialEnd.toISOString(),
                current_period_start: now.toISOString(), current_period_end: trialEnd.toISOString(),
                payment_provider: 'fedapay_trial', payment_provider_subscription_id: String(entity?.id || ''),
                amount_paid: 0, currency: 'XOF',
                cancelled_at: null, cancel_at_period_end: false, updated_at: now.toISOString()
            }, { onConflict: 'user_id' })

            await supabase.from('subscription_trials')
                .upsert({ user_id: userId, plan_tier: planTier }, { onConflict: 'user_id,plan_tier' })

            console.log(`FedaPay webhook: trial_activate — ${trialDays}-day trial for ${plan_id}, user ${userId}`)
            return
        }

        // ── Standard subscription activation ─────────────────────────────────
        await supabase.from('user_subscriptions').upsert({
            user_id: userId, plan_id, status: 'active', billing_cycle,
            current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
            payment_provider: 'fedapay', payment_provider_subscription_id: String(entity?.id || ''),
            amount_paid: parseFloat(amount_usd || '0'), currency: 'XOF',
            cancelled_at: null, cancel_at_period_end: false, updated_at: now.toISOString()
        }, { onConflict: 'user_id' })

        console.log(`FedaPay webhook: activated ${plan_id} for user ${userId}`)
    } catch (err) {
        console.error('FedaPay webhook processing error:', err)
    }
}

// PayPal removed — FedaPay webhook activates subscriptions automatically

// ─── SEND PAYMENT FAILED EMAIL ────────────────────────────────────────────────
const sendPaymentFailedEmail = async (email, firstName, amountDue) => {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
    })
    await transporter.sendMail({
        from: `"GoArtisans" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Action Required: Payment Failed — GoArtisans Subscription',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#1e3a8a;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                    <h1 style="color:white;margin:0;">GoArtisans</h1>
                </div>
                <div style="padding:30px;background:#f9fafb;border-radius:0 0 8px 8px;">
                    <h2 style="color:#1f2937;">Hi ${firstName}, your payment failed</h2>
                    <p style="color:#6b7280;">We were unable to process your subscription payment of <strong>$${amountDue}</strong>.</p>
                    <p style="color:#6b7280;">Please renew your subscription to avoid losing access.</p>
                    <p style="color:#ef4444;font-weight:bold;">If payment is not received, your subscription will be disabled.</p>
                    <div style="text-align:center;margin:30px 0;">
                        <a href="${process.env.APP_URL || 'https://goartisans.online'}/pricing"
                           style="background:#1e3a8a;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                            Renew Subscription
                        </a>
                    </div>
                    <p style="color:#6b7280;font-size:14px;">Need help? Contact us at <a href="mailto:support@goartisans.online">support@goartisans.online</a></p>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                    <p style="color:#9ca3af;font-size:12px;">GoArtisans Team</p>
                </div>
            </div>
        `
    })
}

// ─── CANCEL SUBSCRIPTION ─────────────────────────────────────────────────────
const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id

        const { data: sub, error: subErr } = await supabase
            .from('user_subscriptions')
            .select('id, plan_id, status')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing'])
            .single()

        if (subErr || !sub) {
            return res.status(404).json({ error: 'No active subscription found' })
        }

        const planTier = sub.plan_id.split('_')[1]
        if (planTier === 'free') {
            return res.status(400).json({ error: 'Cannot cancel a free plan' })
        }

        const { error: updateErr } = await supabase
            .from('user_subscriptions')
            .update({
                cancel_at_period_end: true,
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', sub.id)

        if (updateErr) throw updateErr

        res.json({
            success: true,
            message: 'Subscription will be cancelled at the end of the current period'
        })
    } catch (err) {
        console.error('cancelSubscription error:', err)
        res.status(500).json({ error: 'Failed to cancel subscription' })
    }
}

// ─── VERIFICATION BADGE ──────────────────────────────────────────────────────
const requestVerificationBadge = async (req, res) => {
    try {
        const userId = req.user.id
        const { badge_type = 'identity', verified_fields = ['email'] } = req.body

        // Check if already submitted
        const { data: existing } = await supabase
            .from('verification_badges')
            .select('id, status')
            .eq('user_id', userId)
            .single()

        if (existing) {
            if (existing.status === 'approved') {
                return res.status(409).json({ error: 'Your account is already verified' })
            }
            if (existing.status === 'pending') {
                return res.status(409).json({ error: 'Verification request already pending review' })
            }
            // Re-submit if rejected
            const { error: updateErr } = await supabase
                .from('verification_badges')
                .update({
                    status: 'pending',
                    badge_type,
                    verified_fields,
                    submitted_at: new Date().toISOString(),
                    reviewed_at: null,
                    rejection_reason: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)

            if (updateErr) throw updateErr
        } else {
            const { error: insertErr } = await supabase
                .from('verification_badges')
                .insert({
                    user_id: userId,
                    status: 'pending',
                    badge_type,
                    verified_fields
                })

            if (insertErr) throw insertErr
        }

        res.json({
            success: true,
            message: 'Verification request submitted. Our team will review it within 1-3 business days.'
        })
    } catch (err) {
        console.error('requestVerificationBadge error:', err)
        res.status(500).json({ error: 'Failed to submit verification request' })
    }
}

// ─── WHO VIEWED MY PROFILE ───────────────────────────────────────────────────
const getProfileViewers = async (req, res) => {
    try {
        const userId = req.user.id

        // Check if user has Pro or Premium
        const { data: sub } = await supabase.rpc('get_user_subscription', {
            p_user_id: userId
        })

        const activeSub = sub?.[0]
        if (!activeSub || activeSub.badge_color === 'none') {
            return res.status(403).json({
                error: 'Upgrade to Pro or Premium to see who viewed your profile',
                upgrade_required: true
            })
        }

        const lookbackDays = activeSub.limits?.who_viewed_days || 30
        const since = new Date()
        since.setDate(since.getDate() - lookbackDays)

        const { data: viewers, error } = await supabase
            .from('profile_views')
            .select(`
                viewed_at,
                viewer:viewer_id (
                    id, first_name, last_name, job_title, profile_picture, user_type
                )
            `)
            .eq('viewed_id', userId)
            .gte('viewed_at', since.toISOString())
            .order('viewed_at', { ascending: false })
            .limit(50)

        if (error) throw error

        res.json({ viewers: viewers || [], lookback_days: lookbackDays })
    } catch (err) {
        console.error('getProfileViewers error:', err)
        res.status(500).json({ error: 'Failed to fetch profile viewers' })
    }
}

// ─── TRACK PROFILE VIEW ──────────────────────────────────────────────────────
const trackProfileView = async (req, res) => {
    try {
        const viewerId = req.user.id
        const { viewed_id } = req.body

        if (!viewed_id) return res.status(400).json({ error: 'viewed_id is required' })
        if (viewerId === viewed_id) return res.json({ success: true })  // don't track self-views

        // Insert or ignore if already viewed today (handled by unique index on DB side)
        const { error } = await supabase
            .from('profile_views')
            .insert({
                viewer_id: viewerId,
                viewed_id,
                view_date: new Date().toISOString().slice(0, 10),  // 'YYYY-MM-DD'
                viewed_at: new Date().toISOString()
            })

        // Also track usage
        await supabase
            .from('subscription_usage')
            .insert({ user_id: viewerId, usage_type: 'profile_view', metadata: { viewed_id } })

        if (error && error.code !== '23505') throw error  // ignore unique constraint
        res.json({ success: true })
    } catch (err) {
        console.error('trackProfileView error:', err)
        res.status(500).json({ error: 'Failed to track view' })
    }
}

// ─── ADMIN: REVIEW VERIFICATION ──────────────────────────────────────────────
const adminReviewBadge = async (req, res) => {
    try {
        const { badge_id, action, rejection_reason } = req.body
        // action: 'approve' | 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'action must be approve or reject' })
        }

        const { error } = await supabase
            .from('verification_badges')
            .update({
                status: action === 'approve' ? 'approved' : 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: req.user.id,
                rejection_reason: action === 'reject' ? rejection_reason : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', badge_id)

        if (error) throw error

        res.json({ success: true, message: `Badge ${action}d successfully` })
    } catch (err) {
        console.error('adminReviewBadge error:', err)
        res.status(500).json({ error: 'Failed to review badge' })
    }
}

// ─── ADMIN: LIST PENDING BADGES ───────────────────────────────────────────────
const adminListPendingBadges = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('verification_badges')
            .select(`
                *,
                user:user_id (id, first_name, last_name, email, user_type)
            `)
            .eq('status', 'pending')
            .order('submitted_at', { ascending: true })

        if (error) throw error

        res.json({ badges: data || [] })
    } catch (err) {
        console.error('adminListPendingBadges error:', err)
        res.status(500).json({ error: 'Failed to fetch pending badges' })
    }
}

// ─── REQUEST SUBSCRIPTION VIA WHATSAPP ───────────────────────────────────────
// Records a pending_whatsapp subscription so admin can activate it manually.
const requestWhatsappSubscription = async (req, res) => {
    try {
        const userId = req.user.id
        const { plan_id, billing_cycle = 'monthly' } = req.body

        if (!plan_id) return res.status(400).json({ error: 'plan_id is required' })

        const { data: plan, error: planErr } = await supabase
            .from('subscription_plans')
            .select('id, name, price_monthly, price_yearly')
            .eq('id', plan_id)
            .eq('is_active', true)
            .single()

        if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' })

        const now = new Date()

        // Upsert a pending_whatsapp row so admin can see it
        const { error: upsertErr } = await supabase
            .from('user_subscriptions')
            .upsert({
                user_id: userId,
                plan_id,
                status: 'pending_whatsapp',
                billing_cycle,
                current_period_start: now.toISOString(),
                current_period_end: now.toISOString(), // placeholder — admin sets real end when activating
                payment_provider: 'whatsapp',
                updated_at: now.toISOString()
            }, { onConflict: 'user_id' })

        if (upsertErr) throw upsertErr

        res.json({ success: true, message: 'Request recorded. Admin will activate your plan after payment confirmation.' })
    } catch (err) {
        console.error('requestWhatsappSubscription error:', err)
        res.status(500).json({ error: 'Failed to record subscription request' })
    }
}

// ─── $1 VERIFY & SUBSCRIBE (FedaPay card/mobile) ─────────────────────────────
// Creates a $1 FedaPay transaction. On webhook approval, refunds $1 and activates the plan.
const verifyAndSubscribe = async (req, res) => {
    try {
        const userId = req.user.id
        const { plan_id, billing_cycle = 'monthly' } = req.body

        if (!plan_id) return res.status(400).json({ error: 'plan_id is required' })

        if (!FedaPayLib) {
            return res.status(503).json({ error: 'Payment gateway not configured' })
        }

        const { data: plan, error: planErr } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', plan_id)
            .eq('is_active', true)
            .single()

        if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' })

        const { data: userProfile } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', userId)
            .single()

        const backendUrl = process.env.BACKEND_URL || 'https://api.goartisans.online'

        // Charge exactly $1 (655 XOF) for verification — the plan activates on webhook
        const tx = await FedaPayLib.Transaction.create({
            description: `GoArtisans Account Verification — ${plan.name} Plan`,
            amount: USD_TO_XOF,              // $1 in XOF
            currency: { iso: 'XOF' },
            callback_url: `${backendUrl}/api/subscriptions/fedapay/webhook`,
            custom_metadata: {
                user_id: userId,
                plan_id,
                billing_cycle,
                session_type: 'verify_and_subscribe',  // webhook will refund + activate
                amount_usd: '1'
            },
            customer: {
                firstname: userProfile?.first_name || 'User',
                lastname: userProfile?.last_name || '',
                email: userProfile?.email
            }
        })

        const token = await tx.generateToken()
        const checkoutUrl = token.url || `https://checkout.fedapay.com/pay/${token.token}`

        res.json({ success: true, checkout_url: checkoutUrl })
    } catch (err) {
        console.error('verifyAndSubscribe error:', err)
        res.status(500).json({ error: 'Failed to create verification payment' })
    }
}

// ─── ADMIN: MANUALLY ACTIVATE SUBSCRIPTION ───────────────────────────────────
const adminActivateSubscription = async (req, res) => {
    try {
        // Verify requester is admin
        const { data: adminProfile } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', req.user.id)
            .single()

        if (adminProfile?.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' })
        }

        const { user_id, plan_id, billing_cycle = 'monthly', notes } = req.body

        if (!user_id || !plan_id) {
            return res.status(400).json({ error: 'user_id and plan_id are required' })
        }

        // Validate the plan exists
        const { data: plan, error: planErr } = await supabase
            .from('subscription_plans')
            .select('id, name, price_monthly, price_yearly')
            .eq('id', plan_id)
            .eq('is_active', true)
            .single()

        if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' })

        const now = new Date()
        const periodEnd = new Date()
        billing_cycle === 'yearly'
            ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
            : periodEnd.setMonth(periodEnd.getMonth() + 1)

        const { error: upsertErr } = await supabase
            .from('user_subscriptions')
            .upsert({
                user_id,
                plan_id,
                status: 'active',
                billing_cycle,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                payment_provider: 'whatsapp_manual',
                payment_provider_subscription_id: `admin_${req.user.id}_${Date.now()}`,
                amount_paid: billing_cycle === 'yearly' ? (plan.price_yearly || 0) : (plan.price_monthly || 0),
                currency: 'USD',
                cancelled_at: null,
                cancel_at_period_end: false,
                updated_at: now.toISOString()
            }, { onConflict: 'user_id' })

        if (upsertErr) throw upsertErr

        console.log(`Admin ${req.user.id} manually activated ${plan_id} (${billing_cycle}) for user ${user_id}. Notes: ${notes || 'none'}`)

        res.json({ success: true, message: `${plan.name} plan activated for user until ${periodEnd.toLocaleDateString()}` })
    } catch (err) {
        console.error('adminActivateSubscription error:', err)
        res.status(500).json({ error: 'Failed to activate subscription' })
    }
}

// ─── ADMIN: LIST PENDING WHATSAPP REQUESTS ───────────────────────────────────
const adminListWhatsappRequests = async (req, res) => {
    try {
        const { data: adminProfile } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', req.user.id)
            .single()

        if (adminProfile?.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' })
        }

        const { data, error } = await supabase
            .from('user_subscriptions')
            .select(`
                id, plan_id, billing_cycle, status, updated_at,
                user:user_id (id, first_name, last_name, email, user_type, phone_number)
            `)
            .eq('status', 'pending_whatsapp')
            .order('updated_at', { ascending: false })

        if (error) throw error

        res.json({ requests: data || [] })
    } catch (err) {
        console.error('adminListWhatsappRequests error:', err)
        res.status(500).json({ error: 'Failed to fetch WhatsApp requests' })
    }
}

// ─── ADMIN: LIST ALL SUBSCRIPTIONS ───────────────────────────────────────────
const adminListAllSubscriptions = async (req, res) => {
    try {
        const { data: adminProfile } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', req.user.id)
            .single()
        if (adminProfile?.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' })
        }
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select(`
                id, plan_id, status, billing_cycle,
                current_period_start, current_period_end, trial_end,
                cancel_at_period_end, payment_provider, updated_at,
                user:user_id (id, first_name, last_name, email, user_type)
            `)
            .order('updated_at', { ascending: false })
        if (error) throw error
        res.json({ subscriptions: data || [] })
    } catch (err) {
        console.error('adminListAllSubscriptions error:', err)
        res.status(500).json({ error: 'Failed to fetch subscriptions' })
    }
}

// ─── ADMIN: DEACTIVATE SUBSCRIPTION ──────────────────────────────────────────
const adminDeactivateSubscription = async (req, res) => {
    try {
        const { data: adminProfile } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', req.user.id)
            .single()
        if (adminProfile?.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' })
        }
        const { user_id } = req.body
        if (!user_id) return res.status(400).json({ error: 'user_id is required' })
        const now = new Date()
        const { error } = await supabase
            .from('user_subscriptions')
            .update({ status: 'inactive', cancelled_at: now.toISOString(), updated_at: now.toISOString() })
            .eq('user_id', user_id)
        if (error) throw error
        res.json({ success: true, message: 'Subscription deactivated' })
    } catch (err) {
        console.error('adminDeactivateSubscription error:', err)
        res.status(500).json({ error: 'Failed to deactivate subscription' })
    }
}

// ─── ADMIN: DIRECTLY GRANT BADGE TO USER ─────────────────────────────────────
const adminGrantBadge = async (req, res) => {
    try {
        const { data: adminProfile } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', req.user.id)
            .single()
        if (adminProfile?.user_type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' })
        }
        const { user_id, badge_type = 'verified' } = req.body
        if (!user_id) return res.status(400).json({ error: 'user_id is required' })
        const now = new Date()
        const { data, error } = await supabase
            .from('verification_badges')
            .upsert({
                user_id,
                badge_type,
                status: 'approved',
                submitted_at: now.toISOString(),
                reviewed_at: now.toISOString(),
                updated_at: now.toISOString()
            }, { onConflict: 'user_id' })
            .select()
        if (error) throw error
        res.json({ success: true, message: 'Badge granted', badge: data?.[0] })
    } catch (err) {
        console.error('adminGrantBadge error:', err)
        res.status(500).json({ error: 'Failed to grant badge' })
    }
}

// ─── CRON: RESET MONTHLY SUBSCRIPTION PERIODS ────────────────────────────────
const resetMonthlyLimits = async (req, res) => {
    const secret = req.headers['x-cron-secret']
    if (!secret || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    const now = new Date()
    let renewed = 0, cancelled = 0
    const errors = []
    try {
        // Renew active subscriptions whose period ended and are not set to cancel
        const { data: toRenew } = await supabase
            .from('user_subscriptions')
            .select('id, billing_cycle, current_period_end')
            .eq('status', 'active')
            .eq('cancel_at_period_end', false)
            .lte('current_period_end', now.toISOString())

        if (toRenew?.length) {
            for (const sub of toRenew) {
                try {
                    const newStart = new Date(sub.current_period_end)
                    const newEnd = new Date(sub.current_period_end)
                    sub.billing_cycle === 'yearly'
                        ? newEnd.setFullYear(newEnd.getFullYear() + 1)
                        : newEnd.setMonth(newEnd.getMonth() + 1)
                    await supabase.from('user_subscriptions')
                        .update({
                            current_period_start: newStart.toISOString(),
                            current_period_end: newEnd.toISOString(),
                            updated_at: now.toISOString()
                        })
                        .eq('id', sub.id)
                    renewed++
                } catch (e) {
                    errors.push(sub.id)
                }
            }
        }

        // Cancel active subscriptions whose period ended and are set to cancel
        const { data: toCancel } = await supabase
            .from('user_subscriptions')
            .select('id')
            .eq('status', 'active')
            .eq('cancel_at_period_end', true)
            .lte('current_period_end', now.toISOString())

        if (toCancel?.length) {
            const ids = toCancel.map(s => s.id)
            await supabase.from('user_subscriptions')
                .update({ status: 'cancelled', cancelled_at: now.toISOString(), updated_at: now.toISOString() })
                .in('id', ids)
            cancelled = ids.length
        }

        console.log(`resetMonthlyLimits: renewed=${renewed}, cancelled=${cancelled}`)
        res.json({ success: true, renewed, cancelled, errors })
    } catch (err) {
        console.error('resetMonthlyLimits error:', err)
        res.status(500).json({ error: err.message })
    }
}

module.exports = {
    getPlans,
    getUserSubscription,
    startFreeTrial,
    startTrialCheckout,
    createSubscription,
    handleFedaPayWebhook,
    cancelSubscription,
    requestVerificationBadge,
    getProfileViewers,
    trackProfileView,
    adminReviewBadge,
    adminListPendingBadges,
    requestWhatsappSubscription,
    verifyAndSubscribe,
    adminActivateSubscription,
    adminListWhatsappRequests,
    chargeExpiredTrials,
    adminListAllSubscriptions,
    adminDeactivateSubscription,
    adminGrantBadge,
    resetMonthlyLimits
}
