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
        const baseClasses = 'transition px-3 py-2 rounded-lg text-sm font-semibold border border-transparent'
        const isLinkActive = isActive(href)
        return isLinkActive
            ? `${baseClasses} text-blue-700 bg-blue-50 border-blue-200 shadow-sm`
            : `${baseClasses} text-slate-600 hover:text-blue-700 hover:bg-slate-100`
    }

    return (
        <>
            <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 min-h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center shrink-0">
                            <span className="display-font text-2xl font-bold text-blue-700 hover:text-blue-800 transition tracking-tight">GoArtisans</span>
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
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto min-w-0 flex-wrap">
                            {/* Language Switcher */}
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setLanguageDropdown(!languageDropdown)}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition flex items-center justify-center gap-1 min-w-[58px] border border-transparent"
                                >
                                    <span className="hidden xs:inline">🌐</span>
                                    {language === 'fr' ? 'FR' : 'EN'}
                                </button>
                                {languageDropdown && (
                                    <div className="absolute right-0 mt-2 w-32 sm:w-36 max-w-[88vw] bg-white rounded-xl shadow-xl z-50 border border-slate-200 overflow-hidden">
                                        <button
                                            onClick={() => {
                                                changeLanguage('fr')
                                                setLanguageDropdown(false)
                                            }}
                                            className={`block w-full text-left px-4 py-2.5 text-sm font-medium ${language === 'fr' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                                        >
                                            Français (FR)
                                        </button>
                                        <button
                                            onClick={() => {
                                                changeLanguage('en')
                                                setLanguageDropdown(false)
                                            }}
                                            className={`block w-full text-left px-4 py-2.5 text-sm font-medium border-t border-slate-200 ${language === 'en' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                                        >
                                            English (EN)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Auth Buttons */}
                            {user ? (
                                <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-300 min-w-0">
                                    {/* Logout Button */}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 transition border border-red-300 hover:border-red-500 whitespace-nowrap"
                                    >
                                        🚪 {t('logout')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-300 flex-wrap justify-end min-w-0">
                                    <Link
                                        href="/login"
                                        className="px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition whitespace-nowrap"
                                    >
                                        {t('login')}
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-3 sm:px-4 py-2 rounded-xl text-white text-sm font-semibold primary-action transition whitespace-nowrap shadow-sm"
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
