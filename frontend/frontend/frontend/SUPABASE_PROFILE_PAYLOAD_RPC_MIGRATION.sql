-- ============================================================================
-- SUPABASE PROFILE PAYLOAD RPC MIGRATION (PHASE 2)
-- ============================================================================
-- Goal:
-- - Return all data required by client/worker dashboard pages in one request.
-- - Reduce startup round-trips while still loading full page data up front.
--
-- Safe to run multiple times (uses CREATE OR REPLACE FUNCTION).
-- Run in Supabase SQL Editor.
-- ============================================================================

-- Ensure required profile field exists for RPC payload shape compatibility.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_client_profile_payload()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_uid uuid;
    v_profile jsonb;
    v_jobs jsonb;
    v_completions jsonb;
    v_applications jsonb;
BEGIN
    v_uid := auth.uid();

    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT to_jsonb(u)
    INTO v_profile
    FROM (
        SELECT
            id,
            email,
            first_name,
            last_name,
            phone_number,
            location,
            bio,
            portfolio,
            profile_picture,
            rating,
            user_type,
            email_verified,
            completed_jobs,
            created_at,
            updated_at
        FROM public.users
        WHERE id = v_uid
        LIMIT 1
    ) AS u;

    SELECT COALESCE(jsonb_agg(j ORDER BY j.created_at DESC), '[]'::jsonb)
    INTO v_jobs
    FROM (
        SELECT
            id,
            title,
            description,
            budget,
            location,
            status,
            category,
            client_id,
            created_at,
            updated_at
        FROM public.jobs
        WHERE client_id = v_uid
    ) AS j;

    SELECT COALESCE(jsonb_agg(c ORDER BY c.created_at DESC), '[]'::jsonb)
    INTO v_completions
    FROM (
        SELECT
            id,
            job_id,
            status,
            worker_id,
            confirmed_at,
            declined_at,
            decline_reason,
            created_at
        FROM public.completions
        WHERE client_id = v_uid
    ) AS c;

    SELECT COALESCE(jsonb_agg(a ORDER BY a.created_at DESC), '[]'::jsonb)
    INTO v_applications
    FROM (
        SELECT
            app.id,
            app.job_id,
            app.worker_id,
            app.status,
            app.proposed_price,
            app.message,
            app.created_at,
            jsonb_build_object(
                'id', w.id,
                'first_name', w.first_name,
                'last_name', w.last_name,
                'email', w.email,
                'phone_number', w.phone_number
            ) AS worker
        FROM public.applications app
        JOIN public.jobs j ON j.id = app.job_id
        AND j.client_id = v_uid
        JOIN public.users w ON w.id = app.worker_id
    ) AS a;

    RETURN jsonb_build_object(
        'profile', v_profile,
        'jobs', v_jobs,
        'completions', v_completions,
        -- Keep key for backward compatibility, but avoid extra query cost.
        'reviews', '[]'::jsonb,
        'applications', v_applications
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_worker_profile_payload()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_uid uuid;
    v_profile jsonb;
    v_applications jsonb;
    v_reviews jsonb;
BEGIN
    v_uid := auth.uid();

    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT to_jsonb(u)
    INTO v_profile
    FROM (
        SELECT
            id,
            email,
            first_name,
            last_name,
            phone_number,
            job_title,
            location,
            bio,
            years_experience,
            portfolio,
            services,
            profile_picture,
            rating,
            user_type,
            email_verified,
            completed_jobs,
            is_active,
            created_at,
            updated_at
        FROM public.users
        WHERE id = v_uid
        LIMIT 1
    ) AS u;

    SELECT COALESCE(jsonb_agg(a ORDER BY a.created_at DESC), '[]'::jsonb)
    INTO v_applications
    FROM (
        SELECT
            app.id,
            app.job_id,
            app.status,
            app.proposed_price,
            app.message,
            app.created_at,
            jsonb_build_object(
                'id', j.id,
                'title', j.title,
                'description', j.description,
                'budget', j.budget,
                'location', j.location,
                'status', j.status,
                'client_id', j.client_id,
                'created_at', j.created_at
            ) AS job
        FROM public.applications app
        LEFT JOIN public.jobs j ON j.id = app.job_id
        WHERE app.worker_id = v_uid
    ) AS a;

    SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO v_reviews
    FROM (
        SELECT
            id,
            rating,
            comment,
            created_at,
            rater_type,
            client_id
        FROM public.reviews
        WHERE worker_id = v_uid
          AND rater_type = 'client'
    ) AS r;

    RETURN jsonb_build_object(
        'profile', v_profile,
        'applications', v_applications,
        'reviews', v_reviews,
        -- Keep key for backward compatibility, but avoid extra query cost.
        'active_jobs', '[]'::jsonb
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_profile_payload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_worker_profile_payload() TO authenticated;

-- ============================================================================
-- Optional checks:
-- IMPORTANT: In SQL Editor there is no end-user JWT by default, so auth.uid() is NULL.
-- To test manually in SQL Editor, set a temporary claim first:
-- SELECT set_config('request.jwt.claim.sub', '<REAL_USER_UUID>', true);
-- SELECT public.get_client_profile_payload();
-- SELECT public.get_worker_profile_payload();
--
-- Reset after testing:
-- SELECT set_config('request.jwt.claim.sub', '', true);
-- ============================================================================
