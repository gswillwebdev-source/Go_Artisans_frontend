-- =============================================
-- REFERRAL SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add referral_code column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- 2. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referee_id)   -- each user can only be referred once
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code   ON users(referral_code);

-- 4. RLS policies for referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes)
CREATE POLICY "service_role_full_referrals" ON referrals
  FOR ALL USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own referral rows
CREATE POLICY "users_read_own_referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- 5. Function to get referral badge tier
CREATE OR REPLACE FUNCTION get_referral_tier(count INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN count >= 1000 THEN 'Legend'
    WHEN count >= 350  THEN 'Champion'
    WHEN count >= 250  THEN 'Promoter'
    WHEN count >= 150  THEN 'Advocate'
    WHEN count >= 50   THEN 'Starter'
    ELSE 'None'
  END;
$$;
