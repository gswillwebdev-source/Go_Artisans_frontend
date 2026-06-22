-- ============================================================
-- Go Artisans – Gifting System Migration
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- 1. User coin balances
CREATE TABLE IF NOT EXISTS public.user_coins (
    user_id    uuid        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    balance    integer     NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own coins"   ON public.user_coins;
DROP POLICY IF EXISTS "Users can update own coins" ON public.user_coins;
DROP POLICY IF EXISTS "Users can insert own coins" ON public.user_coins;

CREATE POLICY "Users can read own coins"
    ON public.user_coins FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own coins"
    ON public.user_coins FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coins"
    ON public.user_coins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Gifts sent on videos
CREATE TABLE IF NOT EXISTS public.video_gifts (
    id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id     uuid        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    sender_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    gift_emoji   text        NOT NULL,
    gift_name    text        NOT NULL,
    gift_cost    integer     NOT NULL CHECK (gift_cost > 0),
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_gifts_video     ON public.video_gifts(video_id, created_at);
CREATE INDEX IF NOT EXISTS idx_video_gifts_recipient ON public.video_gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_video_gifts_sender    ON public.video_gifts(sender_id);

ALTER TABLE public.video_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gifts"         ON public.video_gifts;
DROP POLICY IF EXISTS "Authenticated users can gift"  ON public.video_gifts;

CREATE POLICY "Anyone can view gifts"
    ON public.video_gifts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can gift"
    ON public.video_gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 3. Creator Dashboard: sum of gifts received per user (helper view)
CREATE OR REPLACE VIEW public.creator_gift_totals AS
SELECT
    recipient_id AS user_id,
    COUNT(*)                 AS total_gifts_received,
    SUM(gift_cost)           AS total_coins_received
FROM public.video_gifts
GROUP BY recipient_id;

-- ============================================================
-- NOTE: The frontend uses a "Claim 100 free coins" button
-- which upserts directly into user_coins. No server function
-- is required for the MVP. Coin deduction happens on the
-- client before inserting a video_gift record.
-- ============================================================
