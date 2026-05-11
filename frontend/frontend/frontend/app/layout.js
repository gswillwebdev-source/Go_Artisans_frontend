import './globals.css'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import UpdateNoticeBanner from '@/components/UpdateNoticeBanner'
import ChatAssistant from '@/components/ChatAssistant'
import ConditionalAdBanner from '@/components/ConditionalAdBanner'
import { LanguageProvider } from '@/context/LanguageContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
    title: 'GoArtisans - Job Seeking Platform',
    description: 'Find your next opportunity on GoArtisans',
    icons: {
        icon: '/app_icon.png',
    },
    other: {
        'google-adsense-account': 'ca-pub-2138089895232822',
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                {/* Google AdSense Auto Ads — automatically places ads in best spots on every page */}
                <Script
                    async
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2138089895232822"
                    crossOrigin="anonymous"
                    strategy="afterInteractive"
                />
                <ThemeProvider>
                    <div className="app-shell">
                        <LanguageProvider>
                            <SubscriptionProvider>
                                <Navbar />
                                <UpdateNoticeBanner />
                                <ConditionalAdBanner />
                                {children}
                                <ConditionalAdBanner />
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
