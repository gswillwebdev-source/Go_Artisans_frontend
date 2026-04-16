const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Check if user is admin
        if (!user.is_admin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                isAdmin: user.is_admin
            }
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        // Get total workers
        const workersResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE user_type = $1',
            ['worker']
        );
        const totalWorkers = parseInt(workersResult.rows[0].count);

        // Get total clients
        const clientsResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE user_type = $1',
            ['client']
        );
        const totalClients = parseInt(clientsResult.rows[0].count);

        // Get total jobs
        const jobsResult = await pool.query(
            'SELECT COUNT(*) as count FROM jobs'
        );
        const totalJobs = parseInt(jobsResult.rows[0].count);

        // Get pending verifications (unverified emails)
        const pendingResult = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE email_verified = false AND user_type IS NOT NULL'
        );
        const pendingVerifications = parseInt(pendingResult.rows[0].count);

        res.json({
            totalWorkers,
            totalClients,
            totalJobs,
            pendingVerifications
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const { userType, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, email, first_name, last_name, phone_number, user_type, 
                   email_verified, is_suspended, suspension_reason, created_at
            FROM users
            WHERE id != $1
        `;
        let params = [req.user.id];

        if (userType && userType !== 'all') {
            query += ` AND user_type = $${params.length + 1}`;
            params.push(userType);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM users WHERE id != $1';
        let countParams = [req.user.id];

        if (userType && userType !== 'all') {
            countQuery += ` AND user_type = $${countParams.length + 1}`;
            countParams.push(userType);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalUsers = parseInt(countResult.rows[0].count);

        res.json({
            users: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const updateVerificationStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { emailVerified } = req.body;

        if (typeof emailVerified !== 'boolean') {
            return res.status(400).json({ error: 'emailVerified must be a boolean' });
        }

        const result = await pool.query(
            'UPDATE users SET email_verified = $1, email_verification_code = NULL, verification_code_expires_at = NULL WHERE id = $2 RETURNING *',
            [emailVerified, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: `User email verification status updated to ${emailVerified}`,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating verification status:', err);
        res.status(500).json({ error: 'Failed to update verification status' });
    }
};

const suspendUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Suspension reason is required' });
        }

        const result = await pool.query(
            'UPDATE users SET is_suspended = true, suspension_reason = $1 WHERE id = $2 RETURNING *',
            [reason, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User suspended successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error suspending user:', err);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
};

const unsuspendUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            'UPDATE users SET is_suspended = false, suspension_reason = NULL WHERE id = $1 RETURNING *',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User unsuspended successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error unsuspending user:', err);
        res.status(500).json({ error: 'Failed to unsuspend user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent deleting other admins
        const userResult = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (userResult.rows[0].is_admin) {
            return res.status(403).json({ error: 'Cannot delete admin users' });
        }

        // Delete user applications first (foreign key constraint)
        await pool.query('DELETE FROM applications WHERE user_id = $1', [userId]);

        // Delete user saved jobs
        await pool.query('DELETE FROM saved_jobs WHERE user_id = $1', [userId]);

        // Delete user jobs
        await pool.query('DELETE FROM jobs WHERE posted_by = $1', [userId]);

        // Delete user
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING *',
            [userId]
        );

        res.json({
            message: 'User deleted successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

const addUser = async (req, res) => {
    try {
        const { email, firstName, lastName, phoneNumber, userType, password } = req.body;

        // Validate required fields
        if (!email || !firstName || !lastName || !userType || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate user type
        if (!['worker', 'client'].includes(userType)) {
            return res.status(400).json({ error: 'Invalid user type. Must be worker or client' });
        }

        // Check if email already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, phone_number, user_type, email_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email, first_name, last_name, phone_number, user_type, email_verified`,
            [email, hashedPassword, firstName, lastName, phoneNumber || '', userType, true]
        );

        res.status(201).json({
            message: 'User created successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Get all reviews with optional filtering
const getAllReviews = async (req, res) => {
    try {
        const { workerId, raterId, page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' } = req.query;
        const offset = (page - 1) * limit;

        // Validate sort and order parameters
        const validSortFields = ['rating', 'created_at', 'id'];
        const validOrders = ['ASC', 'DESC'];

        if (!validSortFields.includes(sortBy)) {
            return res.status(400).json({ error: 'Invalid sort field' });
        }

        if (!validOrders.includes(order.toUpperCase())) {
            return res.status(400).json({ error: 'Invalid order' });
        }

        let query = `
            SELECT r.*, 
                   u_rater.first_name as rater_first_name, 
                   u_rater.last_name as rater_last_name,
                   u_ratee.first_name as ratee_first_name, 
                   u_ratee.last_name as ratee_last_name,
                   j.title as job_title
            FROM ratings r
            JOIN users u_rater ON r.rater_id = u_rater.id
            JOIN users u_ratee ON r.ratee_id = u_ratee.id
            JOIN job_completions jc ON r.job_completion_id = jc.id
            JOIN jobs j ON jc.job_id = j.id
            WHERE 1=1
        `;

        let params = [];

        if (workerId) {
            params.push(workerId);
            query += ` AND r.ratee_id = $${params.length}`;
        }

        if (raterId) {
            params.push(raterId);
            query += ` AND r.rater_id = $${params.length}`;
        }

        query += ` ORDER BY r.${sortBy} ${order.toUpperCase()} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as count FROM ratings r
            WHERE 1=1
        `;
        let countParams = [];

        if (workerId) {
            countParams.push(workerId);
            countQuery += ` AND r.ratee_id = $${countParams.length}`;
        }

        if (raterId) {
            countParams.push(raterId);
            countQuery += ` AND r.rater_id = $${countParams.length}`;
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalReviews = parseInt(countResult.rows[0].count);

        res.json({
            reviews: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalReviews / limit),
                totalReviews,
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

// Update a review (admin can edit rating and review text)
const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, review } = req.body;

        // Validate rating if provided
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Get the current review to check worker
        const currentReview = await pool.query(
            'SELECT * FROM ratings WHERE id = $1',
            [reviewId]
        );

        if (currentReview.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const oldRating = currentReview.rows[0].rating;
        const workerId = currentReview.rows[0].ratee_id;

        // Update the review
        const updateQuery = [];
        const updateParams = [];
        const updateFields = [];

        if (rating !== undefined) {
            updateFields.push('rating = $' + (updateParams.length + 1));
            updateParams.push(rating);
        }

        if (review !== undefined) {
            updateFields.push('review = $' + (updateParams.length + 1));
            updateParams.push(review);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'At least one field is required to update' });
        }

        updateParams.push(reviewId);
        const result = await pool.query(
            `UPDATE ratings SET ${updateFields.join(', ')} WHERE id = $${updateParams.length} RETURNING *`,
            updateParams
        );

        // If rating was changed, update worker's average rating
        if (rating !== undefined && rating !== oldRating) {
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
        }

        res.json({
            message: 'Review updated successfully',
            review: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating review:', err);
        res.status(500).json({ error: 'Failed to update review' });
    }
};

// Delete a review (admin can delete)
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        // Get the review to get worker ID
        const reviewResult = await pool.query(
            'SELECT * FROM ratings WHERE id = $1',
            [reviewId]
        );

        if (reviewResult.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const review = reviewResult.rows[0];
        const workerId = review.ratee_id;

        // Delete the review
        await pool.query(
            'DELETE FROM ratings WHERE id = $1',
            [reviewId]
        );

        // Recalculate worker's average rating
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

        res.json({
            message: 'Review deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting review:', err);
        res.status(500).json({ error: 'Failed to delete review' });
    }
};

// Update admin password
const updateAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const adminId = req.user.id;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        // Get admin user
        const adminResult = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND is_admin = true',
            [adminId]
        );

        if (adminResult.rows.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const admin = adminResult.rows[0];

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email, first_name, last_name',
            [hashedPassword, adminId]
        );

        res.json({
            message: 'Password updated successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating admin password:', err);
        res.status(500).json({ error: 'Failed to update password' });
    }
};

module.exports = {
    adminLogin,
    getDashboardStats,
    getAllUsers,
    updateVerificationStatus,
    suspendUser,
    unsuspendUser,
    deleteUser,
    addUser,
    getAllReviews,
    updateReview,
    deleteReview,
    updateAdminPassword
};
