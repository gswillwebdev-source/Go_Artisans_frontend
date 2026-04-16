require('dotenv').config();
const pool = require('../config/database');

async function addWorkerFieldsAndReviews() {
    try {
        console.log('Adding worker fields and reviews table...');

        // Add columns to users table if they don't exist
        const addColumns = [
            { name: 'is_worker', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_worker BOOLEAN DEFAULT false" },
            { name: 'job_title', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(150)" },
            { name: 'location', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)" },
            { name: 'rating', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0" },
            { name: 'years_experience', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0" },
            { name: 'services', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb" },
            { name: 'completed_jobs', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_jobs INTEGER DEFAULT 0" }
        ];

        for (const col of addColumns) {
            await pool.query(col.sql);
        }

        // Create reviews table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Worker fields and reviews table ensured');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding worker fields/reviews:', err.message || err);
        process.exit(1);
    }
}

addWorkerFieldsAndReviews();
