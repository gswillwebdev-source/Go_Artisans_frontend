require('dotenv').config();
const pool = require('../config/database');

async function addPortfolioField() {
    try {
        console.log('Adding portfolio field to users table...');

        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb
        `);

        console.log('✅ Portfolio field added successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding portfolio field:', err.message || err);
        process.exit(1);
    }
}

addPortfolioField();
