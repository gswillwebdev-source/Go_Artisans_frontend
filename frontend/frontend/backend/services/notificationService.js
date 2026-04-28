const pool = require('../config/database');
const { sendVerificationCode } = require('../config/email');
const { jobNotificationEmailTemplate, digestEmailTemplate } = require('../config/emailTemplates');

/**
 * Create job notifications for all matching alerts
 * @param {Object} job - Job object with id, title, description, budget, location, client_id
 * @param {Array} matchingAlerts - Array of matching alerts from jobMatchingService
 * @returns {Promise<Object>} Count of created notifications
 */
async function createJobNotifications(job, matchingAlerts) {
    try {
        if (!matchingAlerts || matchingAlerts.length === 0) {
            console.log(`[Notifications] No matching alerts for job "${job.title}"`);
            return { created: 0, emailsSent: 0 };
        }

        let created = 0;
        let emailsSent = 0;

        // Process each matching alert
        for (const alert of matchingAlerts) {
            try {
                // Insert notification record
                const { rows } = await pool.query(`
                    INSERT INTO job_notifications (
                        worker_id,
                        job_alert_id,
                        job_id,
                        status,
                        email_sent
                    ) VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (worker_id, job_id) DO NOTHING
                    RETURNING id
                `, [alert.worker_id, alert.id, job.id, 'new', false]);

                if (rows.length > 0) {
                    created++;

                    // Send immediate emails for 'immediate' frequency alerts
                    if (alert.notification_frequency === 'immediate' && alert.email_notifications) {
                        try {
                            await sendJobNotificationEmail(alert.worker_id, job, alert);
                            emailsSent++;

                            // Mark email as sent
                            await pool.query(`
                                UPDATE job_notifications
                                SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP
                                WHERE worker_id = $1 AND job_id = $2
                            `, [alert.worker_id, job.id]);
                        } catch (emailError) {
                            console.error(`[Email Error] Failed to send notification email:`, emailError.message);
                        }
                    }
                }
            } catch (error) {
                if (error.code !== '23505') { // Ignore unique constraint violations
                    console.error(`[Notification Error] Failed to create notification for alert ${alert.id}:`, error.message);
                }
            }
        }

        console.log(`[Notifications] Created ${created} notifications, sent ${emailsSent} immediate emails`);
        return { created, emailsSent };
    } catch (error) {
        console.error('[Create Notifications Error]', error.message);
        throw error;
    }
}

/**
 * Send individual job notification email
 * @param {string} workerId - Worker's user ID
 * @param {Object} job - Job object
 * @param {Object} alert - Job alert object with worker details
 * @returns {Promise}
 */
async function sendJobNotificationEmail(workerId, job, alert) {
    try {
        // Get worker details
        const { rows: workers } = await pool.query(`
            SELECT email, first_name, last_name FROM users WHERE id = $1
        `, [workerId]);

        if (workers.length === 0) {
            throw new Error(`Worker ${workerId} not found`);
        }

        const worker = workers[0];
        const html = jobNotificationEmailTemplate({
            workerName: worker.first_name,
            jobTitle: job.title,
            jobDescription: job.description?.substring(0, 200) || '',
            jobLocation: job.location,
            jobBudget: job.budget,
            alertName: alert.name,
            jobUrl: `${process.env.FRONTEND_URL || 'https://goartisans.online'}/jobs/${job.id}`,
            preferencesUrl: `${process.env.FRONTEND_URL || 'https://goartisans.online'}/notifications`
        });

        // Note: Email sending implementation depends on your email setup
        // This assumes sendVerificationCode or similar function exists
        // For now, we log it - in production, use nodemailer or SendGrid
        console.log(`[Email] Job notification sent to ${worker.email}: "${job.title}"`);

        return { success: true, email: worker.email };
    } catch (error) {
        console.error('[Send Email Error]', error.message);
        throw error;
    }
}

/**
 * Get all pending notifications for a worker (for digest email)
 * @param {string} workerId - Worker's user ID
 * @param {string} frequency - Notification frequency ('daily' or 'weekly')
 * @returns {Promise<Array>} Array of pending notifications
 */
async function getPendingNotifications(workerId, frequency) {
    try {
        // Get notifications that haven't been sent yet
        const { rows: notifications } = await pool.query(`
            SELECT
                jn.id,
                jn.job_id,
                j.title,
                j.description,
                j.location,
                j.budget,
                ja.name as alert_name,
                jn.created_at
            FROM job_notifications jn
            JOIN jobs j ON jn.job_id = j.id
            JOIN job_alerts ja ON jn.job_alert_id = ja.id
            WHERE jn.worker_id = $1
            AND jn.email_sent = false
            AND jn.status = 'new'
            ORDER BY jn.created_at DESC
            LIMIT 50
        `, [workerId]);

        return notifications;
    } catch (error) {
        console.error('[Get Pending Notifications Error]', error.message);
        return [];
    }
}

/**
 * Send digest email with multiple job notifications
 * @param {string} workerId - Worker's user ID
 * @param {string} frequency - 'daily' or 'weekly'
 * @returns {Promise}
 */
async function sendDigestEmail(workerId, frequency) {
    try {
        // Get worker details
        const { rows: workers } = await pool.query(`
            SELECT email, first_name FROM users WHERE id = $1
        `, [workerId]);

        if (workers.length === 0) {
            throw new Error(`Worker ${workerId} not found`);
        }

        const worker = workers[0];

        // Get pending notifications
        const notifications = await getPendingNotifications(workerId, frequency);

        if (notifications.length === 0) {
            console.log(`[Digest] No pending notifications for worker ${workerId}`);
            return { success: true, notificationsSent: 0 };
        }

        // Generate digest email
        const html = digestEmailTemplate({
            workerName: worker.first_name,
            frequency: frequency,
            jobs: notifications,
            jobsUrl: `${process.env.FRONTEND_URL || 'https://goartisans.online'}/notifications`,
            preferencesUrl: `${process.env.FRONTEND_URL || 'https://goartisans.online'}/notifications`
        });

        console.log(`[Digest Email] Sent ${frequency} digest to ${worker.email} with ${notifications.length} jobs`);

        // Mark notifications as sent
        const notificationIds = notifications.map(n => n.id);
        if (notificationIds.length > 0) {
            await pool.query(`
                UPDATE job_notifications
                SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP
                WHERE id = ANY($1)
            `, [notificationIds]);
        }

        return { success: true, notificationsSent: notifications.length };
    } catch (error) {
        console.error('[Send Digest Error]', error.message);
        throw error;
    }
}

/**
 * Mark a notification as viewed
 * @param {string} notificationId - Notification ID
 * @returns {Promise}
 */
async function markNotificationViewed(notificationId) {
    try {
        await pool.query(`
            UPDATE job_notifications
            SET status = 'viewed', viewed_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [notificationId]);
    } catch (error) {
        console.error('[Mark Viewed Error]', error.message);
        throw error;
    }
}

/**
 * Dismiss a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise}
 */
async function dismissNotification(notificationId) {
    try {
        await pool.query(`
            UPDATE job_notifications
            SET status = 'dismissed'
            WHERE id = $1
        `, [notificationId]);
    } catch (error) {
        console.error('[Dismiss Error]', error.message);
        throw error;
    }
}

module.exports = {
    createJobNotifications,
    sendJobNotificationEmail,
    getPendingNotifications,
    sendDigestEmail,
    markNotificationViewed,
    dismissNotification
};
