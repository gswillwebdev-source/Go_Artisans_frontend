const axios = require('axios').default;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    setToken(token) {
        if (token) {
            this.client.defaults.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Auth endpoints
    async register(data) {
        return this.client.post('/api/auth/register', data);
    }

    async login(data) {
        return this.client.post('/api/auth/login', data);
    }

    // Jobs endpoints
    async getJobs(limit = 20, offset = 0) {
        return this.client.get(`/api/jobs?limit=${limit}&offset=${offset}`);
    }

    async getJobById(id) {
        return this.client.get(`/api/jobs/${id}`);
    }

    async searchJobs(filters) {
        const params = new URLSearchParams();
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.location) params.append('location', filters.location);
        if (filters.jobType) params.append('jobType', filters.jobType);
        return this.client.get(`/api/jobs/search?${params.toString()}`);
    }

    async createJob(data) {
        return this.client.post('/api/jobs', data);
    }

    // Applications endpoints
    async applyForJob(jobId, data) {
        return this.client.post('/api/applications', { jobId, ...data });
    }

    async getMyApplications() {
        return this.client.get('/api/applications/my-applications');
    }

    // Users endpoints
    async getUserProfile() {
        return this.client.get('/api/users/profile');
    }

    async updateUserProfile(data) {
        return this.client.put('/api/users/profile', data);
    }
}

export default new ApiClient();
