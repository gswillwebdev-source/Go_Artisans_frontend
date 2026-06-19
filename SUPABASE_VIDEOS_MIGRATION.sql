-- ============================================================
-- Go Artisans – Videos Feed Migration
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- 1. Videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_url   text        NOT NULL,
    media_type  text        NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'image')),
    caption     text,
    likes_count integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Video likes table  (prevents duplicate likes with UNIQUE constraint)
CREATE TABLE IF NOT EXISTS public.video_likes (
    id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id   uuid        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (video_id, user_id)
);

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_videos_created_at   ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user_id      ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_video   ON public.video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user    ON public.video_likes(user_id);

-- 4. Row Level Security
ALTER TABLE public.videos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

-- 5. Videos RLS policies
CREATE POLICY "Anyone can view videos"
    ON public.videos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post videos"
    ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
    ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- 6. Video likes RLS policies
CREATE POLICY "Anyone can view likes"
    ON public.video_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like"
    ON public.video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
    ON public.video_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET SETUP (do this manually in Supabase dashboard)
-- ============================================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket" → name it:  videos
-- 3. Toggle "Public bucket" ON
-- 4. Click Save
--
-- Then add these Storage Policies for the 'videos' bucket:
--   SELECT  (download): Allow public access → policy:  true
--   INSERT  (upload):   Authenticated users only →
--                       (auth.role() = 'authenticated')
--                       AND (storage.foldername(name))[1] = auth.uid()::text
--   DELETE:             Owner only →
--                       (storage.foldername(name))[1] = auth.uid()::text
-- ============================================================
