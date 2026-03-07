import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgofshosxvunqbbycwyq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})

// Database helper functions
export const db = {
    // Auth functions
    auth: {
        signUp: async (email, password, userData) => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            })
            return { data, error }
        },

        signIn: async (email, password) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            return { data, error }
        },

        signOut: async () => {
            const { error } = await supabase.auth.signOut()
            return { error }
        },

        getUser: async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            return { user, error }
        },

        onAuthStateChange: (callback) => {
            return supabase.auth.onAuthStateChange(callback)
        }
    },

    // Users functions
    users: {
        getAll: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id,email,first_name,last_name,phone_number,user_type,is_worker,rating,completed_jobs,job_title,location,bio,created_at')
                .order('created_at', { ascending: false })
            return { data, error }
        },

        getById: async (id) => {
            const { data, error } = await supabase
                .from('users')
                .select('id,email,first_name,last_name,phone_number,user_type,is_worker,rating,completed_jobs,job_title,location,bio,portfolio,profile_picture,services,years_experience,created_at')
                .eq('id', id)
                .single()
            return { data, error }
        },

        update: async (id, updates) => {
            const { data, error } = await supabase
                .from('users')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()
            return { data, error }
        },

        delete: async (id) => {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id)
            return { error }
        }
    },

    // Jobs functions
    jobs: {
        getAll: async (limit = 20, offset = 0, filters = {}) => {
            let query = supabase
                .from('jobs')
                .select(`
                    id,title,description,budget,location,job_type,salary,status,client_id,created_at,
                    users!jobs_posted_by_fkey (
                        first_name,
                        last_name,
                        email
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            if (filters.keyword) {
                query = query.ilike('title', `%${filters.keyword}%`)
            }
            if (filters.location) {
                query = query.ilike('location', `%${filters.location}%`)
            }
            if (filters.jobType) {
                query = query.eq('job_type', filters.jobType)
            }

            const { data, error } = await query
            return { data, error }
        },

        getById: async (id) => {
            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    id,title,description,budget,location,job_type,salary,status,client_id,created_at,updated_at,
                    users!jobs_posted_by_fkey (
                        id,
                        first_name,
                        last_name,
                        email,
                        phone_number,
                        rating
                    )
                `)
                .eq('id', id)
                .single()
            return { data, error }
        },

        create: async (jobData) => {
            const { data, error } = await supabase
                .from('jobs')
                .insert([jobData])
                .select()
                .single()
            return { data, error }
        },

        update: async (id, updates) => {
            const { data, error } = await supabase
                .from('jobs')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single()
            return { data, error }
        },

        delete: async (id) => {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', id)
            return { error }
        }
    },

    // Applications functions
    applications: {
        getAll: async (userId = null) => {
            let query = supabase
                .from('applications')
                .select(`
          *,
          jobs (
            title,
            location,
            job_type,
            salary
          ),
          users (
            first_name,
            last_name,
            email
          )
        `)
                .order('created_at', { ascending: false })

            if (userId) {
                query = query.eq('user_id', userId)
            }

            const { data, error } = await query
            return { data, error }
        },

        getByJobId: async (jobId) => {
            const { data, error } = await supabase
                .from('applications')
                .select(`
          *,
          users (
            first_name,
            last_name,
            email,
            phone_number
          )
        `)
                .eq('job_id', jobId)
                .order('created_at', { ascending: false })
            return { data, error }
        },

        create: async (applicationData) => {
            const { data, error } = await supabase
                .from('applications')
                .insert([applicationData])
                .select()
                .single()
            return { data, error }
        },

        update: async (id, updates) => {
            const { data, error } = await supabase
                .from('applications')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            return { data, error }
        }
    },

    // Reviews/Ratings functions
    reviews: {
        getAll: async () => {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey (
            first_name,
            last_name
          ),
          reviewee:users!reviews_reviewee_id_fkey (
            first_name,
            last_name
          )
        `)
                .order('created_at', { ascending: false })
            return { data, error }
        },

        getByUserId: async (userId) => {
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
                .order('created_at', { ascending: false })
            return { data, error }
        },

        create: async (reviewData) => {
            const { data, error } = await supabase
                .from('reviews')
                .insert([reviewData])
                .select()
                .single()
            return { data, error }
        }
    }
}