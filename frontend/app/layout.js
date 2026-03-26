import './globals.css'
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
        icon: '/favicon.svg',
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
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
