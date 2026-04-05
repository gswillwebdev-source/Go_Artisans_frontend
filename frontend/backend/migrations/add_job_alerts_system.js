require('dotenv').config();
const pool = require('../config/database');

async function addJobAlertsSystem() {
    try {
        console.log('Creating job alerts system tables...');

        // 1. Create job_alerts table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS job_alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,

                -- Search criteria
                skills JSONB DEFAULT '[]'::jsonb,
                location VARCHAR(255),
                min_budget VARCHAR(100),
                max_budget VARCHAR(100),

                -- Notification settings
                notification_frequency VARCHAR(50) DEFAULT 'immediate',
                is_active BOOLEAN DEFAULT true,
                email_notifications BOOLEAN DEFAULT true,
                in_app_notifications BOOLEAN DEFAULT true,

                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created job_alerts table');

        // 2. Create job_notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS job_notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                job_alert_id UUID REFERENCES job_alerts(id) ON DELETE CASCADE,
                job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

                status VARCHAR(50) DEFAULT 'new',
                email_sent BOOLEAN DEFAULT false,
                email_sent_at TIMESTAMP WITH TIME ZONE,
                viewed_at TIMESTAMP WITH TIME ZONE,

                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(worker_id, job_id)
            );
        `);
        console.log('✅ Created job_notifications table');

        // 3. Create notification_preferences table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

                email_job_alerts BOOLEAN DEFAULT true,
                in_app_job_alerts BOOLEAN DEFAULT true,
                email_frequency VARCHAR(50) DEFAULT 'immediate',
                digest_day_of_week VARCHAR(20) DEFAULT 'monday',
                digest_time_preference VARCHAR(10) DEFAULT '09:00',

                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created notification_preferences table');

        // 4. Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_job_alerts_worker_active
            ON job_alerts(worker_id, is_active);
        `);
        console.log('✅ Created idx_job_alerts_worker_active');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_job_notifications_worker_status
            ON job_notifications(worker_id, status);
        `);
        console.log('✅ Created idx_job_notifications_worker_status');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_job_notifications_email_sent
            ON job_notifications(email_sent, created_at DESC);
        `);
        console.log('✅ Created idx_job_notifications_email_sent');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_job_notifications_job_id
            ON job_notifications(job_id);
        `);
        console.log('✅ Created idx_job_notifications_job_id');

        console.log('✅ Job alerts system migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exit(1);
    }
}

addJobAlertsSystem();
