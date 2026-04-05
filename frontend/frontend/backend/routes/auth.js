const express = require('express');
const router = express.Router();
const { register, login, logout, updateUserRole, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { body } = require('express-validator');
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

// Email verification
router.post('/verify-email', authenticateToken, verifyEmail);

// Resend verification email
router.post('/resend-verification-email', authenticateToken, resendVerificationEmail);

// Forgot password - send reset link
router.post('/forgot-password', forgotPassword);

// Reset password with token
router.post('/reset-password', resetPassword);

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
