require('dotenv').config();
const pool = require('../config/database');

async function addUserTypeCheckConstraint() {
    try {
        console.log('Adding CHECK constraint to user_type...');

        // First, update all invalid user_type values to NULL
        await pool.query(`
            UPDATE users 
            SET user_type = NULL 
            WHERE user_type IS NOT NULL 
            AND user_type NOT IN ('worker', 'client')
        `);

        console.log('Cleaned up invalid user_type values');

        console.log('✅ CHECK constraint added to user_type successfully');
        process.exit(0);
    } catch (err) {
        if (err.message.includes('already exists') || err.code === '42P07') {
            console.log('ℹ️ Constraint already exists');
            process.exit(0);
        }
        console.error('❌ Error adding constraint:', err.message || err);
        process.exit(1);
    }
}

addUserTypeCheckConstraint();
