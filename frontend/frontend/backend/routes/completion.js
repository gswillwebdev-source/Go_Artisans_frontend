const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
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
} = require('../controllers/completionController');

// Job completion routes (protected - require authentication)
router.post('/jobs/:jobId/request-completion', authenticateToken, requestCompletion);
router.get('/jobs/:jobId/completion-status', getCompletionStatus);
router.patch('/completions/:completionId/confirm', authenticateToken, confirmCompletion);
router.patch('/completions/:completionId/decline', authenticateToken, declineCompletion);

// Rating routes
router.post('/completions/:completionId/rate', authenticateToken, submitRating);
router.get('/completions/:completionId/has-rated', authenticateToken, hasUserRated);
router.get('/users/:userId/ratings', getUserRatings);
router.get('/users/:userId/ratings/worker', getWorkerRatings);

// Notification routes
router.get('/notifications', authenticateToken, getNotifications);
router.patch('/notifications/:notificationId/read', authenticateToken, markNotificationRead);

module.exports = router;
