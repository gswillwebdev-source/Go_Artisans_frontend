'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations } from '@/lib/translations'

const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('fr') // Default to French

    useEffect(() => {
        // Get language from localStorage on mount
        if (typeof window !== 'undefined') {
            const savedLanguage = localStorage.getItem('language') || 'fr'
            setLanguage(savedLanguage)
        }
    }, [])

    const changeLanguage = (lang) => {
        setLanguage(lang)
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang)
        }
    }

    const t = (key) => {
        return translations[language]?.[key] || translations['en']?.[key] || key
    }

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider')
    }
    return context
}
