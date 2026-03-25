const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /job-alerts
 * Get all job alerts for the authenticated worker
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows: alerts } = await pool.query(`
            SELECT
                id,
                name,
                skills,
                location,
                min_budget,
                max_budget,
                notification_frequency,
                is_active,
                email_notifications,
                in_app_notifications,
                created_at,
                updated_at
            FROM job_alerts
            WHERE worker_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        res.json({
            success: true,
            alerts: alerts,
            count: alerts.length
        });
    } catch (error) {
        console.error('[Get Alerts Error]', error.message);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

/**
 * GET /job-alerts/:alertId
 * Get a specific job alert
 */
router.get('/:alertId', authenticateToken, async (req, res) => {
    try {
        const { alertId } = req.params;
        const userId = req.user.id;

        const { rows } = await pool.query(`
            SELECT *
            FROM job_alerts
            WHERE id = $1 AND worker_id = $2
        `, [alertId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({
            success: true,
            alert: rows[0]
        });
    } catch (error) {
        console.error('[Get Alert Error]', error.message);
        res.status(500).json({ error: 'Failed to fetch alert' });
    }
});

/**
 * POST /job-alerts
 * Create a new job alert
 * Body: { name, skills, location, min_budget, max_budget, notification_frequency, email_notifications, in_app_notifications }
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            skills,
            location,
            min_budget,
            max_budget,
            notification_frequency = 'immediate',
            email_notifications = true,
            in_app_notifications = true
        } = req.body;

        // Validation
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Alert name is required' });
        }

        const { rows } = await pool.query(`
            INSERT INTO job_alerts (
                worker_id,
                name,
                skills,
                location,
                min_budget,
                max_budget,
                notification_frequency,
                email_notifications,
                in_app_notifications
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            userId,
            name.trim(),
            JSON.stringify(skills || []),
            location || null,
            min_budget || null,
            max_budget || null,
            notification_frequency,
            email_notifications,
            in_app_notifications
        ]);

        res.status(201).json({
            success: true,
            alert: rows[0]
        });
    } catch (error) {
        console.error('[Create Alert Error]', error.message);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

/**
 * PUT /job-alerts/:alertId
 * Update a job alert
 */
router.put('/:alertId', authenticateToken, async (req, res) => {
    try {
        const { alertId } = req.params;
        const userId = req.user.id;
        const {
            name,
            skills,
            location,
            min_budget,
            max_budget,
            notification_frequency,
            email_notifications,
            in_app_notifications
        } = req.body;

        // Check ownership
        const { rows: existing } = await pool.query(`
            SELECT id FROM job_alerts WHERE id = $1 AND worker_id = $2
        `, [alertId, userId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [alertId, userId];
        let paramCount = 3;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (skills !== undefined) {
            updates.push(`skills = $${paramCount++}`);
            values.push(JSON.stringify(skills));
        }
        if (location !== undefined) {
            updates.push(`location = $${paramCount++}`);
            values.push(location);
        }
        if (min_budget !== undefined) {
            updates.push(`min_budget = $${paramCount++}`);
            values.push(min_budget);
        }
        if (max_budget !== undefined) {
            updates.push(`max_budget = $${paramCount++}`);
            values.push(max_budget);
        }
        if (notification_frequency !== undefined) {
            updates.push(`notification_frequency = $${paramCount++}`);
            values.push(notification_frequency);
        }
        if (email_notifications !== undefined) {
            updates.push(`email_notifications = $${paramCount++}`);
            values.push(email_notifications);
        }
        if (in_app_notifications !== undefined) {
            updates.push(`in_app_notifications = $${paramCount++}`);
            values.push(in_app_notifications);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        const { rows } = await pool.query(`
            UPDATE job_alerts
            SET ${updates.join(', ')}
            WHERE id = $1 AND worker_id = $2
            RETURNING *
        `, values);

        res.json({
            success: true,
            alert: rows[0]
        });
    } catch (error) {
        console.error('[Update Alert Error]', error.message);
        res.status(500).json({ error: 'Failed to update alert' });
    }
});

/**
 * DELETE /job-alerts/:alertId
 * Delete a job alert
 */
router.delete('/:alertId', authenticateToken, async (req, res) => {
    try {
        const { alertId } = req.params;
        const userId = req.user.id;

        const { rows } = await pool.query(`
            DELETE FROM job_alerts
            WHERE id = $1 AND worker_id = $2
            RETURNING id
        `, [alertId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({
            success: true,
            message: 'Alert deleted successfully'
        });
    } catch (error) {
        console.error('[Delete Alert Error]', error.message);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

/**
 * PATCH /job-alerts/:alertId/toggle
 * Toggle alert active status
 */
router.patch('/:alertId/toggle', authenticateToken, async (req, res) => {
    try {
        const { alertId } = req.params;
        const userId = req.user.id;

        const { rows } = await pool.query(`
            UPDATE job_alerts
            SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND worker_id = $2
            RETURNING *
        `, [alertId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({
            success: true,
            alert: rows[0]
        });
    } catch (error) {
        console.error('[Toggle Alert Error]', error.message);
        res.status(500).json({ error: 'Failed to toggle alert' });
    }
});

module.exports = router;
