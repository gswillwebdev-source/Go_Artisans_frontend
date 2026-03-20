require('dotenv').config();
const pool = require('../config/database');

async function addEmailVerificationAndPasswordReset() {
    try {
        console.log('Adding email verification and password reset columns...');

        // Add email_verified column
        await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
    `);

        // Add email_verification_code column
        await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6)
    `);

        // Add verification_code_expires_at column
        await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP
    `);

        // Add password_reset_token column
        await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)
    `);

        // Add password_reset_token_expires_at column
        await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMP
    `);

        console.log('✅ Email verification and password reset columns added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding columns:', err);
        process.exit(1);
    }
}

addEmailVerificationAndPasswordReset();
