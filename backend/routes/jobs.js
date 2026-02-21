const express = require('express');
const router = express.Router();
const { getJobs, getJobById, createJob, updateJob, deleteJob, searchJobs } = require('../controllers/jobController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', getJobs);
router.get('/search', searchJobs);
router.get('/:id', getJobById);
router.post('/', authenticateToken, createJob);
router.put('/:id', authenticateToken, updateJob);
router.delete('/:id', authenticateToken, deleteJob);

module.exports = router;
