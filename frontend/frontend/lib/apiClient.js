import { supabase, db } from './supabase';

class ApiClient {
    constructor() {
        this.supabase = supabase;
    }

    // Auth methods
    async register(data) {
        const { data: authData, error } = await db.auth.signUp(data.email, data.password, {
            data: {
                first_name: data.firstName,
                last_name: data.lastName,
                user_type: data.userType
            }
        });

        if (error) throw error;

        // Create user profile in database
        if (authData.user) {
            const { error: profileError } = await db.users.create({
                id: authData.user.id,
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                user_type: data.userType,
                phone_number: data.phoneNumber
            });

            if (profileError) {
                console.error('Error creating user profile:', profileError);
            }
        }

        return { data: authData };
    }

    async login(data) {
        return db.auth.signIn(data.email, data.password);
    }

    async updateUserRole(userType) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        return db.users.update(user.id, { user_type: userType });
    }

    // Jobs methods
    async getJobs(limit = 20, offset = 0) {
        return db.jobs.getAll(limit, offset);
    }

    async getJobById(id) {
        return db.jobs.getById(id);
    }

    async searchJobs(filters) {
        return db.jobs.getAll(20, 0, filters);
    }

    async createJob(jobData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        return db.jobs.create({
            ...jobData,
            posted_by: user.id
        });
    }

    async updateJob(id, updates) {
        return db.jobs.update(id, updates);
    }

    async deleteJob(id) {
        return db.jobs.delete(id);
    }

    // Applications methods
    async getApplications(userId = null) {
        return db.applications.getAll(userId);
    }

    async createApplication(applicationData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        return db.applications.create({
            ...applicationData,
            user_id: user.id
        });
    }

    async updateApplication(id, updates) {
        return db.applications.update(id, updates);
    }

    // Users methods
    async getUsers() {
        return db.users.getAll();
    }

    async getUserById(id) {
        return db.users.getById(id);
    }

    async updateUser(id, updates) {
        return db.users.update(id, updates);
    }

    async deleteUser(id) {
        return db.users.delete(id);
    }

    // Reviews methods
    async getReviews() {
        return db.reviews.getAll();
    }

    async getUserReviews(userId) {
        return db.reviews.getByUserId(userId);
    }

    async createReview(reviewData) {
        return db.reviews.create(reviewData);
    }

    // Legacy methods for backward compatibility
    setToken(token) {
        // Not needed with Supabase
    }

    async post(endpoint, data) {
        // Convert to Supabase calls based on endpoint
        throw new Error('Direct API calls not supported. Use specific methods.');
    }

    async get(endpoint) {
        // Convert to Supabase calls based on endpoint
        throw new Error('Direct API calls not supported. Use specific methods.');
    }

    async put(endpoint, data) {
        // Convert to Supabase calls based on endpoint
        throw new Error('Direct API calls not supported. Use specific methods.');
    }

    async patch(endpoint, data) {
        // Convert to Supabase calls based on endpoint
        throw new Error('Direct API calls not supported. Use specific methods.');
    }
}

const apiClient = new ApiClient();
export default apiClient;
