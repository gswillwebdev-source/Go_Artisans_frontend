require('dotenv').config();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function addAdminFields() {
    try {
        console.log('Adding admin fields to users table...');

        // Add is_admin column
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
        `);
        console.log('✓ Added is_admin column');

        // Add is_suspended column
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE
        `);
        console.log('✓ Added is_suspended column');

        // Add suspension_reason column
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS suspension_reason TEXT
        `);
        console.log('✓ Added suspension_reason column');

        // Delete any existing admin users first
        await pool.query('DELETE FROM users WHERE is_admin = true');
        console.log('✓ Cleared old admin users');

        // Create a default admin user
        const adminEmail = 'jobs70341@gmail.com';
        const adminPassword = 'Admin@123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const result = await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, phone_number, user_type, is_admin, email_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, email`,
            [adminEmail, hashedPassword, 'Admin', 'User', '+228 00000000', 'admin', true, true]
        );

        console.log('✓ Created default admin user');
        console.log('  Email: ' + adminEmail);
        console.log('  Password: ' + adminPassword);
        console.log('  User ID: ' + result.rows[0].id);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding admin fields:', err);
        process.exit(1);
    }
}

addAdminFields();
