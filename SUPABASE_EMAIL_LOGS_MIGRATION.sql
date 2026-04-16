-- ============================================================================
-- EMAIL LOGS TABLE MIGRATION
-- ============================================================================
-- Run this in Supabase SQL Editor BEFORE using the email campaigns feature.
-- Safe to run multiple times.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_type  varchar(60) NOT NULL,
    reference_id uuid       NULL,
    sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_lookup
    ON public.email_logs (user_id, email_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at
    ON public.email_logs (sent_at DESC);

-- No RLS needed — only accessed server-side via service role key.
