-- ============================================================
-- Admin Team Members (Staff / Assistants / Managers)
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_team_members (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    invited_by          uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    email               text NOT NULL,
    name                text,
    role                text NOT NULL DEFAULT 'assistant'
                            CHECK (role IN ('assistant', 'manager')),
    permissions         jsonb NOT NULL DEFAULT '{
                            "view_users": true,
                            "edit_users": false,
                            "delete_users": false,
                            "view_contact_info": true,
                            "send_email": true,
                            "send_whatsapp": true,
                            "trigger_campaigns": false,
                            "view_jobs": false,
                            "view_applications": false,
                            "view_verifications": false,
                            "view_subscriptions": false
                        }'::jsonb,
    status              text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'active', 'revoked')),
    invite_token        text UNIQUE,
    invite_expires_at   timestamptz,
    user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at          timestamptz DEFAULT now(),
    accepted_at         timestamptz
);

-- Only service role can access this table (RLS with no policies = all denied for anon/authenticated)
ALTER TABLE admin_team_members ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_admin_team_invite_token  ON admin_team_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_admin_team_user_id       ON admin_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_team_email         ON admin_team_members(email);
