import './globals.css'
import Navbar from '@/components/Navbar'
import UpdateNoticeBanner from '@/components/UpdateNoticeBanner'
import ChatAssistant from '@/components/ChatAssistant'
import PostHogInit from '@/components/PostHogInit'
import { LanguageProvider } from '@/context/LanguageContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { Analytics } from '@vercel/analytics/react'

export const viewport = {
    themeColor: '#0066d6',
}

export const metadata = {
    title: 'GoArtisans - Job Seeking Platform',
    description: 'Find your next opportunity on GoArtisans',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'GoArtisans',
    },
    icons: {
        icon: '/app_icon.png',
        apple: '/app_icon.png',
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <PostHogInit />
                <ThemeProvider>
                    <div className="app-shell">
                        <LanguageProvider>
                            <SubscriptionProvider>
                                <Navbar />
                                <UpdateNoticeBanner />
                                {children}
                                <ChatAssistant />
                            </SubscriptionProvider>
                        </LanguageProvider>
                    </div>
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    )
}
