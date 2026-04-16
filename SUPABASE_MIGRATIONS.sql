-- Supabase Migrations - Run these SQL commands in your Supabase SQL Editor
-- These migrations fix the schema mismatches causing 400 errors

-- Migration 1: Add profile_picture column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Migration 2: Add confirmed_at column to completions table
ALTER TABLE public.completions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Migration 3: Add declined_at column to completions table
ALTER TABLE public.completions ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE;

-- Migration 4: Add decline_reason column to completions table
ALTER TABLE public.completions ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Migration 5: Add media column to jobs table (pictures/videos as base64 JSONB array)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- Verify the migrations (optional - run to check the schema)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'completions' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs' ORDER BY ordinal_position;
