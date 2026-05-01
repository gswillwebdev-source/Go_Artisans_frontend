'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import PlanBadge from '@/components/PlanBadge'
import { useSubscription } from '@/context/SubscriptionContext'

export default function Navbar() {
    const { user, isLoading: authLoading } = useAuth({ redirectToLogin: false })
    const { planTier, isVerified } = useSubscription()
    const router = useRouter()
    const pathname = usePathname()
    const { language, changeLanguage, t } = useLanguage()
    const [languageDropdown, setLanguageDropdown] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Close drawer on route change
    useEffect(() => { setDrawerOpen(false) }, [pathname])

    // iOS-safe scroll lock: use position:fixed trick so iOS Safari obeys
    useEffect(() => {
        if (typeof document === 'undefined') return
        if (drawerOpen) {
            const scrollY = window.scrollY
            document.body.style.position = 'fixed'
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = '100%'
        } else {
            const top = document.body.style.top
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
            if (top) window.scrollTo(0, -parseInt(top || '0'))
        }
        return () => {
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
        }
    }, [drawerOpen])

    const closeDrawer = () => setDrawerOpen(false)

    const handleLogout = async () => {
        closeDrawer()
        await supabase.auth.signOut()
        if (typeof window !== 'undefined') {
            localStorage.setItem('explicitLogout', '1')
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('adminToken')
            localStorage.removeItem('adminUser')
        }
        router.push('/')
    }

    const isActive = (href) => pathname === href || pathname.startsWith(href + '/')

    const getLinkClasses = (href) => {
        const base = 'transition px-3 py-2 rounded-lg text-sm font-semibold border border-transparent'
        return isActive(href)
            ? `${base} text-blue-700 bg-blue-50 border-blue-200 shadow-sm`
            : `${base} text-slate-600 hover:text-blue-700 hover:bg-slate-100`
    }

    const drawerLinkClasses = (href) =>
        `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition ${isActive(href) ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-700 hover:bg-slate-100 border border-transparent'
        }`

    const profileHref = user?.user_type === 'worker' ? '/worker-profile' : '/client-profile'

    return (
        <>
            {/* ── NAVBAR ── */}
            <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-lg shadow-[0_2px_16px_rgba(16,24,40,0.07)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">

                    {/* MOBILE ROW */}
                    <div className="flex items-center justify-between sm:hidden h-12">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            aria-label="Open menu"
                            aria-expanded={drawerOpen}
                            className="p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition touch-manipulation"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
                            <span className="display-font text-2xl font-bold text-blue-700 tracking-tighter flex items-center">
                                Go<img src="/app_icon.png" alt="A" className="w-7 h-7 rounded-md inline-block" style={{ marginLeft: '-3px', marginRight: '-3px' }} />rtisans
                            </span>
                        </Link>

                        <div className="flex items-center gap-1.5">
                            {!authLoading && user && (
                                <>
                                    {user.user_type === 'client' && (
                                        <Link href="/browse-workers" className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition touch-manipulation whitespace-nowrap">
                                            🔍 Workers
                                        </Link>
                                    )}
                                    {user.user_type === 'worker' && (
                                        <Link href="/jobs" className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition touch-manipulation whitespace-nowrap">
                                            📋 Jobs
                                        </Link>
                                    )}
                                    <NotificationBell />
                                </>
                            )}
                            {!authLoading && !user && (
                                <Link href="/login" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition touch-manipulation">
                                    {t('login')}
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* DESKTOP ROW */}
                    <div className="hidden sm:flex sm:flex-row sm:justify-between sm:items-center gap-4 min-h-16">
                        <Link href="/" className="flex items-center shrink-0">
                            <span className="display-font text-3xl font-bold text-blue-700 hover:text-blue-800 transition tracking-tighter flex items-center">
                                Go<img src="/app_icon.png" alt="A" className="w-9 h-9 rounded-md inline-block" style={{ marginLeft: '-4px', marginRight: '-4px' }} />rtisans
                            </span>
                        </Link>

                        <div className="flex flex-wrap items-center gap-2">
                            {!authLoading && user && (
                                <>
                                    <Link href="/all-users" className={getLinkClasses('/all-users')}>👥 All</Link>
                                    {user.user_type === 'client' && (
                                        <Link href="/browse-workers" className={getLinkClasses('/browse-workers')}>{t('browseWorkers')}</Link>
                                    )}
                                    {user.user_type === 'worker' && (
                                        <Link href="/jobs" className={getLinkClasses('/jobs')}>📋 {t('browseJobs')}</Link>
                                    )}
                                    <Link href={profileHref} className={getLinkClasses(profileHref)}>👤 {t('profile')}</Link>
                                    <Link href="/pricing" className={`${getLinkClasses('/pricing')} flex items-center gap-1`}>
                                        {planTier === 'premium' ? '💎' : planTier === 'pro' ? '⭐' : '🚀'} Plans
                                        {planTier === 'free' && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">Upgrade</span>}
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="relative">
                                <button onClick={() => setLanguageDropdown(!languageDropdown)}
                                    className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition flex items-center gap-1 border border-transparent">
                                    🌐 {language === 'fr' ? 'FR' : 'EN'}
                                </button>
                                {languageDropdown && (
                                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl z-50 border border-slate-200 overflow-hidden">
                                        <button onClick={() => { changeLanguage('fr'); setLanguageDropdown(false) }}
                                            className={`block w-full text-left px-4 py-2.5 text-sm font-medium ${language === 'fr' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                                            Français (FR)
                                        </button>
                                        <button onClick={() => { changeLanguage('en'); setLanguageDropdown(false) }}
                                            className={`block w-full text-left px-4 py-2.5 text-sm font-medium border-t border-slate-200 ${language === 'en' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                                            English (EN)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {user ? (
                                <div className="flex items-center gap-2 pl-3 border-l border-slate-300">
                                    <Link href="/subscription" title="Manage subscription">
                                        <PlanBadge planTier={planTier} isVerified={isVerified} size="sm" />
                                    </Link>
                                    <button onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 border border-red-300 hover:border-red-500 transition whitespace-nowrap">
                                        🚪 {t('logout')}
                                    </button>
                                    <NotificationBell />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 pl-3 border-l border-slate-300">
                                    <Link href="/login" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition whitespace-nowrap">
                                        {t('login')}
                                    </Link>
                                    <Link href="/register" className="px-4 py-2 rounded-xl text-white text-sm font-semibold primary-action transition whitespace-nowrap shadow-sm">
                                        {t('register')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </nav>

            {/* ── SIDE DRAWER (mobile only) ── */}

            {/* Backdrop — always in DOM, CSS-controlled so React never inserts/removes siblings */}
            <div
                className={`fixed inset-0 z-[45] bg-black/50 sm:hidden transition-opacity duration-300 ease-in-out ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={closeDrawer}
                aria-hidden="true"
            />

            {/* Drawer panel — always in DOM for CSS transition, sits above backdrop */}
            <div
                className={`fixed top-0 left-0 z-[46] h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col sm:hidden
                    transition-transform duration-300 ease-in-out
                    ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0">
                    <Link href="/" onClick={closeDrawer}>
                        <span className="display-font text-2xl font-bold text-blue-700 tracking-tighter flex items-center">
                            Go<img src="/app_icon.png" alt="A" className="w-7 h-7 rounded-md inline-block" style={{ marginLeft: '-3px', marginRight: '-3px' }} />rtisans
                        </span>
                    </Link>
                    <button onClick={closeDrawer} aria-label="Close menu"
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition touch-manipulation">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Links */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {!authLoading && user ? (
                        <>
                            {/* User info */}
                            <Link href="/subscription" onClick={closeDrawer}
                                className="flex items-center gap-2 px-3 py-3 mb-3 bg-slate-50 rounded-xl border border-slate-100">
                                <PlanBadge planTier={planTier} isVerified={isVerified} size="sm" />
                                <span className="text-xs text-slate-500 font-medium truncate">{user.email}</span>
                            </Link>

                            <p className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-400">Menu</p>

                            <Link href="/all-users" onClick={closeDrawer} className={drawerLinkClasses('/all-users')}>
                                <span>👥</span> All Users
                            </Link>
                            {user.user_type === 'client' && (
                                <Link href="/browse-workers" onClick={closeDrawer} className={drawerLinkClasses('/browse-workers')}>
                                    <span>🔍</span> {t('browseWorkers')}
                                </Link>
                            )}
                            {user.user_type === 'worker' && (
                                <Link href="/jobs" onClick={closeDrawer} className={drawerLinkClasses('/jobs')}>
                                    <span>📋</span> {t('browseJobs')}
                                </Link>
                            )}
                            <Link href={profileHref} onClick={closeDrawer} className={drawerLinkClasses(profileHref)}>
                                <span>👤</span> {t('profile')}
                            </Link>
                            <Link href="/notifications" onClick={closeDrawer} className={drawerLinkClasses('/notifications')}>
                                <span>🔔</span> Notifications
                            </Link>
                            <Link href="/pricing" onClick={closeDrawer} className={drawerLinkClasses('/pricing')}>
                                <span>{planTier === 'premium' ? '💎' : planTier === 'pro' ? '⭐' : '🚀'}</span>
                                Plans & Pricing
                                {planTier === 'free' && (
                                    <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Upgrade</span>
                                )}
                            </Link>
                        </>
                    ) : !authLoading && (
                        <>
                            <p className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-400">Explore</p>
                            <Link href="/jobs" onClick={closeDrawer} className={drawerLinkClasses('/jobs')}>
                                <span>📋</span> Browse Jobs
                            </Link>
                            <Link href="/browse-workers" onClick={closeDrawer} className={drawerLinkClasses('/browse-workers')}>
                                <span>🔍</span> Browse Workers
                            </Link>
                            <Link href="/pricing" onClick={closeDrawer} className={drawerLinkClasses('/pricing')}>
                                <span>🚀</span> Plans & Pricing
                            </Link>
                        </>
                    )}

                    {/* Language */}
                    <div className="pt-4 pb-1">
                        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Language</p>
                        <div className="flex gap-2 px-3">
                            <button onClick={() => { changeLanguage('en'); closeDrawer() }}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition touch-manipulation ${language === 'en' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                🌐 EN
                            </button>
                            <button onClick={() => { changeLanguage('fr'); closeDrawer() }}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition touch-manipulation ${language === 'fr' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                🌐 FR
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Footer */}
                <div className="px-3 py-4 border-t border-slate-100 shrink-0 space-y-2">
                    {!authLoading && user ? (
                        <button onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 active:bg-red-100 border border-red-200 transition touch-manipulation">
                            <span>🚪</span> {t('logout')}
                        </button>
                    ) : !authLoading && (
                        <>
                            <Link href="/login" onClick={closeDrawer}
                                className="w-full flex items-center justify-center px-3 py-3 rounded-xl text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition touch-manipulation">
                                {t('login')}
                            </Link>
                            <Link href="/register" onClick={closeDrawer}
                                className="w-full flex items-center justify-center px-3 py-3 rounded-xl text-sm font-semibold text-white primary-action transition touch-manipulation">
                                {t('register')}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
