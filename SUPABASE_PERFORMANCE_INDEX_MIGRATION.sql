-- ============================================================================
-- SUPABASE PERFORMANCE INDEX MIGRATION (PHASE 1)
-- ============================================================================
-- Goal:
-- - Improve p95 latency for profile and dashboard queries.
-- - Speed up filtered + ordered reads used in worker/client profile pages.
--
-- Safe to run multiple times (uses IF NOT EXISTS).
-- Run in Supabase SQL Editor.
-- ============================================================================

-- Jobs: client pages fetch by client_id ordered by created_at desc.
CREATE INDEX IF NOT EXISTS idx_jobs_client_created_at_desc
ON public.jobs (client_id, created_at DESC);

-- Jobs: worker pages fetch active jobs with recent-first ordering.
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at_desc
ON public.jobs (status, created_at DESC);

-- Applications: client profile reads by job_id (and often status), newest first.
CREATE INDEX IF NOT EXISTS idx_applications_job_status_created_at_desc
ON public.applications (job_id, status, created_at DESC);

-- Applications: client profile applicants list by job_id newest first (without status filter).
CREATE INDEX IF NOT EXISTS idx_applications_job_created_at_desc
ON public.applications (job_id, created_at DESC);

-- Applications: worker profile reads by worker_id and status transitions.
CREATE INDEX IF NOT EXISTS idx_applications_worker_status_created_at_desc
ON public.applications (worker_id, status, created_at DESC);

-- Applications: worker profile loads all applications by worker_id newest first.
CREATE INDEX IF NOT EXISTS idx_applications_worker_created_at_desc
ON public.applications (worker_id, created_at DESC);

-- Completions: client profile reads by client_id newest first.
CREATE INDEX IF NOT EXISTS idx_completions_client_created_at_desc
ON public.completions (client_id, created_at DESC);

-- Completions: worker-side completion history and RLS checks by worker_id.
CREATE INDEX IF NOT EXISTS idx_completions_worker_created_at_desc
ON public.completions (worker_id, created_at DESC);

-- Completions: joins/filters on job lifecycle status.
CREATE INDEX IF NOT EXISTS idx_completions_job_status_created_at_desc
ON public.completions (job_id, status, created_at DESC);

-- Reviews: worker profile fetches ratings by worker_id + rater_type newest first.
CREATE INDEX IF NOT EXISTS idx_reviews_worker_rater_created_at_desc
ON public.reviews (worker_id, rater_type, created_at DESC);

-- Reviews: client profile fetches ratings by client_id + rater_type newest first.
CREATE INDEX IF NOT EXISTS idx_reviews_client_rater_created_at_desc
ON public.reviews (client_id, rater_type, created_at DESC);

-- Users: frequent browse pattern for active workers.
CREATE INDEX IF NOT EXISTS idx_users_type_active_created_at_desc
ON public.users (user_type, is_active, created_at DESC);

-- Optional: refresh planner stats after index creation.
ANALYZE public.users;
ANALYZE public.jobs;
ANALYZE public.applications;
ANALYZE public.completions;
ANALYZE public.reviews;

-- ============================================================================
-- QUICK CHECKS (optional)
-- ============================================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_jobs_client_created_at_desc',
--     'idx_jobs_status_created_at_desc',
--     'idx_applications_job_status_created_at_desc',
--     'idx_applications_job_created_at_desc',
--     'idx_applications_worker_status_created_at_desc',
--     'idx_applications_worker_created_at_desc',
--     'idx_completions_client_created_at_desc',
--     'idx_completions_worker_created_at_desc',
--     'idx_completions_job_status_created_at_desc',
--     'idx_reviews_worker_rater_created_at_desc',
--     'idx_reviews_client_rater_created_at_desc',
--     'idx_users_type_active_created_at_desc'
--   )
-- ORDER BY indexname;

-- Targeted worker refresh coverage check (optional):
-- SELECT indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_applications_worker_created_at_desc',
--     'idx_applications_worker_status_created_at_desc',
--     'idx_completions_worker_created_at_desc'
--   )
-- ORDER BY indexname;
