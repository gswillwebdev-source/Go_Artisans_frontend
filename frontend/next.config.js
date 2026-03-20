/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Required by Vercel's onBuildComplete hook (Next.js 16 compatibility)
    shouldNormalizeNextData: false,
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgofshosxvunqbbycwyq.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
}

module.exports = nextConfig

