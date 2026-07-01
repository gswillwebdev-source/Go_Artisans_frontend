-- ============================================================
-- Go Artisans – In-App Wallet & Escrow Payment System
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- ── 1. WALLETS ────────────────────────────────────────────────────────────
-- One wallet per user. Stores their spendable app balance in XOF.
CREATE TABLE IF NOT EXISTS public.wallets (
    id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    balance_xof  numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance_xof >= 0),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet"   ON public.wallets;
DROP POLICY IF EXISTS "Service role manages wallets" ON public.wallets;

CREATE POLICY "Users can view own wallet"
    ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- ── 2. WALLET TRANSACTIONS ────────────────────────────────────────────────
-- Full ledger: every credit/debit event.
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type            text        NOT NULL CHECK (type IN (
                                    'deposit',         -- from mobile money / card into wallet
                                    'escrow_lock',     -- client locks money for a job
                                    'escrow_release',  -- worker receives funds after job done
                                    'escrow_refund',   -- client refunded on cancellation/dispute
                                    'withdrawal'       -- wallet → mobile money payout
                                )),
    amount_xof      numeric(12,2) NOT NULL,
    reference_id    uuid,        -- escrow_id for escrow events; deposit_id for deposits
    description     text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_user     ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_ref      ON public.wallet_transactions(reference_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;

CREATE POLICY "Users can view own transactions"
    ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- ── 3. WALLET DEPOSITS ────────────────────────────────────────────────────
-- FedaPay checkout records for topping up the wallet.
CREATE TABLE IF NOT EXISTS public.wallet_deposits (
    id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_xof          numeric(12,2) NOT NULL CHECK (amount_xof > 0),
    payment_method      text        NOT NULL,
    phone_number        text,
    status              text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'completed', 'failed')),
    fedapay_tx_id       text,
    completed_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_deposits_user ON public.wallet_deposits(user_id, created_at DESC);

ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own deposits" ON public.wallet_deposits;

CREATE POLICY "Users can view own deposits"
    ON public.wallet_deposits FOR SELECT USING (auth.uid() = user_id);

-- ── 4. ESCROW PAYMENTS ────────────────────────────────────────────────────
-- One record per job agreement. Holds the payment lifecycle.
CREATE TABLE IF NOT EXISTS public.escrow_payments (
    id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id              uuid        REFERENCES public.jobs(id) ON DELETE SET NULL,
    client_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_xof          numeric(12,2) NOT NULL CHECK (amount_xof > 0),
    platform_fee_xof    numeric(12,2) NOT NULL DEFAULT 0,
    worker_receives_xof numeric(12,2) NOT NULL,
    description         text        NOT NULL,
    status              text        NOT NULL DEFAULT 'locked'
                                    CHECK (status IN (
                                        'locked',           -- money held, job in progress
                                        'worker_confirmed', -- worker marked job done
                                        'completed',        -- both confirmed + reviewed → funds released
                                        'disputed',         -- either party opened a dispute
                                        'refunded',         -- client refunded (cancelled / admin decision)
                                        'cancelled'         -- cancelled before worker accepted
                                    )),
    worker_confirmed_at timestamptz,
    client_confirmed_at timestamptz,
    released_at         timestamptz,
    dispute_reason      text,
    admin_note          text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_client  ON public.escrow_payments(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_worker  ON public.escrow_payments(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_job     ON public.escrow_payments(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status  ON public.escrow_payments(status);

ALTER TABLE public.escrow_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client can view own escrow"  ON public.escrow_payments;
DROP POLICY IF EXISTS "Worker can view own escrow"  ON public.escrow_payments;
DROP POLICY IF EXISTS "Client can create escrow"    ON public.escrow_payments;

CREATE POLICY "Client can view own escrow"
    ON public.escrow_payments FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Worker can view own escrow"
    ON public.escrow_payments FOR SELECT USING (auth.uid() = worker_id);

CREATE POLICY "Client can create escrow"
    ON public.escrow_payments FOR INSERT WITH CHECK (auth.uid() = client_id);

-- ── 5. JOB REVIEWS ────────────────────────────────────────────────────────
-- Client leaves a review after confirming job completion.
-- Creating a review triggers fund release.
CREATE TABLE IF NOT EXISTS public.job_reviews (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    escrow_id   uuid        NOT NULL UNIQUE REFERENCES public.escrow_payments(id) ON DELETE CASCADE,
    client_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating      integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     text        CHECK (char_length(comment) <= 500),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_reviews_worker ON public.job_reviews(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_reviews_client ON public.job_reviews(client_id, created_at DESC);

ALTER TABLE public.job_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews"  ON public.job_reviews;
DROP POLICY IF EXISTS "Client can write review"  ON public.job_reviews;

CREATE POLICY "Anyone can view reviews"
    ON public.job_reviews FOR SELECT USING (true);

CREATE POLICY "Client can write review"
    ON public.job_reviews FOR INSERT WITH CHECK (auth.uid() = client_id);

-- ── 6. ATOMIC WALLET HELPER FUNCTIONS ────────────────────────────────────

-- Credit a user's wallet atomically (used by deposit webhook & escrow release)
CREATE OR REPLACE FUNCTION credit_wallet(p_user_id uuid, p_amount_xof numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance_xof, updated_at)
        VALUES (p_user_id, p_amount_xof, now())
    ON CONFLICT (user_id) DO UPDATE
        SET balance_xof = wallets.balance_xof + p_amount_xof,
            updated_at  = now();
END;
$$;

-- Debit a user's wallet atomically (raises exception if insufficient funds)
CREATE OR REPLACE FUNCTION debit_wallet(p_user_id uuid, p_amount_xof numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance numeric;
BEGIN
    SELECT balance_xof INTO v_balance
        FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount_xof THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %',
            COALESCE(v_balance, 0), p_amount_xof;
    END IF;

    UPDATE public.wallets
        SET balance_xof = balance_xof - p_amount_xof,
            updated_at  = now()
        WHERE user_id = p_user_id;
END;
$$;

-- Increment user_coins atomically (referenced by coinController webhook fallback)
CREATE OR REPLACE FUNCTION increment_user_coins(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (p_user_id, p_amount, now())
    ON CONFLICT (user_id) DO UPDATE
        SET balance    = user_coins.balance + p_amount,
            updated_at = now();
END;
$$;

-- ── 7. ADMIN POLICIES (service-role bypass) ───────────────────────────────
-- The service role key bypasses RLS by default in Supabase.
-- No extra policies needed for service-role API routes.

-- ── END OF MIGRATION ──────────────────────────────────────────────────────
-- After running this SQL, you MUST also run SUPABASE_VIDEOS_MIGRATION.sql
-- if you haven't already (for the video_shares table and shares_count column).
