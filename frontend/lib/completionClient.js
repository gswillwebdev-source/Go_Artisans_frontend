import { supabase } from './supabase';

const completionClient = {
    // Request job completion (worker marks as done)
    async requestCompletion(jobId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get client_id from the job first
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('client_id')
            .eq('id', jobId)
            .single();

        if (jobError) throw jobError;
        if (!job) throw new Error('Job not found');

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
                client_id: job.client_id,
                status: 'completed'
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
            .select('id,job_id,worker_id,status,confirmed_at,declined_at,decline_reason')
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

        // Get completion details including client_id
        const { data: completion, error: completionError } = await supabase
            .from('completions')
            .select('job_id,worker_id,client_id')
            .eq('id', completionId)
            .single();

        if (completionError) throw completionError;
        if (!completion) throw new Error('Completion not found');

        // Determine who is rating whom and their role
        const isClient = completion.client_id === user.id;
        const isWorker = completion.worker_id === user.id;

        if (!isClient && !isWorker) {
            throw new Error('Not authorized to rate this completion');
        }

        const raterType = isClient ? 'client' : 'worker';

        // Prepare rating data
        let ratingData = {
            job_id: completion.job_id,
            rating,
            comment: review,
            rater_type: raterType
        };

        if (isClient) {
            // Client is rating worker
            ratingData.client_id = user.id;
            ratingData.worker_id = completion.worker_id;
        } else {
            // Worker is rating client
            ratingData.worker_id = user.id;
            ratingData.client_id = completion.client_id;
        }

        const { data: insertedData, error: insertError } = await supabase
            .from('reviews')
            .insert([ratingData])
            .select()
            .single();

        if (insertError) throw insertError;
        return insertedData;
    },

    // Check if current user has already rated
    async hasUserRated(completionId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Get completion to know which job
        const { data: completion, error: compError } = await supabase
            .from('completions')
            .select('job_id')
            .eq('id', completionId)
            .single();

        if (compError) return false;

        const { data, error } = await supabase
            .from('reviews')
            .select('id')
            .eq('job_id', completion.job_id)
            .or(`worker_id.eq.${user.id},client_id.eq.${user.id}`)
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
                client:client_id (
                    first_name,
                    last_name
                ),
                worker:worker_id (
                    first_name,
                    last_name
                )
            `)
            .or(`client_id.eq.${userId},worker_id.eq.${userId}`)
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
                client:client_id (
                    first_name,
                    last_name
                ),
                jobs!reviews_job_id_fkey(title)
            `)
            .eq('worker_id', userId)
            .eq('rater_type', 'client')
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
