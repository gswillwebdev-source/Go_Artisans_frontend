import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Jobs API
export async function getJobs(filter?: any) {
    try {
        const response = await apiClient.get('/jobs', { params: filter });
        return response.data;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        throw error;
    }
}

export async function getJobById(id: string) {
    try {
        const response = await apiClient.get(`/jobs/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching job:', error);
        throw error;
    }
}

// Applications API
export async function submitApplication(jobId: string, data: any) {
    try {
        const response = await apiClient.post(`/jobs/${jobId}/apply`, data);
        return response.data;
    } catch (error) {
        console.error('Error submitting application:', error);
        throw error;
    }
}

export async function getUserApplications() {
    try {
        const response = await apiClient.get('/applications');
        return response.data;
    } catch (error) {
        console.error('Error fetching applications:', error);
        throw error;
    }
}

export default apiClient;
