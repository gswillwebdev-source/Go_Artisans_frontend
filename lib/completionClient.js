import { supabase } from './supabase';

const completionClient = {
    // Request job completion (worker marks as done)
    async requestCompletion(jobId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Check if completion already exists
        const { data: existing } = await supabase
            .from('completions')
            .select('id')
            .eq('job_id', jobId)
            .single();

        if (existing) {
            throw new Error('Completion already requested');
        }

        const { data, error } = await supabase
            .from('completions')
            .insert([{
                job_id: jobId,
                worker_id: user.id,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Get completion status for a job
    async getCompletionStatus(jobId) {
        const { data, error } = await supabase
            .from('completions')
            .select('*')
            .eq('job_id', jobId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        return data;
    },

    // Confirm job completion (client accepts)
    async confirmCompletion(completionId) {
        const { data, error } = await supabase
            .from('completions')
            .update({
                status: 'confirmed',
                confirmed_at: new Date().toISOString()
            })
            .eq('id', completionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Decline job completion (client declines with reason)
    async declineCompletion(completionId, reason) {
        const { data, error } = await supabase
            .from('completions')
            .update({
                status: 'declined',
                decline_reason: reason,
                declined_at: new Date().toISOString()
            })
            .eq('id', completionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Submit rating for another user
    async submitRating(completionId, rating, review = '') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get completion details to know who to rate
        const { data: completion, error: completionError } = await supabase
            .from('completions')
            .select('*, jobs(*)')
            .eq('id', completionId)
            .single();

        if (completionError) throw completionError;

        // Determine who is rating whom
        const reviewerId = user.id;
        const revieweeId = completion.jobs.posted_by === user.id ? completion.worker_id : completion.jobs.posted_by;

        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                reviewer_id: reviewerId,
                reviewee_id: revieweeId,
                completion_id: completionId,
                rating,
                review
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Check if current user has already rated
    async hasUserRated(completionId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from('reviews')
            .select('id')
            .eq('completion_id', completionId)
            .eq('reviewer_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        return !!data;
    },

    // Get all ratings for a user
    async getUserRatings(userId) {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                reviewer:users!reviews_reviewer_id_fkey (
                    first_name,
                    last_name
                )
            `)
            .eq('reviewee_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Get worker ratings (from clients)
    async getWorkerRatings(userId) {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                reviewer:users!reviews_reviewer_id_fkey (
                    first_name,
                    last_name
                ),
                completions (
                    jobs (
                        title
                    )
                )
            `)
            .eq('reviewee_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Get current user's notifications (simplified - would need a notifications table)
    async getNotifications(limit = 50) {
        // This would need a notifications table in Supabase
        // For now, return empty array
        return [];
    },

    // Mark notification as read (simplified)
    async markNotificationRead(notificationId) {
        // This would need a notifications table in Supabase
        // For now, do nothing
        return { success: true };
    }
};

export default completionClient;
