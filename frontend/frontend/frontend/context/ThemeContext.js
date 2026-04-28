'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext()

const THEME_STORAGE_KEY = 'app-theme'

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        if (savedTheme === 'light' || savedTheme === 'dark') {
            setTheme(savedTheme)
        }
        setMounted(true)
    }, [])

    useEffect(() => {
        if (typeof document === 'undefined') return

        document.documentElement.dataset.theme = theme
        document.body.dataset.theme = theme

        if (mounted && typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, theme)
        }
    }, [mounted, theme])

    const value = useMemo(() => ({
        theme,
        setTheme,
        toggleTheme: () => setTheme(currentTheme => currentTheme === 'dark' ? 'light' : 'dark')
    }), [theme])

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }

    return context
}