const pool = require('../config/database');

// Mark job as completed (worker initiates)
const requestCompletion = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.user.id;

        // Verify job exists
        const jobCheck = await pool.query(
            'SELECT id FROM jobs WHERE id = $1',
            [jobId]
        );

        if (jobCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Verify worker has accepted application for this job
        const appCheck = await pool.query(
            `SELECT a.id, j.posted_by as client_id FROM applications a
             JOIN jobs j ON a.job_id = j.id
             WHERE a.job_id = $1 AND a.user_id = $2 AND a.status = 'accepted'`,
            [jobId, workerId]
        );

        if (appCheck.rows.length === 0) {
            // Check if worker even has an application at all (for better error message)
            const anyApp = await pool.query(
                'SELECT status FROM applications WHERE job_id = $1 AND user_id = $2',
                [jobId, workerId]
            );

            if (anyApp.rows.length === 0) {
                return res.status(403).json({ error: 'You have not applied for this job' });
            } else {
                return res.status(403).json({ error: `Your application status is '${anyApp.rows[0].status}'. Only workers with accepted applications can mark jobs as completed.` });
            }
        }

        const clientId = appCheck.rows[0].client_id;

        // Check if completion already requested
        const existingCompletion = await pool.query(
            `SELECT id FROM job_completions WHERE job_id = $1 AND worker_id = $2 AND status IN ('pending', 'confirmed')`,
            [jobId, workerId]
        );

        if (existingCompletion.rows.length > 0) {
            return res.status(400).json({ error: 'Completion already requested for this job' });
        }

        // Create completion request
        const result = await pool.query(
            `INSERT INTO job_completions (job_id, worker_id, client_id, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [jobId, workerId, clientId]
        );

        // Update job status
        await pool.query(
            `UPDATE jobs SET completion_status = 'pending' WHERE id = $1`,
            [jobId]
        );

        // Create notification for client
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, related_job_id, related_completion_id)
             VALUES ($1, 'completion_request', 'Job Completion Request', 'A worker has marked a job as completed. Please review and confirm.', $2, $3)`,
            [clientId, jobId, result.rows[0].id]
        );

        res.json({
            message: 'Completion request sent',
            completion: result.rows[0]
        });
    } catch (err) {
        console.error('Error requesting completion:', err);
        res.status(500).json({ error: 'Failed to request completion' });
    }
};

