require('dotenv').config();
const pool = require('../config/database');

async function addPhoneNumberColumn() {
    try {
        console.log('Adding phone_number column to users table...');

        // Check if column already exists
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='phone_number'
        `);

        if (checkColumn.rows.length > 0) {
            console.log('✅ phone_number column already exists');
            process.exit(0);
        }

        // Add the column
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN phone_number VARCHAR(20)
        `);

        console.log('✅ Successfully added phone_number column to users table');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding phone_number column:', err.message || err);
        process.exit(1);
    }
}

addPhoneNumberColumn();
