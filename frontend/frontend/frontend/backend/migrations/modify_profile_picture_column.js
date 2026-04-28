require('dotenv').config();
const pool = require('../config/database');

async function modifyProfilePictureColumn() {
    try {
        console.log('Modifying profile_picture column to TEXT...');

        await pool.query(`
            ALTER TABLE users 
            ALTER COLUMN profile_picture TYPE TEXT
        `);

        console.log('✅ Profile picture column modified successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error modifying profile_picture column:', err.message || err);
        process.exit(1);
    }
}

modifyProfilePictureColumn();
