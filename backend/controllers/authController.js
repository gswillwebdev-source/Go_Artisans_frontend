const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, userType } = req.body;

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name',
            [email, hashedPassword, firstName, lastName, userType || 'job_seeker']
        );

        const token = jwt.sign({ id: result.rows[0].id, email }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY,
        });

        res.status(201).json({ user: result.rows[0], token });
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

        res.json({ user: { id: user.id, email: user.email, firstName: user.first_name }, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
};

const logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, logout };
