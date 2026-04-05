-- ============================================================================
-- COMPLETE JOB SEEKING APP DATABASE SCHEMA FOR SUPABASE
-- ============================================================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- This will create all tables, indexes, RLS policies, and triggers
-- ============================================================================

-- Drop existing tables if they exist (OPTIONAL - only if you want to reset)
-- Uncomment the lines below if you want to DROP and recreate everything
-- DROP TABLE IF EXISTS public.reviews CASCADE;
-- DROP TABLE IF EXISTS public.completions CASCADE;
-- DROP TABLE IF EXISTS public.applications CASCADE;
-- DROP TABLE IF EXISTS public.jobs CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    user_type VARCHAR(50), -- 'client' or 'worker'
    job_title VARCHAR(150),
    location VARCHAR(255),
    bio TEXT,
    years_experience INTEGER DEFAULT 0,
    services JSONB DEFAULT '[]'::jsonb, -- Array of service strings
    portfolio JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
    completed_jobs INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true, -- Worker availability status (true = ready for work)
    profile_picture TEXT, -- URL or path to profile picture
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget VARCHAR(100),
    location VARCHAR(255),
    category VARCHAR(100), -- job category/type (NOT job_type)
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'completed'
    proposed_price VARCHAR(100),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(job_id, worker_id) -- Prevent duplicate applications
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    rater_type VARCHAR(50) NOT NULL, -- 'client' or 'worker'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create completions table (for tracking job completion)
CREATE TABLE IF NOT EXISTS public.completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    final_price VARCHAR(100),
    completion_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'confirmed', 'declined'
    confirmed_at TIMESTAMP WITH TIME ZONE, -- When client confirmed completion
    declined_at TIMESTAMP WITH TIME ZONE, -- When client declined completion
    decline_reason TEXT, -- Reason for declining completion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON public.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker_id ON public.applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON public.reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_completions_job_id ON public.completions(job_id);
CREATE INDEX IF NOT EXISTS idx_completions_worker_id ON public.completions(worker_id);
CREATE INDEX IF NOT EXISTS idx_completions_client_id ON public.completions(client_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR USERS TABLE
-- ============================================================================

-- Drop existing policies if needed (uncomment if you get "already exists" errors)
-- DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
-- DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
-- DROP POLICY IF EXISTS "Public can view worker profiles" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow public read access for worker profiles (for browsing)
CREATE POLICY "Public can view worker profiles" ON public.users
    FOR SELECT USING (user_type = 'worker');

-- ============================================================================
-- RLS POLICIES FOR JOBS TABLE
-- ============================================================================

-- DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
-- DROP POLICY IF EXISTS "Clients can view their own jobs" ON public.jobs;
-- DROP POLICY IF EXISTS "Clients can create jobs" ON public.jobs;
-- DROP POLICY IF EXISTS "Clients can update their own jobs" ON public.jobs;

CREATE POLICY "Anyone can view active jobs" ON public.jobs
    FOR SELECT USING (status = 'active');

CREATE POLICY "Clients can view their own jobs" ON public.jobs
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can create jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own jobs" ON public.jobs
    FOR UPDATE USING (auth.uid() = client_id);

-- ============================================================================
-- RLS POLICIES FOR APPLICATIONS TABLE
-- ============================================================================

-- DROP POLICY IF EXISTS "Workers can view applications they created" ON public.applications;
-- DROP POLICY IF EXISTS "Clients can view applications for their jobs" ON public.applications;
-- DROP POLICY IF EXISTS "Workers can create applications" ON public.applications;
-- DROP POLICY IF EXISTS "Clients can update application status for their jobs" ON public.applications;

CREATE POLICY "Workers can view applications they created" ON public.applications
    FOR SELECT USING (auth.uid() = worker_id);

CREATE POLICY "Clients can view applications for their jobs" ON public.applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = applications.job_id
            AND jobs.client_id = auth.uid()
        )
    );

CREATE POLICY "Workers can create applications" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Clients can update application status for their jobs" ON public.applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = applications.job_id
            AND jobs.client_id = auth.uid()
        )
    );

-- ============================================================================
-- RLS POLICIES FOR REVIEWS TABLE
-- ============================================================================

-- DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
-- DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;

CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = worker_id);

-- ============================================================================
-- RLS POLICIES FOR COMPLETIONS TABLE
-- ============================================================================

-- DROP POLICY IF EXISTS "Clients and workers can view completions for their jobs" ON public.completions;
-- DROP POLICY IF EXISTS "Workers can request completion for accepted jobs" ON public.completions;
-- DROP POLICY IF EXISTS "Clients can update completions for their jobs" ON public.completions;

CREATE POLICY "Clients and workers can view completions for their jobs" ON public.completions
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = worker_id);

CREATE POLICY "Workers can request completion for accepted jobs" ON public.completions
    FOR INSERT WITH CHECK (
        auth.uid() = worker_id AND
        EXISTS (
            SELECT 1 FROM public.applications
            WHERE applications.job_id = completions.job_id
            AND applications.worker_id = auth.uid()
            AND applications.status = 'accepted'
        )
    );

CREATE POLICY "Clients can update completions for their jobs" ON public.completions
    FOR UPDATE USING (auth.uid() = client_id);

-- ============================================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
-- Drop existing triggers if needed (uncomment if you get "already exists" errors)
-- DROP TRIGGER IF EXISTS handle_users_updated_at ON public.users;
-- DROP TRIGGER IF EXISTS handle_jobs_updated_at ON public.jobs;
-- DROP TRIGGER IF EXISTS handle_applications_updated_at ON public.applications;

CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- All tables, indexes, RLS policies, functions, and triggers are now created.
--
-- KEY COLUMNS TO REMEMBER:
-- - jobs.category (NOT job_type)
-- - jobs.budget (NOT salary)
-- - jobs.client_id (NOT posted_by)
-- - users.profile_picture (TEXT)
-- - completions.confirmed_at, declined_at, decline_reason
--
-- ============================================================================
