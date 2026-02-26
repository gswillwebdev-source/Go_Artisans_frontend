const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendVerificationCode, sendPasswordResetLink } = require('../config/email');

// Generate random 6-digit code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate reset token
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Validate password strength: at least 8 characters with mix of uppercase, lowercase, numbers, and special characters
const validatePasswordStrength = (password) => {
    if (!password || password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc)' };
    }
    return { valid: true, message: 'Password is strong' };
};

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phoneNumber, userType } = req.body;

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.message });
        }

        // Check for duplicate email
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check for duplicate phone number if provided
        if (phoneNumber) {
            const phoneExists = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
            if (phoneExists.rows.length > 0) {
                return res.status(400).json({ error: 'Phone number already registered' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        const result = await pool.query(
            'INSERT INTO users (email, password, first_name, last_name, phone_number, user_type, email_verification_code, verification_code_expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, first_name, last_name, phone_number, user_type, email_verified',
            [email, hashedPassword, firstName, lastName, phoneNumber, null, verificationCode, verificationCodeExpires]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY,
        });

        // Send verification code email
        try {
            await sendVerificationCode(email, verificationCode);
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr);
            // Don't fail registration if email fails, but log it
        }

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                userType: user.user_type,
                emailVerified: user.email_verified
            },
            token,
            message: 'Please check your email to verify your account'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        const { verificationCode } = req.body;

        if (!verificationCode || verificationCode.length !== 6) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Check if code matches and hasn't expired
        if (user.email_verification_code !== verificationCode) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const now = new Date();
        if (user.verification_code_expires_at < now) {
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        // Mark email as verified
        await pool.query(
            'UPDATE users SET email_verified = TRUE, email_verification_code = NULL, verification_code_expires_at = NULL WHERE id = $1',
            [userId]
        );

        res.json({ message: 'Email verified successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Email verification failed' });
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Check if user is already verified
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Update user with new code
        await pool.query(
            'UPDATE users SET email_verification_code = $1, verification_code_expires_at = $2 WHERE id = $3',
            [verificationCode, verificationCodeExpires, userId]
        );

        // Send verification email
        try {
            await sendVerificationCode(user.email, verificationCode);
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr);
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        res.json({ message: 'Verification code sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to resend verification code' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                userType: user.user_type,
                emailVerified: user.email_verified
            },
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
};

const logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

const updateUserRole = async (req, res) => {
    try {
        const userId = req.user.id;
        const { userType } = req.body;

        // Validate userType
        if (!userType || !['worker', 'client'].includes(userType)) {
            return res.status(400).json({ error: 'Invalid user type. Must be "worker" or "client"' });
        }

        const result = await pool.query(
            'UPDATE users SET user_type = $1 WHERE id = $2 RETURNING id, email, first_name, last_name, phone_number, user_type',
            [userType, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                userType: user.user_type
            }
        });
    } catch (err) {
        console.error('Failed to update user role:', err);
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = result.rows[0].id;
        const resetToken = generateResetToken();
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.query(
            'UPDATE users SET password_reset_token = $1, password_reset_token_expires_at = $2 WHERE id = $3',
            [resetToken, resetTokenExpires, userId]
        );

        // Send password reset email
        try {
            await sendPasswordResetLink(email, resetToken);
        } catch (emailErr) {
            console.error('Failed to send password reset email:', emailErr);
            return res.status(500).json({ error: 'Failed to send reset email' });
        }

        res.json({ message: 'Password reset email sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process password reset' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const result = await pool.query(
            'SELECT id FROM users WHERE password_reset_token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const userId = result.rows[0].id;
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        // Check if token has expired
        const now = new Date();
        if (user.password_reset_token_expires_at < now) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = $2',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

module.exports = { register, login, logout, updateUserRole, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword };

