require('dotenv').config();
const pool = require('../config/database');

async function seedWorker() {
    try {
        console.log('Seeding sample worker...');

        // Update first user to be a worker
        const result = await pool.query(`
            UPDATE users 
            SET 
                is_worker = true,
                job_title = 'Professional Plumber',
                location = 'Lomé – Baguida',
                bio = 'Professional plumber with 8 years of experience in pipe repairs, installations, and home plumbing solutions. I provide reliable and fast service in Lomé and surrounding areas. Trust me to fix any plumbing issue efficiently.',
                years_experience = 8,
                services = $1,
                completed_jobs = 25
            WHERE id = 1
            RETURNING *
        `, [JSON.stringify(['Pipe installation', 'Leak repair', 'Bathroom fitting', 'Water heater repair', 'Drain cleaning'])]);

        if (result.rows.length > 0) {
            console.log('✅ Worker setup complete for user:', result.rows[0].first_name);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding worker:', err.message || err);
        process.exit(1);
    }
}

seedWorker();
