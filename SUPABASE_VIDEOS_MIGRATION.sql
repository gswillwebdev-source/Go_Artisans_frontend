-- ============================================================
-- Go Artisans – Videos Feed Migration
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- 1. Videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_url    text        NOT NULL,
    media_type   text        NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'image')),
    caption      text,
    likes_count  integer     NOT NULL DEFAULT 0,
    comments_count integer   NOT NULL DEFAULT 0,
    shares_count integer     NOT NULL DEFAULT 0,
    views_count  integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Add views_count if table already exists (safe to run if column is missing)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0;

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

-- Video shares table (multiple shares allowed per user/video)
CREATE TABLE IF NOT EXISTS public.video_shares (
    id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id   uuid        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_shares_video ON public.video_shares(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_shares_user  ON public.video_shares(user_id, created_at DESC);

-- 4. Row Level Security
ALTER TABLE public.videos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;

-- 5. Videos RLS policies
DROP POLICY IF EXISTS "Anyone can view videos"         ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can post videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete own videos"     ON public.videos;

CREATE POLICY "Anyone can view videos"
    ON public.videos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post videos"
    ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
    ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- 6. Video likes RLS policies
DROP POLICY IF EXISTS "Anyone can view likes"       ON public.video_likes;
DROP POLICY IF EXISTS "Authenticated users can like" ON public.video_likes;
DROP POLICY IF EXISTS "Users can unlike own likes"  ON public.video_likes;
CREATE POLICY "Anyone can view likes"
    ON public.video_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like"
    ON public.video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
    ON public.video_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view shares" ON public.video_shares;
DROP POLICY IF EXISTS "Authenticated users can share" ON public.video_shares;

CREATE POLICY "Anyone can view shares"
    ON public.video_shares FOR SELECT USING (true);

CREATE POLICY "Authenticated users can share"
    ON public.video_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-increment likes_count when like is inserted/deleted
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.videos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.video_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_likes_count ON public.video_likes;
CREATE TRIGGER trg_likes_count
AFTER INSERT OR DELETE ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION increment_likes_count();

CREATE OR REPLACE FUNCTION increment_shares_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.videos SET shares_count = shares_count + 1 WHERE id = NEW.video_id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_shares_count ON public.video_shares;
CREATE TRIGGER trg_shares_count
AFTER INSERT ON public.video_shares
FOR EACH ROW EXECUTE FUNCTION increment_shares_count();

-- Unique video views (per user) to keep views_count accurate
CREATE TABLE IF NOT EXISTS public.video_views (
        id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
        video_id   uuid        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
        user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_views_video ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user  ON public.video_views(user_id);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view video views" ON public.video_views;
DROP POLICY IF EXISTS "Authenticated users can create views" ON public.video_views;

CREATE POLICY "Anyone can view video views"
        ON public.video_views FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create views"
        ON public.video_views FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION increment_views_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.videos SET views_count = views_count + 1 WHERE id = NEW.video_id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_views_count ON public.video_views;
CREATE TRIGGER trg_views_count
AFTER INSERT ON public.video_views
FOR EACH ROW EXECUTE FUNCTION increment_views_count();

-- ============================================================
-- VIDEO COMMENTS (run this if you want the comments feature)
-- ============================================================

-- Comments table
CREATE TABLE IF NOT EXISTS public.video_comments (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id    uuid        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    comment     text        NOT NULL CHECK (char_length(comment) <= 300),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_comments_video ON public.video_comments(video_id, created_at);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments"         ON public.video_comments;
DROP POLICY IF EXISTS "Auth users can comment"           ON public.video_comments;
DROP POLICY IF EXISTS "Users can delete own comments"    ON public.video_comments;

CREATE POLICY "Anyone can view comments"   ON public.video_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can comment"     ON public.video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.video_comments FOR DELETE USING (auth.uid() = user_id);

-- Auto-increment comments_count when a comment is inserted/deleted
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET comments_count = comments_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_count ON public.video_comments;
CREATE TRIGGER trg_comments_count
AFTER INSERT OR DELETE ON public.video_comments
FOR EACH ROW EXECUTE FUNCTION increment_comments_count();

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
