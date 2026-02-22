const express = require('express');
const router = express.Router();
const { register, login, logout, updateUserRole } = require('../controllers/authController');
const { body } = require('express-validator');
const crypto = require('crypto');
const { sendVerificationCode } = require('../config/email');
const User = require('../models/User');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

// Validation middleware
const validateRegister = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
];

const validateLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
];

// Forgot password - send verification code
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString()
        user.resetCode = code
        user.resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        await user.save()

        await sendVerificationCode(email, code)
        res.json({ message: 'Verification code sent to email' })
    } catch (err) {
        res.status(500).json({ error: 'Failed to send verification code' })
    }
})

// Verify code
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        if (user.resetCode !== code || user.resetCodeExpiry < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired code' })
        }

        res.json({ message: 'Code verified' })
    } catch (err) {
        res.status(500).json({ error: 'Verification failed' })
    }
})

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        if (user.resetCode !== code || user.resetCodeExpiry < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired code' })
        }

        user.password = newPassword
        user.resetCode = null
        user.resetCodeExpiry = null
        await user.save()

        res.json({ message: 'Password reset successful' })
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset password' })
    }
})

// OAuth: initiate Google
router.get('/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google callback
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(500).json({ error: 'User not authenticated properly' });
            }
            const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            const user = {
                id: req.user.id,
                email: req.user.email,
                firstName: req.user.first_name,
                lastName: req.user.last_name,
                phoneNumber: req.user.phone_number,
                userType: req.user.user_type,
            };
            const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?token=${token}&user=${encodeURIComponent(
                JSON.stringify(user)
            )}`;
            res.redirect(redirectUrl);
        } catch (err) {
            console.error('Google callback error:', err);
            res.status(500).json({ error: 'Google authentication failed', details: err.message });
        }
    }
);


router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.put('/update-role', authenticateToken, updateUserRole);

module.exports = router;
