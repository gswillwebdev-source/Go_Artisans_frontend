require('dotenv').config();
const pool = require('./config/database');

async function checkApplicationStatus() {
    try {
        console.log('Checking application statuses in database...\n');

        // Get all applications
        const result = await pool.query(`
            SELECT 
                a.id,
                a.job_id,
                a.user_id,
                a.status,
                u.first_name,
                u.last_name,
                j.title as job_title
            FROM applications a
            JOIN users u ON a.user_id = u.id
            JOIN jobs j ON a.job_id = j.id
            ORDER BY a.created_at DESC
        `);

        if (result.rows.length === 0) {
            console.log('No applications found in database');
        } else {
            console.log(`Found ${result.rows.length} application(s):\n`);
            result.rows.forEach(app => {
                console.log(`ID: ${app.id}`);
                console.log(`  Worker: ${app.first_name} ${app.last_name} (User ID: ${app.user_id})`);
                console.log(`  Job: "${app.job_title}" (Job ID: ${app.job_id})`);
                console.log(`  Status: ${app.status}`);
                console.log('---');
            });
        }

        // Show summary of statuses
        const statusSummary = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM applications
            GROUP BY status
        `);

        console.log('\nStatus Summary:');
        statusSummary.rows.forEach(row => {
            console.log(`  ${row.status}: ${row.count}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkApplicationStatus();
