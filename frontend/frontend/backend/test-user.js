require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/database');

async function createTestUser() {
    try {
        const email = 'test@example.com';
        const password = await bcrypt.hash('password123', 10);
        const firstName = 'Test';
        const lastName = 'User';
        const phoneNumber = '+228123456789';

        // Check if user exists
        const exists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
            console.log('✅ Test user already exists:', exists.rows[0]);
            pool.end();
            return;
        }

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, password, first_name, last_name, phone_number) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, phone_number',
            [email, password, firstName, lastName, phoneNumber]
        );

        console.log('✅ Test user created:', result.rows[0]);
        console.log('Email:', email);
        console.log('Password: password123');

        pool.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        pool.end();
    }
}

createTestUser();
