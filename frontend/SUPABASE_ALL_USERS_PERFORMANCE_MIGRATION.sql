-- ============================================================================
-- SUPABASE ALL USERS PERFORMANCE MIGRATION
-- ============================================================================
-- Goal:
-- - Speed up /api/all-users reads for tabs: all, workers, clients.
-- - Improve filtered ordering by created_at DESC.
-- - Improve ILIKE search on first_name/last_name/job_title/bio/location.
--
-- This migration is idempotent and safe to run multiple times.
-- No application logic is changed.
-- ============================================================================

-- Optional but recommended for ILIKE acceleration.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast path for workers tab: user_type='worker' AND is_active=true ordered by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_users_workers_active_created_at_desc
ON public.users (created_at DESC)
WHERE user_type = 'worker' AND is_active = true;

-- Fast path for clients tab: user_type='client' ordered by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_users_clients_created_at_desc
ON public.users (created_at DESC)
WHERE user_type = 'client';

-- General tab filter support for user_type + ordering.
CREATE INDEX IF NOT EXISTS idx_users_type_created_at_desc
ON public.users (user_type, created_at DESC);

-- Search acceleration (ILIKE) on key fields used by /api/all-users.
CREATE INDEX IF NOT EXISTS idx_users_first_name_trgm
ON public.users USING gin (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_last_name_trgm
ON public.users USING gin (last_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_job_title_trgm
ON public.users USING gin (job_title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_bio_trgm
ON public.users USING gin (bio gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_location_trgm
ON public.users USING gin (location gin_trgm_ops);

-- Refresh planner stats after index creation.
ANALYZE public.users;

-- Optional checks:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_users_workers_active_created_at_desc',
--     'idx_users_clients_created_at_desc',
--     'idx_users_type_created_at_desc',
--     'idx_users_first_name_trgm',
--     'idx_users_last_name_trgm',
--     'idx_users_job_title_trgm',
--     'idx_users_bio_trgm',
--     'idx_users_location_trgm'
--   )
-- ORDER BY indexname;
