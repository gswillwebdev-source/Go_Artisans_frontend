require('dotenv').config();
const pool = require('./config/database');

async function debugCompletionIssue() {
    try {
        console.log('=== COMPLETION DEBUG ===\n');

        // 1. Show accepted applications
        console.log('1. ACCEPTED APPLICATIONS:\n');
        const accepted = await pool.query(`
            SELECT 
                a.id as app_id,
                a.job_id,
                a.user_id,
                u.first_name,
                u.last_name,
                j.title as job_title
            FROM applications a
            JOIN users u ON a.user_id = u.id
            JOIN jobs j ON a.job_id = j.id
            WHERE a.status = 'accepted'
        `);

        if (accepted.rows.length === 0) {
            console.log('No accepted applications found!');
        } else {
            accepted.rows.forEach(row => {
                console.log(`Worker: ${row.first_name} ${row.last_name} (ID: ${row.user_id})`);
                console.log(`  Can mark complete for: Job ${row.job_id} - "${row.job_title}"`);
                console.log('');
            });
        }

        // 2. Show all jobs
        console.log('\n2. ALL JOBS:\n');
        const jobs = await pool.query('SELECT id, title FROM jobs ORDER BY id');
        jobs.rows.forEach(job => {
            console.log(`Job ${job.id}: ${job.title}`);
        });

        // 3. Show job completions
        console.log('\n3. JOB COMPLETIONS:\n');
        const completions = await pool.query(`
            SELECT 
                jc.id,
                jc.job_id,
                jc.worker_id,
                jc.status,
                u.first_name,
                u.last_name,
                j.title
            FROM job_completions jc
            JOIN users u ON jc.worker_id = u.id
            JOIN jobs j ON jc.job_id = j.id
            ORDER BY jc.created_at DESC
        `);

        if (completions.rows.length === 0) {
            console.log('No completions requested yet');
        } else {
            completions.rows.forEach(row => {
                console.log(`Job ${row.job_id}: "${row.title}"`);
                console.log(`  Worker: ${row.first_name} ${row.last_name}`);
                console.log(`  Status: ${row.status}`);
                console.log('');
            });
        }

        console.log('\n=== SOLUTION ===');
        console.log('To test mark completion:');
        accepted.rows.forEach(row => {
            console.log(`1. Log in as worker (ID: ${row.user_id})`);
            console.log(`2. Go to worker profile`);
            console.log(`3. Find the "Accepted Jobs" section`);
            console.log(`4. Click "Mark as Completed" for Job ${row.job_id}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

debugCompletionIssue();
