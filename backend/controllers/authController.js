const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phoneNumber, userType } = req.body;

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
        const result = await pool.query(
            'INSERT INTO users (email, password, first_name, last_name, phone_number, user_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, phone_number, user_type',
            [email, hashedPassword, firstName, lastName, phoneNumber, null]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY,
        });

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                userType: user.user_type
            },
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
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

        res.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, phoneNumber: user.phone_number, userType: user.user_type }, token });
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

module.exports = { register, login, logout, updateUserRole };
