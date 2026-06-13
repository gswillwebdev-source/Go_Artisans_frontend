import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'online.goartisans.app',
    appName: 'Go Artisans',
    // webDir is only used during `cap sync` when you have a local static build.
    // Since we're pointing at the live Vercel site below, it serves as a fallback.
    webDir: 'out',
    server: {
        // Load your live Vercel site inside the WebView.
        // This means all API routes, SSR, Supabase auth, etc. continue to work
        // exactly as they do in the browser — no backend code changes needed.
        url: 'https://goartisans.online',
        cleartext: false, // HTTPS only — required for Play Store
    },
    android: {
        allowMixedContent: false,
    },
};

export default config;
