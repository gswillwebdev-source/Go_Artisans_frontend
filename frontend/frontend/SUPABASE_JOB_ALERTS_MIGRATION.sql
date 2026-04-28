-- ============================================================================
-- JOB ALERTS SYSTEM - Supabase Native Implementation
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor
--
-- What this does:
--  1. Creates tables for job_alerts, job_notifications, notification_preferences
--  2. Creates RLS policies for security
--  3. Creates SQL functions for job matching
--  4. Creates triggers for automatic notification creation
--
-- ============================================================================

-- 1. Create job_alerts table
CREATE TABLE IF NOT EXISTS public.job_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,

    -- Search criteria
    skills JSONB DEFAULT '[]'::jsonb,
    location VARCHAR(255),
    min_budget VARCHAR(100),
    max_budget VARCHAR(100),

    -- Notification settings
    notification_frequency VARCHAR(50) DEFAULT 'immediate',
    is_active BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create job_notifications table
CREATE TABLE IF NOT EXISTS public.job_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    job_alert_id UUID REFERENCES public.job_alerts(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,

    status VARCHAR(50) DEFAULT 'new',
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(worker_id, job_id)
);

-- 3. Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

    email_job_alerts BOOLEAN DEFAULT true,
    in_app_job_alerts BOOLEAN DEFAULT true,
    email_frequency VARCHAR(50) DEFAULT 'immediate',
    digest_day_of_week VARCHAR(20) DEFAULT 'monday',
    digest_time_preference VARCHAR(10) DEFAULT '09:00',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_job_alerts_worker_active ON public.job_alerts(worker_id, is_active);
CREATE INDEX IF NOT EXISTS idx_job_notifications_worker_status ON public.job_notifications(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_job_notifications_email_sent ON public.job_notifications(email_sent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_notifications_job_id ON public.job_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_skills ON public.job_alerts USING GIN(skills);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Authorization
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- job_alerts RLS: Workers can only manage their own alerts
CREATE POLICY "Workers can view their own job alerts"
    ON public.job_alerts
    FOR SELECT
    USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create job alerts"
    ON public.job_alerts
    FOR INSERT
    WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update their own job alerts"
    ON public.job_alerts
    FOR UPDATE
    USING (auth.uid() = worker_id)
    WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can delete their own job alerts"
    ON public.job_alerts
    FOR DELETE
    USING (auth.uid() = worker_id);

-- job_notifications RLS: Workers can only see their own notifications
CREATE POLICY "Workers can view their own job notifications"
    ON public.job_notifications
    FOR SELECT
    USING (auth.uid() = worker_id);

CREATE POLICY "Workers can update their own notifications"
    ON public.job_notifications
    FOR UPDATE
    USING (auth.uid() = worker_id)
    WITH CHECK (auth.uid() = worker_id);

-- notification_preferences RLS: Users can only manage their own preferences
CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
    ON public.notification_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.notification_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SQL FUNCTION: Job Matching Algorithm
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_job_to_alerts(
    p_job_id UUID,
    p_job_title TEXT,
    p_job_description TEXT,
    p_job_location TEXT,
    p_job_budget TEXT
)
RETURNS TABLE (
    alert_id UUID,
    worker_id UUID,
    alert_name VARCHAR,
    notification_frequency VARCHAR,
    email_notifications BOOLEAN,
    in_app_notifications BOOLEAN,
    match_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ja.id,
        ja.worker_id,
        ja.name,
        ja.notification_frequency,
        ja.email_notifications,
        ja.in_app_notifications,
        CASE
            -- Primary: Skill matching (70% weight)
            WHEN (
                (p_job_title ILIKE ANY(SELECT jsonb_array_elements_text(ja.skills)))
                OR (p_job_description ILIKE ANY(SELECT jsonb_array_elements_text(ja.skills)))
                OR (p_job_title ILIKE '%' || u.job_title || '%')
                OR (p_job_description ILIKE '%' || u.job_title || '%')
            )
            THEN 70.0
            -- Secondary: Location matching (20% weight)
            ELSE CASE
                WHEN ja.location IS NOT NULL AND p_job_location ILIKE '%' || ja.location || '%'
                THEN 20.0
                ELSE 0.0
            END
        END::FLOAT as match_score
    FROM public.job_alerts ja
    JOIN public.users u ON ja.worker_id = u.id
    WHERE ja.is_active = true
    AND match_score > 0
    ORDER BY match_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-create notifications when job is posted
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_job_create_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notifications for all matching alerts
    INSERT INTO public.job_notifications (worker_id, job_alert_id, job_id, status, email_sent)
    SELECT
        alert_id,
        alert_id,
        NEW.id,
        'new',
        false
    FROM public.match_job_to_alerts(
        NEW.id,
        NEW.title,
        NEW.description,
        NEW.location,
        NEW.budget
    ) m
    ON CONFLICT (worker_id, job_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_job_create_notifications ON public.jobs;

CREATE TRIGGER on_new_job_create_notifications
    AFTER INSERT ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_job_create_notifications();

-- ============================================================================
-- HELPER FUNCTIONS FOR FRONTEND
-- ============================================================================

-- Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.job_notifications
        WHERE worker_id = auth.uid()
        AND status = 'new'
    );
END;
$$ LANGUAGE plpgsql;

-- Mark notification as viewed
CREATE OR REPLACE FUNCTION public.mark_notification_viewed(p_notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.job_notifications
    SET status = 'viewed', viewed_at = CURRENT_TIMESTAMP
    WHERE id = p_notification_id AND worker_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Dismiss notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(p_notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.job_notifications
    SET status = 'dismissed'
    WHERE id = p_notification_id AND worker_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Get or create notification preferences
CREATE OR REPLACE FUNCTION public.ensure_notification_preferences()
RETURNS public.notification_preferences AS $$
DECLARE
    v_prefs public.notification_preferences;
BEGIN
    SELECT * INTO v_prefs
    FROM public.notification_preferences
    WHERE user_id = auth.uid();

    IF v_prefs IS NULL THEN
        INSERT INTO public.notification_preferences (user_id)
        VALUES (auth.uid())
        RETURNING * INTO v_prefs;
    END IF;

    RETURN v_prefs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.match_job_to_alerts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_viewed TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_notification_preferences TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Job Alerts System installed successfully!' as status;
