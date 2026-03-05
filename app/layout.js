import './globals.css'
import Navbar from '@/components/Navbar'
import { LanguageProvider } from '@/context/LanguageContext'
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
            <body>
                <LanguageProvider>
                    <Navbar />
                    {children}
                </LanguageProvider>
                <Analytics />
            </body>
        </html>
    )
}
