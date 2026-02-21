const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');
const { body } = require('express-validator');
const crypto = require('crypto');
const { sendVerificationCode } = require('../config/email');
const User = require('../models/User');
const passport = require('passport');
const jwt = require('jsonwebtoken');

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
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const user = {
            id: req.user._id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
        };
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth-success?token=${token}&user=${encodeURIComponent(
            JSON.stringify(user)
        )}`;
        res.redirect(redirectUrl);
    }
);

// OAuth: initiate GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// GitHub callback
router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const user = {
            id: req.user._id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
        };
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth-success?token=${token}&user=${encodeURIComponent(
            JSON.stringify(user)
        )}`;
        res.redirect(redirectUrl);
    }
);

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

module.exports = router;
