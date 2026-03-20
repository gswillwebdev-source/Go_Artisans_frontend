require('dotenv').config();
const pool = require('../config/database');

async function addCompletionAndRatings() {
    try {
        console.log('Adding job completion and rating system...');

        // 1. Add completion status to jobs table
        await pool.query(`
            ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS completion_requested_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS completion_requested_by VARCHAR(10)
        `);
        console.log('✓ Added completion_status columns to jobs table');

        // 2. Create job_completions table to track completion workflow
        await pool.query(`
            CREATE TABLE IF NOT EXISTS job_completions (
                id SERIAL PRIMARY KEY,
                job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                worker_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                client_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                reason_for_decline TEXT,
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created job_completions table');

        // 3. Create ratings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ratings (
                id SERIAL PRIMARY KEY,
                job_completion_id INT NOT NULL REFERENCES job_completions(id) ON DELETE CASCADE,
                rater_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                ratee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created ratings table');

        // 4. Create notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255),
                message TEXT,
                related_job_id INT REFERENCES jobs(id),
                related_completion_id INT REFERENCES job_completions(id),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created notifications table');

        // 5. Add average rating columns to users table
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0
        `);
        console.log('✓ Added rating columns to users table');

        console.log('\n✅ Job completion and rating system initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding completion and ratings:', err);
        process.exit(1);
    }
}

addCompletionAndRatings();
