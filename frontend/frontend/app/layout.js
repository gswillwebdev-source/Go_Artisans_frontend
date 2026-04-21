import './globals.css'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import UpdateNoticeBanner from '@/components/UpdateNoticeBanner'
import ChatAssistant from '@/components/ChatAssistant'
import { LanguageProvider } from '@/context/LanguageContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { Analytics } from '@vercel/analytics/react'

export const metadata = {
    title: 'GoArtisans - Job Seeking Platform',
    description: 'Find your next opportunity on GoArtisans',
    icons: {
        icon: '/app_icon.png',
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            {/* Google AdSense — replace ca-pub-XXXXXXXXXXXXXXXX with your real Publisher ID */}
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1284812825598221"
                crossOrigin="anonymous"
                strategy="afterInteractive"
            />
            <body suppressHydrationWarning>
                <ThemeProvider>
                    <div className="app-shell">
                        <LanguageProvider>
                            <Navbar />
                            <UpdateNoticeBanner />
                            {children}
                            <ChatAssistant />
                        </LanguageProvider>
                    </div>
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    )
}
