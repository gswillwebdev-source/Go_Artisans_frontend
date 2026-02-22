const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Create a new application
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { jobId } = req.body;

        if (!jobId) {
            return res.status(400).json({ error: 'Job ID is required' });
        }

        // Check if job exists
        const jobResult = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Check if already applied
        const existingApp = await pool.query(
            'SELECT id FROM applications WHERE job_id = $1 AND user_id = $2',
            [jobId, userId]
        );
        if (existingApp.rows.length > 0) {
            return res.status(400).json({ error: 'You have already applied for this job' });
        }

        // Create application
        const result = await pool.query(
            'INSERT INTO applications (job_id, user_id, status) VALUES ($1, $2, $3) RETURNING *',
            [jobId, userId, 'pending']
        );

        res.status(201).json({
            message: 'Application submitted successfully',
            application: result.rows[0]
        });
    } catch (err) {
        console.error('Failed to create application:', err);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// Get user's applications
router.get('/my-applications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT a.id, a.job_id, a.status, a.created_at, 
                    j.title, j.location, j.salary, j.job_type,
                    u.first_name, u.last_name
             FROM applications a
             JOIN jobs j ON a.job_id = j.id
             JOIN users u ON j.posted_by = u.id
             WHERE a.user_id = $1
             ORDER BY a.created_at DESC`,
            [userId]
        );

        res.json({ applications: result.rows });
    } catch (err) {
        console.error('Failed to fetch applications:', err);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Get application details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const appId = req.params.id;
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT a.*, j.title, j.description, j.location, j.salary, j.job_type,
                    u.first_name, u.last_name, u.email
             FROM applications a
             JOIN jobs j ON a.job_id = j.id
             JOIN users u ON j.posted_by = u.id
             WHERE a.id = $1 AND a.user_id = $2`,
            [appId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ application: result.rows[0] });
    } catch (err) {
        console.error('Failed to fetch application:', err);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
});

// Update application status (for job poster/client only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const appId = req.params.id;
        const userId = req.user.id;
        const { status } = req.body;

        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Verify user is the job poster
        const appResult = await pool.query(
            `SELECT a.*, j.posted_by FROM applications a
             JOIN jobs j ON a.job_id = j.id
             WHERE a.id = $1`,
            [appId]
        );

        if (appResult.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (appResult.rows[0].posted_by !== userId) {
            return res.status(403).json({ error: 'Not authorized to update this application' });
        }

        const result = await pool.query(
            'UPDATE applications SET status = $1 WHERE id = $2 RETURNING *',
            [status, appId]
        );

        res.json({
            message: 'Application updated successfully',
            application: result.rows[0]
        });
    } catch (err) {
        console.error('Failed to update application:', err);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

module.exports = router;
