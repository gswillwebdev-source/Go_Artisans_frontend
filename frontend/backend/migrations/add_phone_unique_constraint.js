require('dotenv').config();
const pool = require('../config/database');

async function addPhoneUniqueConstraint() {
    try {
        console.log('Adding UNIQUE constraint to phone_number...');

        // First, remove any duplicate phone numbers (keep the first one)
        await pool.query(`
            DELETE FROM users WHERE id NOT IN (
                SELECT DISTINCT ON (phone_number) id FROM users 
                WHERE phone_number IS NOT NULL 
                ORDER BY phone_number, id
            ) AND phone_number IS NOT NULL
        `);

        // Add UNIQUE constraint
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT unique_phone_number UNIQUE (phone_number)
        `);

        console.log('✅ UNIQUE constraint added to phone_number successfully');
        process.exit(0);
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('ℹ️ Constraint already exists');
            process.exit(0);
        }
        console.error('❌ Error adding constraint:', err.message || err);
        process.exit(1);
    }
}

addPhoneUniqueConstraint();
