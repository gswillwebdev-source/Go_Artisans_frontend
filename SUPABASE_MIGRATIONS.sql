-- Supabase Migrations - Run these SQL commands in your Supabase SQL Editor
-- These migrations fix the schema mismatches causing 400 errors
-- Safe to re-run: all use IF NOT EXISTS / IF EXISTS guards

-- ── users table ──────────────────────────────────────────────────────────────

-- Migration 1: Add profile_picture column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Migration 2: Email verified flag
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Migration 3: Admin suspension columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Migration 4: Admin flag (used by backend role checks)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Migration 5: Backfill email_verified from auth.users (safe to skip if auth.users is not accessible)
UPDATE public.users u
SET email_verified = true
FROM auth.users au
WHERE au.id = u.id
  AND au.email_confirmed_at IS NOT NULL
  AND COALESCE(u.email_verified, false) = false;

-- ── completions table ─────────────────────────────────────────────────────────

-- Migration 6: Add confirmed_at column to completions table
ALTER TABLE public.completions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Migration 7: Add declined_at column to completions table
ALTER TABLE public.completions ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE;

-- Migration 8: Add decline_reason column to completions table
ALTER TABLE public.completions ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- ── jobs table ────────────────────────────────────────────────────────────────

-- Migration 9: Add media column to jobs table (pictures/videos as base64 JSONB array)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- ── saved_workers table ───────────────────────────────────────────────────────

-- Migration 10: Clients can bookmark / save workers they want to revisit
CREATE TABLE IF NOT EXISTS public.saved_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, worker_id)
);

-- Index for fast per-client lookups
CREATE INDEX IF NOT EXISTS idx_saved_workers_client_id ON public.saved_workers(client_id);

-- RLS: each user can only see/modify their own saved rows
ALTER TABLE public.saved_workers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_workers' AND policyname = 'saved_workers_select_own'
  ) THEN
    CREATE POLICY saved_workers_select_own ON public.saved_workers
      FOR SELECT USING (auth.uid() = client_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_workers' AND policyname = 'saved_workers_insert_own'
  ) THEN
    CREATE POLICY saved_workers_insert_own ON public.saved_workers
      FOR INSERT WITH CHECK (auth.uid() = client_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_workers' AND policyname = 'saved_workers_delete_own'
  ) THEN
    CREATE POLICY saved_workers_delete_own ON public.saved_workers
      FOR DELETE USING (auth.uid() = client_id);
  END IF;
END $$;

-- ── portfolio_views table ─────────────────────────────────────────────────────

-- Migration 11: Track which pro/premium clients viewed a worker's portfolio this month
-- Uses unique (viewer_id, worker_id, view_month) so revisiting same worker doesn't burn extra quota
CREATE TABLE IF NOT EXISTS public.portfolio_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    view_month TEXT NOT NULL, -- 'YYYY-MM' format
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (viewer_id, worker_id, view_month)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_viewer_id ON public.portfolio_views(viewer_id);

ALTER TABLE public.portfolio_views ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_views' AND policyname = 'portfolio_views_select_own'
  ) THEN
    CREATE POLICY portfolio_views_select_own ON public.portfolio_views
      FOR SELECT USING (auth.uid() = viewer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_views' AND policyname = 'portfolio_views_insert_own'
  ) THEN
    CREATE POLICY portfolio_views_insert_own ON public.portfolio_views
      FOR INSERT WITH CHECK (auth.uid() = viewer_id);
  END IF;
END $$;

-- ── Verify (run to confirm schema is up to date) ──────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'completions' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs' ORDER BY ordinal_position;
