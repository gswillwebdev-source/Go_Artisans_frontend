-- ============================================================
-- Go Artisans – Wallet Send & Withdraw Extension
-- Run AFTER SUPABASE_WALLET_ESCROW_MIGRATION.sql
-- ============================================================

-- 1. Extend wallet_transactions type to include send / receive
ALTER TABLE public.wallet_transactions
    DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_type_check
    CHECK (type IN (
        'deposit',
        'escrow_lock',
        'escrow_release',
        'escrow_refund',
        'withdrawal',
        'send',        -- sender side of a P2P transfer
        'receive'      -- recipient side of a P2P transfer
    ));

-- 2. Peer-to-peer transfer log
CREATE TABLE IF NOT EXISTS public.wallet_transfers (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_xof      numeric(12,2) NOT NULL CHECK (amount_xof > 0),
    note            text        CHECK (char_length(note) <= 200),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_sender    ON public.wallet_transfers(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_recipient ON public.wallet_transfers(recipient_id, created_at DESC);

ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sender can view own transfers"    ON public.wallet_transfers;
DROP POLICY IF EXISTS "Recipient can view own transfers" ON public.wallet_transfers;

CREATE POLICY "Sender can view own transfers"
    ON public.wallet_transfers FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Recipient can view own transfers"
    ON public.wallet_transfers FOR SELECT USING (auth.uid() = recipient_id);

-- 3. Wallet withdrawal requests (wallet → mobile money via FedaPay)
CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
    id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                 uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_xof              numeric(12,2) NOT NULL CHECK (amount_xof > 0),
    payment_method          text        NOT NULL,
    phone_number            text        NOT NULL,
    status                  text        NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
    fedapay_request_id      text,
    fedapay_request_status  text,
    admin_note              text,
    processed_at            timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user ON public.wallet_withdrawals(user_id, created_at DESC);

ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.wallet_withdrawals;

CREATE POLICY "Users can view own withdrawals"
    ON public.wallet_withdrawals FOR SELECT USING (auth.uid() = user_id);

-- 4. Atomic peer-to-peer transfer function
-- Moves amount from sender to recipient in a single transaction.
CREATE OR REPLACE FUNCTION transfer_wallet(
    p_sender_id    uuid,
    p_recipient_id uuid,
    p_amount_xof   numeric,
    p_note         text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance   numeric;
    v_transfer_id uuid;
BEGIN
    -- Lock sender row and check balance
    SELECT balance_xof INTO v_balance
        FROM public.wallets WHERE user_id = p_sender_id FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount_xof THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
            COALESCE(v_balance, 0), p_amount_xof;
    END IF;

    -- Debit sender
    UPDATE public.wallets
        SET balance_xof = balance_xof - p_amount_xof, updated_at = now()
        WHERE user_id = p_sender_id;

    -- Credit recipient (create wallet row if first time)
    INSERT INTO public.wallets (user_id, balance_xof, updated_at)
        VALUES (p_recipient_id, p_amount_xof, now())
    ON CONFLICT (user_id) DO UPDATE
        SET balance_xof = wallets.balance_xof + p_amount_xof, updated_at = now();

    -- Log the transfer
    INSERT INTO public.wallet_transfers (sender_id, recipient_id, amount_xof, note)
        VALUES (p_sender_id, p_recipient_id, p_amount_xof, p_note)
    RETURNING id INTO v_transfer_id;

    RETURN v_transfer_id;
END;
$$;

-- ── END OF MIGRATION ──────────────────────────────────────────────────────
