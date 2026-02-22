'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

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
                        <span className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition">JobSeek</span>
                    </Link>

                    {/* Navigation Links - Center */}
                    <div className="flex items-center space-x-1">
                        {isHydrated && authState.isLoggedIn && (
                            <>
                                {authState.user?.userType === 'client' ? (
                                    <>
                                        <Link
                                            href="/browse-workers"
                                            className={getLinkClasses('/browse-workers')}
                                        >
                                            Browse Workers
                                        </Link>
                                    </>
                                ) : authState.user?.userType === 'worker' ? (
                                    <>
                                        <Link
                                            href="/jobs"
                                            className={getLinkClasses('/jobs')}
                                        >
                                            Browse Jobs
                                        </Link>
                                    </>
                                ) : null}
                            </>
                        )}
                    </div>

                    {/* Right Side - Auth Links */}
                    <div className="flex items-center space-x-3">
                        {isHydrated ? (
                            authState.isLoggedIn ? (
                                <>
                                    <Link
                                        href="/profile"
                                        className={getLinkClasses('/profile')}
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="transition px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className={getLinkClasses('/login')}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-indigo-600 hover:bg-indigo-700 transition"
                                    >
                                        Register
                                    </Link>
                                </>
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
