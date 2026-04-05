const cron = require('node-cron');
const pool = require('../config/database');
const { sendDigestEmail } = require('./notificationService');

/**
 * Digest Scheduler - Automatically sends batch emails to workers
 * Uses node-cron for scheduling
 */

let scheduledJobs = {};

/**
 * Start the digest scheduler
 * Runs:
 * - Daily digest: Every day at 9 AM UTC (configurable)
 * - Weekly digest: Every Monday at 9 AM UTC (configurable)
 */
function startDigestScheduler() {
    try {
        console.log('[Digest Scheduler] Starting...');

        // Daily digest job - runs every day at 9:00 AM UTC
        scheduledJobs.daily = cron.schedule('0 9 * * *', async () => {
            console.log('[Digest Scheduler] Running daily digest...');
            await runDailyDigest();
        }, {
            scheduled: false
        });

        // Weekly digest job - runs every Monday at 9:00 AM UTC
        scheduledJobs.weekly = cron.schedule('0 9 * * 1', async () => {
            console.log('[Digest Scheduler] Running weekly digest...');
            await runWeeklyDigest();
        }, {
            scheduled: false
        });

        // Start the jobs
        scheduledJobs.daily.start();
        scheduledJobs.weekly.start();

        console.log('[Digest Scheduler] ✅ Scheduler started');
        console.log('[Digest Scheduler] Daily digest: Every day at 9:00 AM UTC');
        console.log('[Digest Scheduler] Weekly digest: Every Monday at 9:00 AM UTC');

        return true;
    } catch (error) {
        console.error('[Digest Scheduler Error]', error.message);
        return false;
    }
}

/**
 * Run daily digest emails
 */
async function runDailyDigest() {
    try {
        console.log('[Daily Digest] Fetching workers with daily frequency...');

        // Get all workers with 'daily' notification frequency and email enabled
        const { rows: workers } = await pool.query(`
            SELECT DISTINCT jn.worker_id
            FROM job_notifications jn
            JOIN job_alerts ja ON jn.job_alert_id = ja.id
            JOIN notification_preferences np ON jn.worker_id = np.user_id
            WHERE jn.email_sent = false
            AND jn.status = 'new'
            AND ja.notification_frequency = 'daily'
            AND ja.email_notifications = true
            AND np.email_job_alerts = true
        `);

        console.log(`[Daily Digest] Found ${workers.length} workers with pending daily notifications`);

        let successCount = 0;
        let errorCount = 0;

        // Send digest to each worker
        for (const worker of workers) {
            try {
                const result = await sendDigestEmail(worker.worker_id, 'daily');
                if (result.success) {
                    successCount += result.notificationsSent;
                }
            } catch (error) {
                console.error(`[Daily Digest Error] Failed for worker ${worker.worker_id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`[Daily Digest] ✅ Completed - ${successCount} emails sent, ${errorCount} errors`);
        return { successCount, errorCount };
    } catch (error) {
        console.error('[Daily Digest Error]', error.message);
        return { successCount: 0, errorCount: 1 };
    }
}

/**
 * Run weekly digest emails
 */
async function runWeeklyDigest() {
    try {
        console.log('[Weekly Digest] Fetching workers with weekly frequency...');

        // Get all workers with 'weekly' notification frequency and email enabled
        const { rows: workers } = await pool.query(`
            SELECT DISTINCT jn.worker_id
            FROM job_notifications jn
            JOIN job_alerts ja ON jn.job_alert_id = ja.id
            JOIN notification_preferences np ON jn.worker_id = np.user_id
            WHERE jn.email_sent = false
            AND jn.status = 'new'
            AND ja.notification_frequency = 'weekly'
            AND ja.email_notifications = true
            AND np.email_job_alerts = true
        `);

        console.log(`[Weekly Digest] Found ${workers.length} workers with pending weekly notifications`);

        let successCount = 0;
        let errorCount = 0;

        // Send digest to each worker
        for (const worker of workers) {
            try {
                const result = await sendDigestEmail(worker.worker_id, 'weekly');
                if (result.success) {
                    successCount += result.notificationsSent;
                }
            } catch (error) {
                console.error(`[Weekly Digest Error] Failed for worker ${worker.worker_id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`[Weekly Digest] ✅ Completed - ${successCount} emails sent, ${errorCount} errors`);
        return { successCount, errorCount };
    } catch (error) {
        console.error('[Weekly Digest Error]', error.message);
        return { successCount: 0, errorCount: 1 };
    }
}

/**
 * Stop the digest scheduler (for graceful shutdown)
 */
function stopDigestScheduler() {
    try {
        if (scheduledJobs.daily) {
            scheduledJobs.daily.stop();
        }
        if (scheduledJobs.weekly) {
            scheduledJobs.weekly.stop();
        }
        console.log('[Digest Scheduler] ✅ Scheduler stopped');
        return true;
    } catch (error) {
        console.error('[Digest Scheduler Stop Error]', error.message);
        return false;
    }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
    return {
        dailyRunning: scheduledJobs.daily?.status === 'started',
        weeklyRunning: scheduledJobs.weekly?.status === 'started'
    };
}

module.exports = {
    startDigestScheduler,
    stopDigestScheduler,
    runDailyDigest,
    runWeeklyDigest,
    getSchedulerStatus
};