// Get completion status for a job
const getCompletionStatus = async (req, res) => {
    try {
        const { jobId } = req.params;

        const result = await pool.query(
            'SELECT * FROM job_completions WHERE job_id = $1 ORDER BY created_at DESC LIMIT 1',
            [jobId]
        );

        if (result.rows.length === 0) {
            return res.json({ status: 'not_requested' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting completion status:', err);
        res.status(500).json({ error: 'Failed to get completion status' });
    }
};

// Confirm job completion (client accepts)
const confirmCompletion = async (req, res) => {
    try {
        const { completionId } = req.params;
        const clientId = req.user.id;

        // Verify client owns this completion
        const completionCheck = await pool.query(
            'SELECT * FROM job_completions WHERE id = $1 AND client_id = $2',
            [completionId, clientId]
        );

        if (completionCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to confirm this completion' });
        }

        const completion = completionCheck.rows[0];

        // Update completion status
        const result = await pool.query(
            `UPDATE job_completions SET status = 'confirmed', completed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [completionId]
        );

        // Update job status
        await pool.query(
            `UPDATE jobs SET completion_status = 'completed' WHERE id = $1`,
            [completion.job_id]
        );

        // Increment worker's completed_jobs count
        await pool.query(
            `UPDATE users SET completed_jobs = (completed_jobs + 1) WHERE id = $1`,
            [completion.worker_id]
        );

        // Create notification for worker (job is confirmed as completed)
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, related_job_id, related_completion_id)
             VALUES ($1, 'completion_confirmed', 'Job Completed', 'Client has confirmed the job completion. Please rate the client.', $2, $3)`,
            [completion.worker_id, completion.job_id, completionId]
        );

        res.json({
            message: 'Job completion confirmed',
            completion: result.rows[0]
        });
    } catch (err) {
        console.error('Error confirming completion:', err);
        res.status(500).json({ error: 'Failed to confirm completion' });
    }
};

// Decline job completion (client declines)
const declineCompletion = async (req, res) => {
    try {
        const { completionId } = req.params;
        const { reason } = req.body;
        const clientId = req.user.id;

        // Verify client owns this completion
        const completionCheck = await pool.query(
            'SELECT * FROM job_completions WHERE id = $1 AND client_id = $2',
            [completionId, clientId]
        );

        if (completionCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to decline this completion' });
        }

        const completion = completionCheck.rows[0];

        // Update completion status with reason
        const result = await pool.query(
            `UPDATE job_completions SET status = 'declined', reason_for_decline = $1 WHERE id = $2 RETURNING *`,
            [reason, completionId]
        );

        // Job returns to pending status (not completed)
        await pool.query(
            `UPDATE jobs SET completion_status = 'active' WHERE id = $1`,
            [completion.job_id]
        );

        // Create notification for worker (completion declined)
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, related_job_id, related_completion_id)
             VALUES ($1, 'completion_declined', 'Job Completion Declined', 'Client has declined the job completion. Reason: ' || $2, $3, $4)`,
            [completion.worker_id, reason, completion.job_id, completionId]
        );

        res.json({
            message: 'Job completion declined',
            completion: result.rows[0]
        });
    } catch (err) {
        console.error('Error declining completion:', err);
        res.status(500).json({ error: 'Failed to decline completion' });
    }
};

// Submit rating (only clients can rate workers)
const submitRating = async (req, res) => {
    try {
        const { completionId } = req.params;
        const { rating, review } = req.body;
        const raterId = req.user.id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Get completion details
        const completion = await pool.query(
            'SELECT * FROM job_completions WHERE id = $1',
            [completionId]
        );

        if (completion.rows.length === 0) {
            return res.status(404).json({ error: 'Completion not found' });
        }

        const comp = completion.rows[0];

        // Only clients can rate workers
        if (raterId !== comp.client_id) {
            return res.status(403).json({ error: 'Only clients can rate workers' });
        }

        const workerId = comp.worker_id;

        // Check if already rated
        const existingRating = await pool.query(
            'SELECT * FROM ratings WHERE job_completion_id = $1 AND rater_id = $2',
            [completionId, raterId]
        );

        if (existingRating.rows.length > 0) {
            return res.status(400).json({ error: 'You have already rated this completion' });
        }

        // Insert rating
        const result = await pool.query(
            `INSERT INTO ratings (job_completion_id, rater_id, ratee_id, rating, review)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [completionId, raterId, workerId, rating, review]
        );

        // Update worker's average rating
        const workerRatings = await pool.query(
            'SELECT AVG(rating) as avg, COUNT(*) as total FROM ratings WHERE ratee_id = $1',
            [workerId]
        );

        const avgRating = parseFloat(workerRatings.rows[0].avg) || 0;
        const totalRatings = parseInt(workerRatings.rows[0].total) || 0;

        await pool.query(
            'UPDATE users SET average_rating = $1, total_ratings = $2, worker_rating = $1, worker_rating_count = $2 WHERE id = $3',
            [avgRating.toFixed(2), totalRatings, workerId]
        );

        // Mark completion as fully done
        await pool.query(
            `UPDATE job_completions SET status = 'completed_and_rated' WHERE id = $1`,
            [completionId]
        );

        res.json({
            message: 'Rating submitted successfully',
            rating: result.rows[0]
        });
    } catch (err) {
        console.error('Error submitting rating:', err);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
};

// Get worker ratings (from clients)
const getWorkerRatings = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT r.*, 
                    u.first_name, u.last_name, u.profile_picture,
                    j.title as job_title
             FROM ratings r
             JOIN users u ON r.rater_id = u.id
             JOIN job_completions jc ON r.job_completion_id = jc.id
             JOIN jobs j ON jc.job_id = j.id
             WHERE r.ratee_id = $1
             ORDER BY r.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error getting worker ratings:', err);
        res.status(500).json({ error: 'Failed to get ratings' });
    }
};

// Get ratings for a user (backward compatibility)
const getUserRatings = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT r.*, 
                    u.first_name, u.last_name, u.profile_picture,
                    j.title as job_title
             FROM ratings r
             JOIN users u ON r.rater_id = u.id
             JOIN job_completions jc ON r.job_completion_id = jc.id
             JOIN jobs j ON jc.job_id = j.id
             WHERE r.ratee_id = $1
             ORDER BY r.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error getting user ratings:', err);
        res.status(500).json({ error: 'Failed to get ratings' });
    }
};

// Get notifications for user
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;

        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error getting notifications:', err);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Check if user has rated in a completion
const hasUserRated = async (req, res) => {
    try {
        const { completionId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT * FROM ratings WHERE job_completion_id = $1 AND rater_id = $2',
            [completionId, userId]
        );

        res.json({
            hasRated: result.rows.length > 0,
            rating: result.rows.length > 0 ? result.rows[0] : null
        });
    } catch (err) {
        console.error('Error checking rating:', err);
        res.status(500).json({ error: 'Failed to check rating' });
    }
};

module.exports = {
    requestCompletion,
    getCompletionStatus,
    confirmCompletion,
    declineCompletion,
    submitRating,
    getUserRatings,
    getWorkerRatings,
    getNotifications,
    markNotificationRead,
    hasUserRated
};
