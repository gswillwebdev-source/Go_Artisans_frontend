const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, phone_number, user_type, created_at, is_worker, job_title, location, bio, years_experience, services, portfolio, profile_picture FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                userType: user.user_type,
                createdAt: user.created_at,
                isWorker: user.is_worker,
                jobTitle: user.job_title,
                location: user.location,
                bio: user.bio,
                yearsExperience: user.years_experience,
                services: user.services || [],
                portfolio: user.portfolio || [],
                profilePicture: user.profile_picture
            }
        });
    } catch (err) {
        console.error('Failed to fetch profile:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Worker public profile by id
router.get('/worker/:id', async (req, res) => {
    try {
        const workerId = parseInt(req.params.id, 10);
        if (isNaN(workerId)) return res.status(400).json({ error: 'Invalid worker id' });

        const result = await pool.query(
            'SELECT id, email, first_name, last_name, phone_number, user_type, created_at, is_worker, job_title, location, rating, years_experience, services, completed_jobs, bio, portfolio, profile_picture FROM users WHERE id = $1',
            [workerId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Worker not found' });

        const worker = result.rows[0];

        // fetch reviews
        const reviewsRes = await pool.query(
            `SELECT r.id, r.rating, r.comment, r.created_at, c.id AS client_id, c.first_name AS client_first_name, c.last_name AS client_last_name
             FROM reviews r
             LEFT JOIN users c ON r.client_id = c.id
             WHERE r.worker_id = $1
             ORDER BY r.created_at DESC`,
            [workerId]
        );

        const reviews = reviewsRes.rows || [];

        // compute average if not set
        let avgRating = parseFloat(worker.rating) || 0;
        if ((!avgRating || avgRating === 0) && reviews.length > 0) {
            const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
            avgRating = +(sum / reviews.length).toFixed(2);
        }

        res.json({
            worker: {
                id: worker.id,
                email: worker.email,
                firstName: worker.first_name,
                lastName: worker.last_name,
                phoneNumber: worker.phone_number,
                isWorker: worker.is_worker,
                jobTitle: worker.job_title,
                location: worker.location,
                rating: avgRating,
                yearsExperience: worker.years_experience,
                services: worker.services || [],
                completedJobs: worker.completed_jobs || 0,
                bio: worker.bio || '',
                createdAt: worker.created_at,
                portfolio: worker.portfolio || [],
                profilePicture: worker.profile_picture,
                reviews
            }
        });
    } catch (err) {
        console.error('Failed to fetch worker profile:', err);
        res.status(500).json({ error: 'Failed to fetch worker profile' });
    }
});

router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, phoneNumber, isWorker, jobTitle, location, bio, yearsExperience, services, portfolio, profilePicture } = req.body;

        const result = await pool.query(
            `UPDATE users SET 
                first_name = $1, 
                last_name = $2, 
                phone_number = $3,
                is_worker = COALESCE($4, is_worker),
                job_title = COALESCE($5, job_title),
                location = COALESCE($6, location),
                bio = COALESCE($7, bio),
                years_experience = COALESCE($8, years_experience),
                services = COALESCE($9, services),
                portfolio = COALESCE($10, portfolio),
                profile_picture = COALESCE($11, profile_picture)
            WHERE id = $12 
            RETURNING id, email, first_name, last_name, phone_number, user_type, created_at, is_worker, job_title, location, bio, years_experience, services, portfolio, profile_picture`,
            [firstName, lastName, phoneNumber, isWorker, jobTitle, location, bio, yearsExperience, services ? JSON.stringify(services) : null, portfolio ? JSON.stringify(portfolio) : null, profilePicture, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                userType: user.user_type,
                createdAt: user.created_at,
                isWorker: user.is_worker,
                jobTitle: user.job_title,
                location: user.location,
                bio: user.bio,
                yearsExperience: user.years_experience,
                services: user.services || [],
                portfolio: user.portfolio || [],
                profilePicture: user.profile_picture
            }
        });
    } catch (err) {
        console.error('Failed to update profile:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Search workers by job title, location, and job type
router.get('/search/workers', async (req, res) => {
    try {
        const { keyword, location, jobType } = req.query;
        let query = `SELECT id, first_name, last_name, email, phone_number, user_type, is_worker, 
                     job_title, location, bio, years_experience, services, completed_jobs, rating, 
                     profile_picture FROM users WHERE user_type = 'worker' AND 1=1`;
        const params = [];

        if (keyword) {
            query += ' AND (job_title ILIKE $' + (params.length + 1) + ' OR bio ILIKE $' + (params.length + 1) + ')';
            params.push('%' + keyword + '%');
        }
        if (location) {
            query += ' AND location ILIKE $' + (params.length + 1);
            params.push('%' + location + '%');
        }
        if (jobType) {
            query += ' AND services::text ILIKE $' + (params.length + 1);
            params.push('%' + jobType + '%');
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);

        const workers = result.rows.map(worker => ({
            id: worker.id,
            firstName: worker.first_name,
            lastName: worker.last_name,
            email: worker.email,
            phoneNumber: worker.phone_number,
            userType: worker.user_type,
            isWorker: worker.is_worker,
            jobTitle: worker.job_title,
            location: worker.location,
            bio: worker.bio || '',
            yearsExperience: worker.years_experience || 0,
            services: worker.services || [],
            completedJobs: worker.completed_jobs || 0,
            rating: worker.rating || 0,
            profilePicture: worker.profile_picture
        }));

        res.json({ workers });
    } catch (err) {
        console.error('Failed to search workers:', err);
        res.status(500).json({ error: 'Failed to search workers' });
    }
});

module.exports = router;
