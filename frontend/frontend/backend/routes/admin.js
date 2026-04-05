const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');

// Middleware to check admin privileges
const checkAdmin = async (req, res, next) => {
    try {
        const pool = require('../config/database');
        const result = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (err) {
        res.status(500).json({ error: 'Failed to verify admin privileges' });
    }
};

// Admin login (no authentication required)
router.post('/login', admin.adminLogin);

// Protected admin routes
router.get('/dashboard/stats', authenticateToken, checkAdmin, admin.getDashboardStats);
router.get('/users', authenticateToken, checkAdmin, admin.getAllUsers);
router.patch('/users/:userId/verification', authenticateToken, checkAdmin, admin.updateVerificationStatus);
router.patch('/users/:userId/suspend', authenticateToken, checkAdmin, admin.suspendUser);
router.patch('/users/:userId/unsuspend', authenticateToken, checkAdmin, admin.unsuspendUser);
router.delete('/users/:userId', authenticateToken, checkAdmin, admin.deleteUser);
router.post('/users', authenticateToken, checkAdmin, admin.addUser);

// Review management routes (admin only)
router.get('/reviews', authenticateToken, checkAdmin, admin.getAllReviews);
router.patch('/reviews/:reviewId', authenticateToken, checkAdmin, admin.updateReview);
router.delete('/reviews/:reviewId', authenticateToken, checkAdmin, admin.deleteReview);

// Admin password update (admin only)
router.patch('/change-password', authenticateToken, checkAdmin, admin.updateAdminPassword);

module.exports = router;
