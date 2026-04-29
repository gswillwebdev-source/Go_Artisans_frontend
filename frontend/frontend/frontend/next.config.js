const path = require('path')

// Next.js configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    outputFileTracingRoot: path.resolve(__dirname),
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgofshosxvunqbbycwyq.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    async redirects() {
        return [
            {
                source: '/plans',
                destination: '/pricing',
                permanent: true,
            },
        ]
    },
}

module.exports = nextConfig

