'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'

// Initialize auth state from localStorage
const getInitialAuthState = () => {
    if (typeof window === 'undefined') {
        return { isLoggedIn: false, user: null }
    }

    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    try {
        return {
            isLoggedIn: !!token,
            user: userData ? JSON.parse(userData) : null
        }
    } catch (e) {
        console.error('Failed to parse user data:', e)
        return { isLoggedIn: false, user: null }
    }
}

export default function Navbar() {
    const [authState, setAuthState] = useState(getInitialAuthState())
    const [isHydrated, setIsHydrated] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { language, changeLanguage, t } = useLanguage()
    const [languageDropdown, setLanguageDropdown] = useState(false)

    // Ensure we're hydrated on client side
    useEffect(() => {
        setIsHydrated(true)
    }, [])

    useEffect(() => {
        const checkAuth = () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

            try {
                setAuthState({
                    isLoggedIn: !!token,
                    user: userData ? JSON.parse(userData) : null
                })
            } catch (e) {
                console.error('Failed to parse user data:', e)
                setAuthState({ isLoggedIn: false, user: null })
            }
        }

        // Listen for storage changes (when user logs in from another tab/window)
        window.addEventListener('storage', checkAuth)

        return () => window.removeEventListener('storage', checkAuth)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setAuthState({ isLoggedIn: false, user: null })
        router.push('/login')
    }

    // Helper function to determine if a link is active
    const isActive = (href) => {
        return pathname === href || pathname.startsWith(href + '/')
    }

    // Helper function to get active link styles
    const getLinkClasses = (href) => {
        const baseClasses = 'transition px-3 py-2 rounded-md text-sm font-medium'
        const isLinkActive = isActive(href)
        return isLinkActive
            ? `${baseClasses} text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600`
            : `${baseClasses} text-gray-600 hover:text-indigo-600 hover:bg-gray-50`
    }

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <span className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition">GoArtisans</span>
                    </Link>

                    {/* Navigation Links - Center */}
                    <div className="flex items-center space-x-2">
                        {isHydrated && authState.isLoggedIn && (
                            <>
                                {authState.user?.user_type === 'client' ? (
                                    <Link
                                        href="/browse-workers"
                                        className={getLinkClasses('/browse-workers')}
                                    >
                                        {t('browseWorkers')}
                                    </Link>
                                ) : authState.user?.user_type === 'worker' ? (
                                    <Link
                                        href="/jobs"
                                        className={getLinkClasses('/jobs')}
                                    >
                                        📋 {t('browseJobs')}
                                    </Link>
                                ) : null}

                                <Link
                                    href={authState.user?.user_type === 'worker' ? '/worker-profile' : '/client-profile'}
                                    className={getLinkClasses(authState.user?.user_type === 'worker' ? '/worker-profile' : '/client-profile')}
                                >
                                    👤 {t('profile')}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right Side - Auth Links and Language Switcher */}
                    <div className="flex items-center space-x-3">
                        {/* Language Switcher */}
                        <div className="relative">
                            <button
                                onClick={() => setLanguageDropdown(!languageDropdown)}
                                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition flex items-center gap-1"
                            >
                                🌐 {language === 'fr' ? 'FR' : 'EN'}
                            </button>
                            {languageDropdown && (
                                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                                    <button
                                        onClick={() => {
                                            changeLanguage('fr')
                                            setLanguageDropdown(false)
                                        }}
                                        className={`block w-full text-left px-4 py-2 text-sm ${language === 'fr' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        Français (FR)
                                    </button>
                                    <button
                                        onClick={() => {
                                            changeLanguage('en')
                                            setLanguageDropdown(false)
                                        }}
                                        className={`block w-full text-left px-4 py-2 text-sm border-t ${language === 'en' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        English (EN)
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Auth Buttons */}
                        {isHydrated ? (
                            authState.isLoggedIn ? (
                                <div className="flex items-center space-x-2 pl-3 border-l border-gray-300">
                                    {/* Logout Button */}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition border border-red-300 hover:border-red-500"
                                    >
                                        🚪 {t('logout')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2 pl-3 border-l border-gray-300">
                                    <Link
                                        href="/login"
                                        className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                                    >
                                        {t('login')}
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 transition"
                                    >
                                        {t('register')}
                                    </Link>
                                </div>
                            )
                        ) : (
                            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
