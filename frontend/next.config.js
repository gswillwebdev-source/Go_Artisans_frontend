const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    turbopack: {
        root: path.resolve(__dirname),
    },
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgofshosxvunqbbycwyq.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
}

module.exports = nextConfig

