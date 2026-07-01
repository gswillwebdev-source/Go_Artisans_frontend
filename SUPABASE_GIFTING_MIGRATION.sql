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

-- 3. Coin purchases (tracks payment history)
CREATE TABLE IF NOT EXISTS public.coin_purchases (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coins_amount    integer     NOT NULL CHECK (coins_amount > 0),
    price_xof       integer     NOT NULL,
    payment_method  text        NOT NULL,
    phone_number    text,
    status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user ON public.coin_purchases(user_id, created_at DESC);

ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own purchases"   ON public.coin_purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.coin_purchases;

CREATE POLICY "Users can read own purchases"
    ON public.coin_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
    ON public.coin_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Gift withdrawal requests (convert received coins to money)
CREATE TABLE IF NOT EXISTS public.gift_withdrawals (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coins_amount    integer     NOT NULL CHECK (coins_amount > 0),
    estimated_xof   integer     NOT NULL,
    gross_xof       integer,
    platform_fee_xof integer,
    payout_xof      integer,
    payment_method  text        NOT NULL,
    phone_number    text        NOT NULL,
    status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','rejected')),
    admin_note      text,
    processed_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    processed_at    timestamptz,
    transfer_reference text,
    fedapay_request_id text,
    fedapay_request_status text,
    fedapay_requested_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    paid_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gift_withdrawals_user ON public.gift_withdrawals(user_id, created_at DESC);

ALTER TABLE public.gift_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own withdrawals"   ON public.gift_withdrawals;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.gift_withdrawals;

CREATE POLICY "Users can read own withdrawals"
    ON public.gift_withdrawals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals"
    ON public.gift_withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Withdrawal economics:
-- - Minimum withdrawal: 5,000 coins
-- - Gross conversion: 5,000 coins = 22,727 XOF
-- - Platform fee: 20%
-- - Payout to creator: 80%
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS gross_xof integer;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS platform_fee_xof integer;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS payout_xof integer;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS transfer_reference text;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS fedapay_request_id text;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS fedapay_request_status text;
ALTER TABLE public.gift_withdrawals ADD COLUMN IF NOT EXISTS fedapay_requested_at timestamptz;

CREATE OR REPLACE FUNCTION apply_withdrawal_business_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    gross integer;
    fee integer;
BEGIN
    IF NEW.coins_amount < 5000 THEN
        RAISE EXCEPTION 'Minimum withdrawal is 5000 coins';
    END IF;

    -- Integer conversion ratio from product requirement: 5000 coins = 22727 XOF.
    gross := ROUND((NEW.coins_amount::numeric * 22727::numeric) / 5000::numeric);
    fee := ROUND(gross::numeric * 0.20);

    NEW.gross_xof := gross;
    NEW.platform_fee_xof := fee;
    NEW.payout_xof := GREATEST(0, gross - fee);
    NEW.estimated_xof := NEW.payout_xof;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_withdrawal_business_rules ON public.gift_withdrawals;
CREATE TRIGGER trg_apply_withdrawal_business_rules
BEFORE INSERT OR UPDATE OF coins_amount ON public.gift_withdrawals
FOR EACH ROW EXECUTE FUNCTION apply_withdrawal_business_rules();

-- Prevent over-withdrawal against total gifted coins.
CREATE OR REPLACE FUNCTION enforce_withdrawal_available_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_received integer;
    total_committed integer;
    available_coins integer;
BEGIN
    SELECT COALESCE(SUM(gift_cost), 0)
    INTO total_received
    FROM public.video_gifts
    WHERE recipient_id = NEW.user_id;

    SELECT COALESCE(SUM(coins_amount), 0)
    INTO total_committed
    FROM public.gift_withdrawals
    WHERE user_id = NEW.user_id
      AND status IN ('pending', 'processing', 'paid')
      AND (NEW.id IS NULL OR id <> NEW.id);

    available_coins := GREATEST(0, total_received - total_committed);

    IF NEW.status IN ('pending', 'processing', 'paid') AND NEW.coins_amount > available_coins THEN
        RAISE EXCEPTION 'Insufficient withdrawable coins. Available: %, requested: %', available_coins, NEW.coins_amount;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_withdrawal_available_coins ON public.gift_withdrawals;
CREATE TRIGGER trg_enforce_withdrawal_available_coins
BEFORE INSERT OR UPDATE OF coins_amount, status ON public.gift_withdrawals
FOR EACH ROW EXECUTE FUNCTION enforce_withdrawal_available_coins();

-- 5. Creator Dashboard: sum of gifts received per user (helper view)
CREATE OR REPLACE VIEW public.creator_gift_totals AS
SELECT
    recipient_id AS user_id,
    COUNT(*)                 AS total_gifts_received,
    SUM(gift_cost)           AS total_coins_received
FROM public.video_gifts
GROUP BY recipient_id;

-- 6. Creator view monetization (TikTok-style threshold model)
-- Every completed 1,000 unique views pays 500 XOF to the creator.
CREATE TABLE IF NOT EXISTS public.video_view_milestones (
    video_id             uuid        PRIMARY KEY REFERENCES public.videos(id) ON DELETE CASCADE,
    rewarded_milestones  integer     NOT NULL DEFAULT 0 CHECK (rewarded_milestones >= 0),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_view_earnings (
    user_id            uuid        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    total_views_paid   integer     NOT NULL DEFAULT 0 CHECK (total_views_paid >= 0),
    total_milestones   integer     NOT NULL DEFAULT 0 CHECK (total_milestones >= 0),
    gross_xof_earned   integer     NOT NULL DEFAULT 0 CHECK (gross_xof_earned >= 0),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_view_earning_events (
    id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    video_id          uuid        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    milestone_count   integer     NOT NULL CHECK (milestone_count > 0),
    views_paid        integer     NOT NULL CHECK (views_paid > 0),
    gross_xof_earned  integer     NOT NULL CHECK (gross_xof_earned > 0),
    created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_view_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_view_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_view_earning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view video view milestones" ON public.video_view_milestones;
DROP POLICY IF EXISTS "Users can read own creator earnings" ON public.creator_view_earnings;
DROP POLICY IF EXISTS "Users can read own creator earning events" ON public.creator_view_earning_events;

CREATE POLICY "Anyone can view video view milestones"
    ON public.video_view_milestones FOR SELECT USING (true);

CREATE POLICY "Users can read own creator earnings"
    ON public.creator_view_earnings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own creator earning events"
    ON public.creator_view_earning_events FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION apply_view_monetization_on_unique_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    video_owner uuid;
    current_views integer;
    milestones_now integer;
    milestones_paid integer;
    new_milestones integer;
BEGIN
    SELECT user_id INTO video_owner
    FROM public.videos
    WHERE id = NEW.video_id;

    IF video_owner IS NULL THEN
        RETURN NULL;
    END IF;

    -- Ensure one tracker row per video and lock it to avoid double rewarding.
    INSERT INTO public.video_view_milestones (video_id)
    VALUES (NEW.video_id)
    ON CONFLICT (video_id) DO NOTHING;

    SELECT rewarded_milestones
    INTO milestones_paid
    FROM public.video_view_milestones
    WHERE video_id = NEW.video_id
    FOR UPDATE;

    SELECT COUNT(*)::integer
    INTO current_views
    FROM public.video_views
    WHERE video_id = NEW.video_id;

    milestones_now := FLOOR(current_views / 1000.0);
    new_milestones := GREATEST(0, milestones_now - COALESCE(milestones_paid, 0));

    IF new_milestones > 0 THEN
        INSERT INTO public.creator_view_earnings (user_id, total_views_paid, total_milestones, gross_xof_earned, updated_at)
        VALUES (video_owner, new_milestones * 1000, new_milestones, new_milestones * 500, now())
        ON CONFLICT (user_id) DO UPDATE
        SET total_views_paid = public.creator_view_earnings.total_views_paid + EXCLUDED.total_views_paid,
            total_milestones = public.creator_view_earnings.total_milestones + EXCLUDED.total_milestones,
            gross_xof_earned = public.creator_view_earnings.gross_xof_earned + EXCLUDED.gross_xof_earned,
            updated_at = now();

        INSERT INTO public.creator_view_earning_events (user_id, video_id, milestone_count, views_paid, gross_xof_earned)
        VALUES (video_owner, NEW.video_id, new_milestones, new_milestones * 1000, new_milestones * 500);

        UPDATE public.video_view_milestones
        SET rewarded_milestones = milestones_now,
            updated_at = now()
        WHERE video_id = NEW.video_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_view_monetization_on_unique_view ON public.video_views;
CREATE TRIGGER trg_apply_view_monetization_on_unique_view
AFTER INSERT ON public.video_views
FOR EACH ROW EXECUTE FUNCTION apply_view_monetization_on_unique_view();

-- ============================================================
-- NOTE: Coin purchases now follow this flow:
-- 1. Frontend creates a PENDING coin_purchases record
-- 2. FedaPay checkout is generated at /api/coins/fedapay/checkout
-- 3. User completes payment at FedaPay
-- 4. FedaPay webhook confirms payment + updates purchase status to COMPLETED
-- 5. Webhook auto-credits coins to user_coins on confirmation
-- All payment methods (MTN, Moov, Visa, etc.) are supported via FedaPay.
-- ============================================================
