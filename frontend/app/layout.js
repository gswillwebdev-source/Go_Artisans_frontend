import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
    title: 'Job Seeking Platform',
    description: 'Find your next opportunity',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Navbar />
                {children}
            </body>
        </html>
    )
}
