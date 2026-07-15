-- ============================================================
-- Go Artisans – DM Media Support + Storage Bucket
-- Run this AFTER SUPABASE_CHAT_NOTIFICATIONS_MIGRATION.sql
-- ============================================================

-- 1. Add media columns to direct_messages
ALTER TABLE public.direct_messages
    ADD COLUMN IF NOT EXISTS media_url  text,
    ADD COLUMN IF NOT EXISTS media_type text
        CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio', 'file'));

-- 2. Widen content check to allow empty text when media is present
-- (Drop old constraint and recreate it to allow empty content alongside media)
ALTER TABLE public.direct_messages
    DROP CONSTRAINT IF EXISTS direct_messages_content_check;

ALTER TABLE public.direct_messages
    ADD CONSTRAINT direct_messages_content_check
    CHECK (
        char_length(content) <= 2000
        AND (char_length(content) >= 1 OR media_url IS NOT NULL)
    );

-- 3. Storage bucket for chat media (run from SQL or Dashboard → Storage)
-- In Supabase Dashboard → Storage → New bucket:
--   Name: chat-media
--   Public: true
-- Then add these Storage Policies for the 'chat-media' bucket:
--   SELECT (download): true   (public read)
--   INSERT (upload):   (auth.role() = 'authenticated')
--                      AND (storage.foldername(name))[1] = auth.uid()::text
--   DELETE:            (storage.foldername(name))[1] = auth.uid()::text

-- ── END OF MIGRATION ─────────────────────────────────────────────────────
