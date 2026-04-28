-- ============================================================
-- Delete User Account RPC Function
-- Run this in your Supabase SQL Editor
-- ============================================================
-- This function allows an authenticated user to permanently
-- delete their own account and all associated data.
-- Called from the mobile app via: supabase.rpc('delete_user_account')
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- Get the calling user's ID from the auth context
    _user_id := auth.uid();

    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete job notifications related to this user's jobs or targeting this user
    DELETE FROM public.job_notifications
    WHERE worker_id = _user_id
       OR job_id IN (SELECT id FROM public.jobs WHERE client_id = _user_id);

    -- Delete job alerts
    DELETE FROM public.job_alerts
    WHERE user_id = _user_id;

    -- Delete notification_preferences / notifications
    DELETE FROM public.notifications
    WHERE user_id = _user_id
       OR actor_id = _user_id;

    -- Delete follow relationships
    DELETE FROM public.follows
    WHERE follower_id = _user_id OR following_id = _user_id;

    -- Delete update notices
    DELETE FROM public.update_notices
    WHERE user_id = _user_id;

    -- Delete email logs
    DELETE FROM public.email_logs
    WHERE user_id = _user_id;

    -- Delete chat messages sent or received by this user
    DELETE FROM public.chat_messages
    WHERE sender_id = _user_id OR receiver_id = _user_id;

    -- Delete reviews given or received
    DELETE FROM public.reviews
    WHERE worker_id = _user_id OR client_id = _user_id;

    -- Delete job completions involving this user
    DELETE FROM public.completions
    WHERE worker_id = _user_id OR client_id = _user_id;

    -- Delete applications by this user
    DELETE FROM public.applications
    WHERE worker_id = _user_id;

    -- Delete jobs posted by this user (cascades to applications/completions)
    DELETE FROM public.jobs
    WHERE client_id = _user_id;

    -- Delete the user's profile record
    DELETE FROM public.users
    WHERE id = _user_id;

    -- Delete the auth user (removes login credentials)
    DELETE FROM auth.users
    WHERE id = _user_id;
END;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
