-- ============================================================================
-- SUPABASE EMAIL VERIFIED COLUMN SAFETY MIGRATION
-- ============================================================================
-- Purpose:
-- - Add users.email_verified when missing so RPC/profile queries do not fail.
-- - Keep schema backward-compatible and safe to re-run.
-- ============================================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Optional backfill: mark as verified for users whose auth email is confirmed.
-- Requires auth.users visibility in your Supabase project.
UPDATE public.users u
SET email_verified = true
FROM auth.users au
WHERE au.id = u.id
  AND au.email_confirmed_at IS NOT NULL
  AND COALESCE(u.email_verified, false) = false;

-- Ensure updated RPC functions (that select email_verified) are refreshed.
-- Run this after the column exists.
-- \i SUPABASE_PROFILE_PAYLOAD_RPC_MIGRATION.sql
