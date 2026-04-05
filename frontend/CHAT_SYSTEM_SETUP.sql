-- ============================================================================
-- CHAT ASSISTANT SYSTEM - Supabase Migration
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- Creates tables for: chat messages, rate limiting, and FAQ articles

-- 1. Create faq_articles table
CREATE TABLE IF NOT EXISTS public.faq_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    keywords JSONB DEFAULT '[]'::jsonb,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for keyword search
CREATE INDEX IF NOT EXISTS idx_faq_articles_keywords ON public.faq_articles USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_faq_articles_category ON public.faq_articles(category);
CREATE INDEX IF NOT EXISTS idx_faq_articles_active ON public.faq_articles(is_active);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_ip ON public.chat_messages(ip_address, created_at DESC);

-- 3. Create rate_limit_tracker table
CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(100) NOT NULL UNIQUE,
    user_type VARCHAR(20) DEFAULT 'anonymous',
    message_count INT DEFAULT 0,
    reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 day',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_tracker(identifier);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.faq_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

-- FAQ Articles: Everyone can read
CREATE POLICY "Anyone can view FAQ articles"
    ON public.faq_articles
    FOR SELECT
    USING (is_active = true);

-- Chat Messages: Users can only see their own, managed backend only
CREATE POLICY "Users can view their own chat messages"
    ON public.chat_messages
    FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Rate Limiter: Backend only (no direct user access)
CREATE POLICY "Backend only access to rate limiter"
    ON public.rate_limit_tracker
    FOR SELECT
    USING (false);

-- ============================================================================
-- INSERT SAMPLE FAQ DATA
-- ============================================================================

INSERT INTO public.faq_articles (
    id, question, answer, category, keywords, sort_order, is_active
) VALUES
('550e8400-e29b-41d4-a716-446655440001',
 'Qu''est-ce que GoArtisans ?',
 'GoArtisans est une plateforme qui permet de mettre en relation des clients avec des artisans qualifiés pour différents services (plomberie, électricité, maçonnerie, etc.).',
 'General',
 '["GoArtisans", "plateforme", "artisans", "services"]'::jsonb,
 1,
 true),

('550e8400-e29b-41d4-a716-446655440002',
 'Comment créer un compte ?',
 'Cliquez sur ''S''inscrire'', remplissez vos informations et validez votre inscription.',
 'Account',
 '["créer", "compte", "inscription", "s''inscrire"]'::jsonb,
 3,
 true),

('550e8400-e29b-41d4-a716-446655440003',
 'Est-ce que l''inscription est gratuite ?',
 'Oui, l''inscription est totalement gratuite.',
 'Account',
 '["gratuit", "inscription", "frais"]'::jsonb,
 4,
 true),

('550e8400-e29b-41d4-a716-446655440004',
 'Que faire si j''ai oublié mon mot de passe ?',
 'Cliquez sur ''Mot de passe oublié'' et suivez les instructions reçues par email.',
 'Account',
 '["oublié", "mot de passe", "réinitialiser"]'::jsonb,
 6,
 true),

('550e8400-e29b-41d4-a716-446655440005',
 'Comment trouver un artisan près de chez moi ?',
 'Utilisez la barre de recherche ou sélectionnez une catégorie pour voir les artisans disponibles dans votre zone.',
 'Search',
 '["trouver", "artisan", "recherche", "localisation"]'::jsonb,
 8,
 true);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Chat Assistant System installed successfully!' as status;
