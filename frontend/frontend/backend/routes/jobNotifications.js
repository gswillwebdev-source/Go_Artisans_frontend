const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { markNotificationViewed, dismissNotification } = require('../services/notificationService');

/**
 * GET /job-notifications
 * Get job notifications for authenticated worker with pagination
 * Query params: ?status=new&page=1&limit=20
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'new', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT
                jn.id,
                jn.job_id,
                jn.job_alert_id,
                jn.status,
                jn.viewed_at,
                jn.created_at,
                j.title as job_title,
                j.description as job_description,
                j.location as job_location,
                j.budget as job_budget,
                ja.name as alert_name,
                u.first_name as client_first_name,
                u.last_name as client_last_name,
                u.rating as client_rating
            FROM job_notifications jn
            JOIN jobs j ON jn.job_id = j.id
            JOIN job_alerts ja ON jn.job_alert_id = ja.id
            JOIN users u ON j.client_id = u.id
            WHERE jn.worker_id = $1
        `;

        const params = [userId];
        let paramCount = 2;

        // Filter by status if provided
        if (status) {
            query += ` AND jn.status = $${paramCount++}`;
            params.push(status);
        }

        // Get total count
        const countQuery = query.replace(
            /SELECT.*FROM job_notifications/,
            'SELECT COUNT(*) as count FROM job_notifications'
        );
        const { rows: countRows } = await pool.query(countQuery, params.slice(0, paramCount - 1));
        const totalCount = parseInt(countRows[0].count);

        // Add ordering and pagination
        query += ` ORDER BY jn.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const { rows: notifications } = await pool.query(query, params);

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('[Get Notifications Error]', error.message);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * GET /job-notifications/count/unread
 * Get count of unread notifications
 */
router.get('/count/unread', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows } = await pool.query(`
            SELECT COUNT(*) as count
            FROM job_notifications
            WHERE worker_id = $1 AND status = 'new'
        `, [userId]);

        res.json({
            success: true,
            unreadCount: parseInt(rows[0].count)
        });
    } catch (error) {
        console.error('[Get Unread Count Error]', error.message);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

/**
 * PATCH /job-notifications/:notificationId/read
 * Mark a notification as viewed
 */
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const { rows: existing } = await pool.query(`
            SELECT id FROM job_notifications WHERE id = $1 AND worker_id = $2
        `, [notificationId, userId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await markNotificationViewed(notificationId);

        const { rows } = await pool.query(`
            SELECT * FROM job_notifications WHERE id = $1
        `, [notificationId]);

        res.json({
            success: true,
            notification: rows[0]
        });
    } catch (error) {
        console.error('[Mark Read Error]', error.message);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

/**
 * PATCH /job-notifications/:notificationId/dismiss
 * Dismiss a notification
 */
router.patch('/:notificationId/dismiss', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const { rows: existing } = await pool.query(`
            SELECT id FROM job_notifications WHERE id = $1 AND worker_id = $2
        `, [notificationId, userId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await dismissNotification(notificationId);

        res.json({
            success: true,
            message: 'Notification dismissed'
        });
    } catch (error) {
        console.error('[Dismiss Error]', error.message);
        res.status(500).json({ error: 'Failed to dismiss notification' });
    }
});

/**
 * GET /notification-preferences
 * Get notification preferences for authenticated user
 */
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        let { rows } = await pool.query(`
            SELECT * FROM notification_preferences WHERE user_id = $1
        `, [userId]);

        // If no preferences exist, create default ones
        if (rows.length === 0) {
            const { rows: created } = await pool.query(`
                INSERT INTO notification_preferences (user_id)
                VALUES ($1)
                RETURNING *
            `, [userId]);
            rows = created;
        }

        res.json({
            success: true,
            preferences: rows[0]
        });
    } catch (error) {
        console.error('[Get Preferences Error]', error.message);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

/**
 * PUT /notification-preferences
 * Update notification preferences
 * Body: { email_job_alerts, in_app_job_alerts, email_frequency, digest_day_of_week, digest_time_preference }
 */
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            email_job_alerts,
            in_app_job_alerts,
            email_frequency,
            digest_day_of_week,
            digest_time_preference
        } = req.body;

        // Check if preferences exist
        const { rows: existing } = await pool.query(`
            SELECT id FROM notification_preferences WHERE user_id = $1
        `, [userId]);

        let result;

        if (existing.length === 0) {
            // Create new preferences
            result = await pool.query(`
                INSERT INTO notification_preferences (
                    user_id,
                    email_job_alerts,
                    in_app_job_alerts,
                    email_frequency,
                    digest_day_of_week,
                    digest_time_preference
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                userId,
                email_job_alerts !== undefined ? email_job_alerts : true,
                in_app_job_alerts !== undefined ? in_app_job_alerts : true,
                email_frequency || 'immediate',
                digest_day_of_week || 'monday',
                digest_time_preference || '09:00'
            ]);
        } else {
            // Update existing preferences
            const updates = [];
            const values = [userId];
            let paramCount = 2;

            if (email_job_alerts !== undefined) {
                updates.push(`email_job_alerts = $${paramCount++}`);
                values.push(email_job_alerts);
            }
            if (in_app_job_alerts !== undefined) {
                updates.push(`in_app_job_alerts = $${paramCount++}`);
                values.push(in_app_job_alerts);
            }
            if (email_frequency !== undefined) {
                updates.push(`email_frequency = $${paramCount++}`);
                values.push(email_frequency);
            }
            if (digest_day_of_week !== undefined) {
                updates.push(`digest_day_of_week = $${paramCount++}`);
                values.push(digest_day_of_week);
            }
            if (digest_time_preference !== undefined) {
                updates.push(`digest_time_preference = $${paramCount++}`);
                values.push(digest_time_preference);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            updates.push(`updated_at = CURRENT_TIMESTAMP`);

            result = await pool.query(`
                UPDATE notification_preferences
                SET ${updates.join(', ')}
                WHERE user_id = $1
                RETURNING *
            `, values);
        }

        res.json({
            success: true,
            preferences: result.rows[0]
        });
    } catch (error) {
        console.error('[Update Preferences Error]', error.message);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

module.exports = router;
