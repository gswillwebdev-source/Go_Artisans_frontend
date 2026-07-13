-- ============================================================
-- Go Artisans – In-App Chat & Broadcast Notifications
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. DIRECT MESSAGES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content         text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
    is_read         boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Composite index for fetching a conversation thread efficiently
CREATE INDEX IF NOT EXISTS idx_dm_thread ON public.direct_messages
    ((LEAST(sender_id, recipient_id)), (GREATEST(sender_id, recipient_id)), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_recipient_unread ON public.direct_messages(recipient_id, is_read)
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages"   ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages"       ON public.direct_messages;
DROP POLICY IF EXISTS "Recipients can mark as read"   ON public.direct_messages;

CREATE POLICY "Users can view own messages"
    ON public.direct_messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
    ON public.direct_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark as read"
    ON public.direct_messages FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- ── 2. BROADCAST NOTIFICATIONS ───────────────────────────────────────────
-- One record per broadcast event (new video, new job, daily digest).
-- Much more efficient than inserting one row per user.
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    type            text        NOT NULL CHECK (type IN ('new_video', 'new_job', 'daily_digest')),
    actor_id        uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    title           text        NOT NULL,
    body            text        NOT NULL,
    action_url      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_created ON public.broadcast_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_type    ON public.broadcast_notifications(type, created_at DESC);

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view broadcasts" ON public.broadcast_notifications;
CREATE POLICY "Anyone can view broadcasts"
    ON public.broadcast_notifications FOR SELECT USING (true);

-- ── 3. BROADCAST READ TRACKING ───────────────────────────────────────────
-- Marks which broadcasts a user has dismissed (lightweight — not required to view)
CREATE TABLE IF NOT EXISTS public.broadcast_reads (
    user_id             uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    broadcast_id        uuid        NOT NULL REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
    created_at          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, broadcast_id)
);

ALTER TABLE public.broadcast_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reads" ON public.broadcast_reads;
CREATE POLICY "Users manage own reads"
    ON public.broadcast_reads FOR ALL USING (auth.uid() = user_id);

-- ── 4. NEW DM → notifications INSERT trigger ─────────────────────────────
-- When a direct message is sent, insert a row into `notifications` so the
-- existing polling hook picks it up and shows the bell badge.
CREATE OR REPLACE FUNCTION notify_new_dm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sender_name text;
BEGIN
    SELECT COALESCE(first_name || ' ' || last_name, 'Someone')
        INTO v_sender_name
        FROM public.users WHERE id = NEW.sender_id;

    INSERT INTO public.notifications (
        user_id, type, related_user_id, title, message, action_url, is_read, created_at
    ) VALUES (
        NEW.recipient_id,
        'message',
        NEW.sender_id,
        'New message from ' || v_sender_name,
        LEFT(NEW.content, 80),
        '/messages/' || NEW.sender_id,
        false,
        now()
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_dm ON public.direct_messages;
CREATE TRIGGER trg_notify_new_dm
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION notify_new_dm();

-- ── 5. NEW VIDEO → broadcast_notifications trigger ───────────────────────
CREATE OR REPLACE FUNCTION broadcast_new_video()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_name text;
BEGIN
    SELECT COALESCE(first_name || ' ' || last_name, 'An artisan')
        INTO v_name FROM public.users WHERE id = NEW.user_id;

    INSERT INTO public.broadcast_notifications (type, actor_id, title, body, action_url)
    VALUES (
        'new_video',
        NEW.user_id,
        v_name || ' just posted a new video! 🎬',
        COALESCE(NEW.caption, 'Check it out on GoArtisans.'),
        '/videos'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_new_video ON public.videos;
CREATE TRIGGER trg_broadcast_new_video
AFTER INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION broadcast_new_video();

-- ── 6. NEW JOB → broadcast_notifications trigger ─────────────────────────
CREATE OR REPLACE FUNCTION broadcast_new_job()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_name text;
BEGIN
    SELECT COALESCE(first_name || ' ' || last_name, 'A client')
        INTO v_name FROM public.users WHERE id = NEW.client_id;

    INSERT INTO public.broadcast_notifications (type, actor_id, title, body, action_url)
    VALUES (
        'new_job',
        NEW.client_id,
        v_name || ' posted a new job: ' || COALESCE(LEFT(NEW.title, 60), 'Untitled'),
        COALESCE(LEFT(NEW.description, 100), ''),
        '/jobs/' || NEW.id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_new_job ON public.jobs;
CREATE TRIGGER trg_broadcast_new_job
AFTER INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION broadcast_new_job();

-- ── 7. ENABLE REALTIME on direct_messages ────────────────────────────────
-- Run this separately if realtime isn't already enabled:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_notifications;

-- ── END OF MIGRATION ─────────────────────────────────────────────────────
