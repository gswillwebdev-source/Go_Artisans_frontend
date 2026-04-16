-- Fix: clients not visible on all-users and all-clients pages
-- Root cause: RLS policy on public.users only grants anonymous read to user_type='worker'.
-- There is no matching policy for user_type='client', so the anon key used by
-- the Next.js API routes cannot read any client rows.
--
-- Run this once in Supabase → SQL Editor.

-- Add public read access for client profiles, mirroring the existing worker policy.
CREATE POLICY "Public can view client profiles" ON public.users
    FOR SELECT USING (user_type = 'client');
