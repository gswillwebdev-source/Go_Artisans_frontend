import apiClient from './apiClient';

const completionClient = {
    // Request job completion (worker marks as done)
    async requestCompletion(jobId) {
        const response = await apiClient.post(`/api/completion/jobs/${jobId}/request-completion`);
        return response.data;
    },

    // Get completion status for a job
    async getCompletionStatus(jobId) {
        const response = await apiClient.get(`/api/completion/jobs/${jobId}/completion-status`);
        return response.data;
    },

    // Confirm job completion (client accepts)
    async confirmCompletion(completionId) {
        const response = await apiClient.patch(`/api/completion/completions/${completionId}/confirm`);
        return response.data;
    },

    // Decline job completion (client declines with reason)
    async declineCompletion(completionId, reason) {
        const response = await apiClient.patch(
            `/api/completion/completions/${completionId}/decline`,
            { reason }
        );
        return response.data;
    },

    // Submit rating for another user
    async submitRating(completionId, rating, review = '') {
        const response = await apiClient.post(`/api/completion/completions/${completionId}/rate`, {
            rating,
            review
        });
        return response.data;
    },

    // Check if current user has already rated
    async hasUserRated(completionId) {
        const response = await apiClient.get(`/api/completion/completions/${completionId}/has-rated`);
        return response.data;
    },

    // Get all ratings for a user
    async getUserRatings(userId) {
        const response = await apiClient.get(`/api/completion/users/${userId}/ratings`);
        return response.data;
    },

    // Get worker ratings (from clients)
    async getWorkerRatings(userId) {
        const response = await apiClient.get(`/api/completion/users/${userId}/ratings/worker`);
        return response.data;
    },

    // Get current user's notifications
    async getNotifications(limit = 50) {
        const response = await apiClient.get(`/api/completion/notifications?limit=${limit}`);
        return response.data;
    },

    // Mark notification as read
    async markNotificationRead(notificationId) {
        const response = await apiClient.patch(`/api/completion/notifications/${notificationId}/read`);
        return response.data;
    }
};

export default completionClient;
