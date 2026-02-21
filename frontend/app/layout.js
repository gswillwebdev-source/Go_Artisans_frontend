import './globals.css'

export const metadata = {
    title: 'Job Seeking Platform',
    description: 'Find your next opportunity',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>{children}</body>
        </html>
    )
}
