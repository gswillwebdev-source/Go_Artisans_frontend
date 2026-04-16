-- ============================================================================
-- FOLLOW/FOLLOWING SYSTEM - Supabase Migration
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- Creates tables for: follow relationships and notifications

-- ============================================================================
-- 1. Create notifications table (if it doesn't exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'follow', 'job_applied', 'job_completed', etc.
    related_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Who triggered the notification
    related_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL, -- Related job if applicable
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500), -- URL to navigate to when clicked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_user ON public.notifications(related_user_id);

-- ============================================================================
-- 2. Create follows table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'blocked', 'muted' (for future use)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Can't follow themselves
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),

    -- Constraint: One follow relationship per pair (can't follow same person twice)
    UNIQUE(follower_id, following_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_status ON public.follows(status);
CREATE INDEX IF NOT EXISTS idx_follows_created ON public.follows(created_at DESC);

-- ============================================================================
-- 3. Enable Row-Level Security (RLS) on follows table
-- ============================================================================
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own follows
CREATE POLICY "Users can view their own follows"
ON public.follows
FOR SELECT
USING (follower_id = auth.uid() OR following_id = auth.uid());

-- RLS Policy: Users can follow others (insert)
CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (
    follower_id = auth.uid()
    AND follower_id != following_id
);

-- RLS Policy: Users can unfollow (delete their own follows)
CREATE POLICY "Users can unfollow"
ON public.follows
FOR DELETE
USING (follower_id = auth.uid());

-- RLS Policy: Users can update their own follows
CREATE POLICY "Users can update their own follows"
ON public.follows
FOR UPDATE
USING (follower_id = auth.uid())
WITH CHECK (follower_id = auth.uid());

-- ============================================================================
-- 4. Enable Row-Level Security (RLS) on notifications table
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- 5. Create trigger to automatically create a notification when someone follows
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a notification for the user being followed
    INSERT INTO public.notifications (
        user_id,
        type,
        related_user_id,
        title,
        message,
        action_url,
        created_at
    ) VALUES (
        NEW.following_id,
        'follow',
        NEW.follower_id,
        'New Follower',
        (SELECT first_name || ' ' || last_name FROM public.users WHERE id = NEW.follower_id) || ' started following you',
        '/workers/' || NEW.follower_id::text,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new follows
DROP TRIGGER IF EXISTS trigger_notify_on_follow ON public.follows;
CREATE TRIGGER trigger_notify_on_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_follow();

-- ============================================================================
-- 6. Create helper functions
-- ============================================================================

-- Get follower count for a user
CREATE OR REPLACE FUNCTION public.get_follower_count(user_id UUID)
RETURNS INTEGER AS $$
SELECT COUNT(*)::INTEGER
FROM public.follows
WHERE following_id = user_id AND status = 'active'
$$ LANGUAGE SQL;

-- Get following count for a user
CREATE OR REPLACE FUNCTION public.get_following_count(user_id UUID)
RETURNS INTEGER AS $$
SELECT COUNT(*)::INTEGER
FROM public.follows
WHERE follower_id = user_id AND status = 'active'
$$ LANGUAGE SQL;

-- Check if user A follows user B
CREATE OR REPLACE FUNCTION public.is_following(follower_id UUID, following_id UUID)
RETURNS BOOLEAN AS $$
SELECT EXISTS(
    SELECT 1 FROM public.follows
    WHERE follower_id = $1 AND following_id = $2 AND status = 'active'
)
$$ LANGUAGE SQL;

-- Check if users are mutual followers
CREATE OR REPLACE FUNCTION public.is_mutual_follow(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
SELECT EXISTS(
    SELECT 1 FROM public.follows
    WHERE (follower_id = user_a AND following_id = user_b AND status = 'active')
) AND EXISTS(
    SELECT 1 FROM public.follows
    WHERE (follower_id = user_b AND following_id = user_a AND status = 'active')
)
$$ LANGUAGE SQL;

-- ============================================================================
-- 7. Test data (optional - remove for production)
-- ============================================================================
-- Uncomment below to add sample follows for testing
/*
-- Example: Create some sample follow relationships
-- NOTE: Replace UUIDs with actual user IDs from your database

INSERT INTO public.follows (follower_id, following_id, status)
VALUES
    -- ('worker-uuid-1', 'worker-uuid-2', 'active'),
    -- ('client-uuid-1', 'worker-uuid-1', 'active'),
    -- ('worker-uuid-2', 'client-uuid-1', 'active')
;
*/

-- ============================================================================
-- 8. Verify tables were created
-- ============================================================================
-- Run these queries to verify the migration was successful:
-- SELECT * FROM public.follows;
-- SELECT * FROM public.notifications;
-- SELECT public.get_follower_count('user-id-here'::UUID);
-- SELECT public.get_following_count('user-id-here'::UUID);
