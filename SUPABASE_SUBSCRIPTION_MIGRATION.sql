-- ============================================================
-- GoArtisans Subscription System Migration
-- LinkedIn-inspired: Free | Pro | Premium + Verification Badges
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS  (static reference table)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id              VARCHAR(50) PRIMARY KEY,   -- 'free', 'pro', 'premium'
    name            VARCHAR(100) NOT NULL,
    target_role     VARCHAR(20) NOT NULL,       -- 'worker' | 'client' | 'both'
    price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_yearly    NUMERIC(10,2) NOT NULL DEFAULT 0,
    trial_days      INTEGER NOT NULL DEFAULT 0,
    features        JSONB NOT NULL DEFAULT '[]'::jsonb,
    limits          JSONB NOT NULL DEFAULT '{}'::jsonb,
    badge_color     VARCHAR(30),               -- 'none' | 'gold' | 'diamond'
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed plan data
INSERT INTO public.subscription_plans (id, name, target_role, price_monthly, price_yearly, trial_days, features, limits, badge_color, sort_order)
VALUES
-- ── Worker plans ──────────────────────────────────────────────
('worker_free', 'Free', 'worker', 0, 0, 0,
 '["Basic profile", "Apply to 5 jobs per month", "View 3 client profiles per day", "Basic job search", "Standard search ranking"]'::jsonb,
 '{"job_applications_per_month": 5, "client_profile_views_per_day": 3, "portfolio_images": 3, "direct_messages_per_month": 0, "who_viewed_days": 0}'::jsonb,
 'none', 1),

('worker_pro', 'Pro', 'worker', 9.99, 99.99, 14,
 '["Unlimited job applications", "See who viewed your profile (last 30 days)", "Priority ranking in search results", "Pro badge on profile", "Up to 10 portfolio images", "Job alerts & notifications", "Application analytics", "Featured applicant tag"]'::jsonb,
 '{"job_applications_per_month": -1, "client_profile_views_per_day": -1, "portfolio_images": 10, "direct_messages_per_month": 5, "who_viewed_days": 30}'::jsonb,
 'gold', 2),

('worker_premium', 'Premium', 'worker', 19.99, 199.99, 0,
 '["Everything in Pro", "Top placement in search results", "See who viewed profile (last 90 days)", "10 direct messages per month", "Premium diamond badge", "Unlimited portfolio images", "AI-powered job matching", "Priority application status", "Profile boosting", "Dedicated support"]'::jsonb,
 '{"job_applications_per_month": -1, "client_profile_views_per_day": -1, "portfolio_images": -1, "direct_messages_per_month": 10, "who_viewed_days": 90}'::jsonb,
 'diamond', 3),

-- ── Client / Employer plans ────────────────────────────────────
('client_free', 'Free', 'client', 0, 0, 0,
 '["Post up to 2 jobs per month", "Browse worker profiles (limited)", "View basic worker information", "Receive applications", "Standard employer ranking"]'::jsonb,
 '{"job_posts_per_month": 2, "worker_profile_views_per_day": 5, "direct_messages_per_month": 0, "saved_workers": 5}'::jsonb,
 'none', 1),

('client_pro', 'Pro', 'client', 14.99, 149.99, 14,
 '["Post up to 10 jobs per month", "Full worker profile access", "5 direct messages per month", "Pro employer badge", "Job posting analytics", "Featured employer tag", "Applicant filtering & sorting", "Priority listings"]'::jsonb,
 '{"job_posts_per_month": 10, "worker_profile_views_per_day": -1, "direct_messages_per_month": 5, "saved_workers": 50}'::jsonb,
 'gold', 2),

('client_premium', 'Premium', 'client', 29.99, 299.99, 0,
 '["Unlimited job posts", "Full worker profile access", "20 direct messages per month", "Premium diamond employer badge", "Featured employer spotlight", "Advanced applicant analytics", "Priority worker recommendations", "Saved worker lists (unlimited)", "Dedicated account manager", "24/7 priority support"]'::jsonb,
 '{"job_posts_per_month": -1, "worker_profile_views_per_day": -1, "direct_messages_per_month": 20, "saved_workers": -1}'::jsonb,
 'diamond', 3)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    trial_days = EXCLUDED.trial_days,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    badge_color = EXCLUDED.badge_color,
    sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------
-- 2. USER SUBSCRIPTIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id             VARCHAR(50) NOT NULL REFERENCES public.subscription_plans(id),
    status              VARCHAR(30) NOT NULL DEFAULT 'active',
                        -- 'active' | 'trialing' | 'cancelled' | 'expired' | 'past_due'
    billing_cycle       VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- 'monthly' | 'yearly'
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_period_end  TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_start         TIMESTAMP WITH TIME ZONE,
    trial_end           TIMESTAMP WITH TIME ZONE,
    cancelled_at        TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    payment_provider    VARCHAR(50),            -- 'stripe' | 'paypal' | 'manual'
    payment_provider_subscription_id VARCHAR(255),
    payment_provider_customer_id VARCHAR(255),
    amount_paid         NUMERIC(10,2),
    currency            VARCHAR(10) DEFAULT 'USD',
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Only one active subscription per user
    CONSTRAINT uq_user_active_subscription UNIQUE (user_id, status)
        DEFERRABLE INITIALLY DEFERRED
);

