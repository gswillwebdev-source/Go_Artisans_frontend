require('dotenv').config();
const pool = require('../config/database');

async function syncWorkerFlag() {
    try {
        console.log('Syncing is_worker flag based on user_type...');

        // Set is_worker=true for any record where user_type is 'worker'
        await pool.query(
            "UPDATE users SET is_worker = TRUE WHERE user_type = 'worker' AND (is_worker IS NULL OR is_worker = FALSE)"
        );

        console.log('✅ is_worker flags updated successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error syncing is_worker flag:', err.message || err);
        process.exit(1);
    }
}

syncWorkerFlag();
