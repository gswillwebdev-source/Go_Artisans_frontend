const pool = require('../config/database');

const getJobs = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const result = await pool.query(
            'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        res.json({ jobs: result.rows, total: result.rows.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
};

const getJobById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
};

const searchJobs = async (req, res) => {
    try {
        const { keyword, location, jobType } = req.query;
        let query = 'SELECT * FROM jobs WHERE 1=1';
        const params = [];

        if (keyword) {
            query += ' AND (title ILIKE $' + (params.length + 1) + ' OR description ILIKE $' + (params.length + 1) + ')';
            params.push('%' + keyword + '%');
        }
        if (location) {
            query += ' AND location ILIKE $' + (params.length + 1);
            params.push('%' + location + '%');
        }
        if (jobType) {
            query += ' AND job_type = $' + (params.length + 1);
            params.push(jobType);
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json({ jobs: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
};

const createJob = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, location, jobType, salary } = req.body;
        const result = await pool.query(
            'INSERT INTO jobs (title, description, location, job_type, salary, posted_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, description, location, jobType, salary, userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create job' });
    }
};

const updateJob = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, location, jobType, salary } = req.body;
        const result = await pool.query(
            'UPDATE jobs SET title = $1, description = $2, location = $3, job_type = $4, salary = $5 WHERE id = $6 RETURNING *',
            [title, description, location, jobType, salary, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update job' });
    }
};

const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ message: 'Job deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete job' });
    }
};

const getMyJobs = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT * FROM jobs WHERE posted_by = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json({ jobs: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch your jobs' });
    }
};

module.exports = { getJobs, getJobById, createJob, updateJob, deleteJob, searchJobs, getMyJobs };