-- ----------------------------------------------------------------
-- 3. TRIAL TRACKING  (one free trial per user per plan tier)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_trials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_tier   VARCHAR(20) NOT NULL,  -- 'pro' | 'premium'
    started_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at    TIMESTAMP WITH TIME ZONE,
    converted   BOOLEAN DEFAULT false, -- converted to paid?
    UNIQUE(user_id, plan_tier)
);

-- ----------------------------------------------------------------
-- 4. VERIFICATION BADGES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_badges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
                    -- 'pending' | 'approved' | 'rejected' | 'revoked'
    badge_type      VARCHAR(30) NOT NULL DEFAULT 'identity',
                    -- 'identity' | 'professional' | 'business'
    verified_fields JSONB DEFAULT '[]'::jsonb,
                    -- e.g. ["email", "phone", "id_document"]
    submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    reviewed_by     UUID REFERENCES public.users(id),
    rejection_reason TEXT,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. PROFILE VIEWS TRACKING  (for "who viewed your profile")
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_views (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    view_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    viewed_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(viewer_id, viewed_id, view_date)
);

-- ----------------------------------------------------------------
-- 6. SUBSCRIPTION USAGE TRACKING
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    usage_type      VARCHAR(50) NOT NULL,
                    -- 'job_application' | 'job_post' | 'direct_message' | 'profile_view'
    used_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata        JSONB DEFAULT '{}'::jsonb
);

-- ----------------------------------------------------------------
-- 7. INDEXES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id    ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status     ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id    ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_trials_user_id   ON public.subscription_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_badges_user_id   ON public.verification_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_badges_status    ON public.verification_badges(status);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id       ON public.profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id       ON public.profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id    ON public.subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_type       ON public.subscription_usage(usage_type);

-- ----------------------------------------------------------------
-- 8. RLS POLICIES
-- ----------------------------------------------------------------
ALTER TABLE public.subscription_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_trials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_badges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage     ENABLE ROW LEVEL SECURITY;

-- Plans are public readable
CREATE POLICY "plans_public_read" ON public.subscription_plans
    FOR SELECT USING (true);

-- Users can read their own subscription
CREATE POLICY "subscriptions_user_read" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update subscriptions (payment webhook)
CREATE POLICY "subscriptions_service_write" ON public.user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own trials
CREATE POLICY "trials_user_read" ON public.subscription_trials
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trials_service_write" ON public.subscription_trials
    FOR ALL USING (auth.role() = 'service_role');

-- Verification badges - users can read their own, submit new
CREATE POLICY "badges_user_read" ON public.verification_badges
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badges_user_insert" ON public.verification_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "badges_approved_public" ON public.verification_badges
    FOR SELECT USING (status = 'approved');

-- Profile views - viewer can insert, viewed user can select
CREATE POLICY "profile_views_insert" ON public.profile_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "profile_views_select" ON public.profile_views
    FOR SELECT USING (auth.uid() = viewed_id OR auth.uid() = viewer_id);

-- Usage tracking
CREATE POLICY "usage_user_read" ON public.subscription_usage
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_user_insert" ON public.subscription_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 9. HELPER FUNCTIONS
-- ----------------------------------------------------------------

-- Get current active subscription for a user
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    plan_id         VARCHAR,
    plan_name       VARCHAR,
    status          VARCHAR,
    billing_cycle   VARCHAR,
    badge_color     VARCHAR,
    period_end      TIMESTAMP WITH TIME ZONE,
    trial_end       TIMESTAMP WITH TIME ZONE,
    is_trialing     BOOLEAN,
    limits          JSONB,
    features        JSONB
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.id,
        sp.name,
        us.status,
        us.billing_cycle,
        sp.badge_color,
        us.current_period_end,
        us.trial_end,
        (us.status = 'trialing'),
        sp.limits,
        sp.features
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status IN ('active', 'trialing')
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Check if user has used their free trial for a tier
CREATE OR REPLACE FUNCTION public.has_used_trial(p_user_id UUID, p_plan_tier VARCHAR)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.subscription_trials
        WHERE user_id = p_user_id AND plan_tier = p_plan_tier
    );
END;
$$ LANGUAGE plpgsql;

-- Get monthly usage count for a user
CREATE OR REPLACE FUNCTION public.get_monthly_usage(p_user_id UUID, p_usage_type VARCHAR)
RETURNS INTEGER SECURITY DEFINER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.subscription_usage
        WHERE user_id = p_user_id
          AND usage_type = p_usage_type
          AND DATE_TRUNC('month', used_at) = DATE_TRUNC('month', NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_verification_badges_updated_at
    BEFORE UPDATE ON public.verification_badges
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- 10. DEFAULT FREE SUBSCRIPTION for existing users
-- ----------------------------------------------------------------
-- Add stripe_customer_id column to users table if not present
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Run this to give all existing users a free-tier subscription
-- based on their user_type (worker or client)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT id, user_type FROM public.users
        WHERE user_type IN ('worker', 'client')
          AND id NOT IN (SELECT user_id FROM public.user_subscriptions)
    LOOP
        INSERT INTO public.user_subscriptions (
            user_id, plan_id, status, billing_cycle,
            current_period_start, current_period_end
        ) VALUES (
            rec.id,
            rec.user_type || '_free',
            'active',
            'monthly',
            NOW(),
            NOW() + INTERVAL '100 years'
        );
    END LOOP;
END $$;
