const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const {
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
} = require('../controllers/subscriptionController')

// ── FedaPay webhook (public — no auth) ──────────────────────────────────────
// GET: verification ping from FedaPay dashboard when registering the webhook
router.get('/fedapay/webhook', (req, res) => res.status(200).json({ status: 'ok', message: 'FedaPay webhook endpoint active' }))
router.post('/fedapay/webhook', handleFedaPayWebhook)

// ── Public ──────────────────────────────────────────────────────
router.get('/plans', getPlans)

// ── Authenticated ────────────────────────────────────────────────
router.get('/me', authenticateToken, getUserSubscription)
router.post('/trial', authenticateToken, startFreeTrial)
// trial-checkout: requires FedaPay card verification ($1 refunded on webhook) → activates 14-day trial
router.post('/trial-checkout', authenticateToken, startTrialCheckout)
router.post('/subscribe', authenticateToken, createSubscription)
router.post('/cancel', authenticateToken, cancelSubscription)
router.post('/verify', authenticateToken, requestVerificationBadge)
router.get('/profile-viewers', authenticateToken, getProfileViewers)
router.post('/track-view', authenticateToken, trackProfileView)

// POST /api/subscriptions/request-whatsapp  { plan_id, billing_cycle }
router.post('/request-whatsapp', authenticateToken, requestWhatsappSubscription)

// POST /api/subscriptions/verify-and-subscribe  { plan_id, billing_cycle }
router.post('/verify-and-subscribe', authenticateToken, verifyAndSubscribe)

// ── Admin ─────────────────────────────────────────────────────────
router.get('/admin/badges/pending', authenticateToken, adminListPendingBadges)
router.post('/admin/badges/review', authenticateToken, adminReviewBadge)
router.post('/admin/badges/grant', authenticateToken, adminGrantBadge)
router.get('/admin/whatsapp-requests', authenticateToken, adminListWhatsappRequests)
router.post('/admin/activate', authenticateToken, adminActivateSubscription)
router.post('/admin/deactivate', authenticateToken, adminDeactivateSubscription)
router.get('/admin/all-subscriptions', authenticateToken, adminListAllSubscriptions)

// ── Cron (called by Vercel cron via x-cron-secret header) ─────────────────────
// Processes expired trials: sends billing emails + disables non-paying users after 3-day grace
router.post('/cron/process-trials', chargeExpiredTrials)
// Renews active subscriptions and cancels expired cancel_at_period_end ones on 1st of month
router.post('/cron/reset-monthly', resetMonthlyLimits)

module.exports = router
