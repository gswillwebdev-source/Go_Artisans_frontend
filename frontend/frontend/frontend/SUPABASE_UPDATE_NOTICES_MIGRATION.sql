-- ============================================================================
-- SUPABASE UPDATE NOTICES MIGRATION
-- ============================================================================
-- Goal:
-- - Let admins enable/disable a pre-deployment user notice.
-- - Expose a safe read RPC for clients and a protected write RPC for admins.
--
-- Safe to run multiple times.
-- Run in Supabase SQL Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.update_notices (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    message text NOT NULL DEFAULT '',
    is_enabled boolean NOT NULL DEFAULT false,
    starts_at timestamptz NULL,
    created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.update_notices (id, message, is_enabled)
VALUES (1, '', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_active_update_notice()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notice jsonb;
BEGIN
    SELECT to_jsonb(n)
    INTO v_notice
    FROM (
        SELECT
            id,
            message,
            is_enabled,
            starts_at,
            updated_at
        FROM public.update_notices
        WHERE id = 1
          AND is_enabled = true
          AND (starts_at IS NULL OR starts_at <= now())
        LIMIT 1
    ) AS n;

    RETURN v_notice;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_update_notice(
    p_message text,
    p_is_enabled boolean,
    p_starts_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid;
    v_notice jsonb;
BEGIN
    v_uid := auth.uid();

    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = v_uid
          AND u.user_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin only';
    END IF;

    INSERT INTO public.update_notices (
        id,
        message,
        is_enabled,
        starts_at,
        created_by,
        updated_at
    )
    VALUES (
        1,
        COALESCE(p_message, ''),
        COALESCE(p_is_enabled, false),
        p_starts_at,
        v_uid,
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        message = EXCLUDED.message,
        is_enabled = EXCLUDED.is_enabled,
        starts_at = EXCLUDED.starts_at,
        created_by = EXCLUDED.created_by,
        updated_at = now();

    SELECT to_jsonb(n)
    INTO v_notice
    FROM (
        SELECT
            id,
            message,
            is_enabled,
            starts_at,
            updated_at
        FROM public.update_notices
        WHERE id = 1
        LIMIT 1
    ) AS n;

    RETURN v_notice;
END;
$$;

REVOKE ALL ON TABLE public.update_notices FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_active_update_notice() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_update_notice(text, boolean, timestamptz) TO authenticated;

-- ============================================================================
-- Optional checks:
-- SELECT public.get_active_update_notice();
-- SELECT public.set_update_notice('Maintenance starts in 10 minutes.', true, now());
-- ============================================================================
