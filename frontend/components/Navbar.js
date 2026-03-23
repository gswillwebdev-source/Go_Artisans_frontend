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
        // Clear Supabase session
        await supabase.auth.signOut()

        // Clear all auth-related localStorage data
        if (typeof window !== 'undefined') {
            localStorage.setItem('explicitLogout', '1')
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('adminToken')
            localStorage.removeItem('adminUser')
            // Keep language preference but clear auth data
        }

        // Redirect to home page (logged out state)
        router.push('/')
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
        <>
            <nav className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 min-h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center shrink-0">
                            <span className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition">GoArtisans</span>
                        </Link>

                        {/* Navigation Links - Center */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            {!authLoading && user && (
                                <>
                                    <Link
                                        href="/all-users"
                                        className={getLinkClasses('/all-users')}
                                    >
                                        👥 All
                                    </Link>

                                    <Link
                                        href="/all-clients"
                                        className={getLinkClasses('/all-clients')}
                                    >
                                        👔 Clients
                                    </Link>

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
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                            {/* Language Switcher */}
                            <div className="relative">
                                <button
                                    onClick={() => setLanguageDropdown(!languageDropdown)}
                                    className="px-2.5 sm:px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition flex items-center gap-1 whitespace-nowrap"
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
                            {user ? (
                                <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-300">
                                    {/* Logout Button */}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition border border-red-300 hover:border-red-500 whitespace-nowrap"
                                    >
                                        🚪 {t('logout')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-300 flex-wrap justify-end">
                                    <Link
                                        href="/login"
                                        className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition whitespace-nowrap"
                                    >
                                        {t('login')}
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-3 sm:px-4 py-2 rounded-lg text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 transition whitespace-nowrap"
                                    >
                                        {t('register')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    )
}
