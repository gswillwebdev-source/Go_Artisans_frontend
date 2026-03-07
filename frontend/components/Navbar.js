'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
    const { user, isLoading: authLoading } = useAuth({ redirectToLogin: false })
    const router = useRouter()
    const pathname = usePathname()
    const { language, changeLanguage, t } = useLanguage()
    const [languageDropdown, setLanguageDropdown] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
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
                        {!authLoading && user && (
                            <>
                                {user.user_type === 'client' ? (
                                    <Link
                                        href="/browse-workers"
                                        className={getLinkClasses('/browse-workers')}
                                    >
                                        {t('browseWorkers')}
                                    </Link>
                                ) : user.user_type === 'worker' ? (
                                    <Link
                                        href="/jobs"
                                        className={getLinkClasses('/jobs')}
                                    >
                                        📋 {t('browseJobs')}
                                    </Link>
                                ) : null}

                                <Link
                                    href={user.user_type === 'worker' ? '/worker-profile' : '/client-profile'}
                                    className={getLinkClasses(user.user_type === 'worker' ? '/worker-profile' : '/client-profile')}
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
                        {!authLoading ? (
                            user ? (
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
