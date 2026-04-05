-- ============================================================================
-- RESET PASSWORD SYSTEM MIGRATION  (Supabase-native approach)
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor.
--
-- What this does:
--  1. Adds last_password_reset_at column to public.users
--  2. Creates check_password_reset_eligibility() RPC — called by the frontend
--     before triggering Supabase's built-in reset email. Checks:
--       • user must exist in public.users
--       • user must not have reset in the last 14 days
--  3. Creates a Postgres trigger on auth.users that automatically sets
--     last_password_reset_at = NOW() whenever a user's password changes.
--     This is 100% server-side — it cannot be bypassed by the client.
--
-- Supabase Dashboard — set these after running the migration:
--   Auth → Settings → "Email OTP Expiry"  → 1800  (30 minutes)
--   Auth → URL Configuration → Redirect URLs → add https://goartisans.online/reset-password
-- ============================================================================

-- 1. Add last_password_reset_at to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_password_reset_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. RPC: check if a user is eligible for a password reset
--    Callable by anonymous and authenticated users.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_password_reset_eligibility(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, last_password_reset_at
    INTO v_user
    FROM public.users
   WHERE email = lower(trim(p_email));

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'error', 'User does not exist in our database'
    );
  END IF;

  IF v_user.last_password_reset_at IS NOT NULL
     AND v_user.last_password_reset_at > NOW() - INTERVAL '14 days' THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'error', format(
        'You can only reset your password once every 2 weeks. You can reset again after %s.',
        to_char(v_user.last_password_reset_at + INTERVAL '14 days', 'Month DD, YYYY')
      )
    );
  END IF;

  RETURN jsonb_build_object('eligible', true);
END;
$$;

-- Allow both anonymous and authenticated users to invoke this function
GRANT EXECUTE ON FUNCTION public.check_password_reset_eligibility(TEXT) TO anon, authenticated;

-- ============================================================================
-- 3. Trigger: automatically record password reset timestamp on auth.users change
--    Fires server-side whenever encrypted_password is updated — cannot be
--    manipulated by the client.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_password_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE public.users
       SET last_password_reset_at = NOW()
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to avoid duplicates
DROP TRIGGER IF EXISTS on_auth_user_password_change ON auth.users;

CREATE TRIGGER on_auth_user_password_change
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password)
  EXECUTE FUNCTION public.handle_auth_password_change();
