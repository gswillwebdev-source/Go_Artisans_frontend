const express = require('express');
const router = express.Router();
const { getJobs, getJobById, createJob, updateJob, deleteJob, searchJobs, getMyJobs } = require('../controllers/jobController');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// IMPORTANT: Order matters! Specific routes before dynamic routes
router.get('/search', searchJobs);  // Must come before /:id
router.get('/my-jobs', authenticateToken, getMyJobs);  // Must come before /:id
router.get('/saved/all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT j.*, s.created_at as saved_at
             FROM saved_jobs s
             JOIN jobs j ON s.job_id = j.id
             WHERE s.user_id = $1
             ORDER BY s.created_at DESC`,
            [userId]
        );
        res.json({ jobs: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch saved jobs' });
    }
});
router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', authenticateToken, createJob);
router.post('/:jobId/save', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;

        // Check if job exists
        const jobResult = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Check if already saved
        const existingSave = await pool.query(
            'SELECT id FROM saved_jobs WHERE job_id = $1 AND user_id = $2',
            [jobId, userId]
        );

        if (existingSave.rows.length > 0) {
            return res.status(400).json({ error: 'Job already saved' });
        }

        // Save job
        await pool.query(
            'INSERT INTO saved_jobs (job_id, user_id) VALUES ($1, $2)',
            [jobId, userId]
        );

        res.json({ message: 'Job saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save job' });
    }
});
router.put('/:id', authenticateToken, updateJob);
router.delete('/:id', authenticateToken, deleteJob);
router.delete('/:jobId/save', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;

        const result = await pool.query(
            'DELETE FROM saved_jobs WHERE job_id = $1 AND user_id = $2',
            [jobId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Saved job not found' });
        }

        res.json({ message: 'Job unsaved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to unsave job' });
    }
});

module.exports = router;
