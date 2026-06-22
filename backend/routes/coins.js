const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const { createCoinCheckout, handleCoinWebhook } = require('../controllers/coinController')

// ── FedaPay webhook (public — no auth) ──────────────────────────────────────
router.get('/fedapay/webhook', (req, res) => res.status(200).json({ status: 'ok', message: 'Coin webhook endpoint active' }))
router.post('/fedapay/webhook', handleCoinWebhook)

// ── Authenticated ────────────────────────────────────────────────
// POST /api/coins/fedapay/checkout: create FedaPay checkout for coin purchase
router.post('/fedapay/checkout', authenticateToken, createCoinCheckout)

module.exports = router
