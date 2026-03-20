require('dotenv').config();
const pool = require('../config/database');

async function addRaterTypeToRatings() {
    try {
        console.log('Adding rater_type column to ratings table...');

        // Add rater_type column to distinguish worker ratings from client ratings
        await pool.query(`
            ALTER TABLE ratings
            ADD COLUMN IF NOT EXISTS rater_type VARCHAR(20) DEFAULT 'worker'
            CHECK (rater_type IN ('worker', 'client'))
        `);
        console.log('✓ Added rater_type column to ratings table');

        // Add separate rating columns for workers and clients
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS worker_rating DECIMAL(3, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS worker_rating_count INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS client_rating DECIMAL(3, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS client_rating_count INT DEFAULT 0
        `);
        console.log('✓ Added separate rating columns for workers and clients');

        console.log('\n✅ Rater type system initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding rater type:', err);
        process.exit(1);
    }
}

addRaterTypeToRatings();
