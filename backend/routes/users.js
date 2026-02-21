const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/profile', authenticateToken, (req, res) => {
    res.json({ message: 'User profile endpoint' });
});

router.put('/profile', authenticateToken, (req, res) => {
    res.json({ message: 'Update user profile endpoint' });
});

module.exports = router;
