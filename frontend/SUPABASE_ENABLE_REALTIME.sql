-- ============================================================================
-- ENABLE SUPABASE REALTIME FOR NOTIFICATIONS
-- ============================================================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Required for real-time push notifications to work on the frontend
-- ============================================================================

-- 1. Enable REPLICA IDENTITY FULL on both notification tables
--    (Required so Realtime can filter rows by column values)
ALTER TABLE public.job_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Add both tables to the supabase_realtime publication
--    Safe to rerun: only adds tables that are not already present
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
		AND schemaname = 'public'
		AND tablename = 'job_notifications'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.job_notifications;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
		AND schemaname = 'public'
		AND tablename = 'notifications'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
	END IF;
END $$;

-- ============================================================================
-- VERIFY (optional — run these to confirm)
-- ============================================================================
-- Check which tables are in the publication:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this SQL:
-- • When a new job matching a worker's alert is posted → the worker's browser
--   receives a real-time push instantly (no 30s wait)
-- • When someone follows a user → the followed user's browser receives a
--   real-time push instantly
-- • The 30-second polling remains as a fallback for reliability
-- ============================================================================
