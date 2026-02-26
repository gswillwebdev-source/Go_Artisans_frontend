'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuth(options = {}) {
    const { requiredRole = null, redirectToLogin = true, redirectLoggedInTo = null } = options
    const router = useRouter()
    const [authState, setAuthState] = useState({
        isLoggedIn: false,
        user: null,
        isLoading: true,
        isChecking: true
    })

    useEffect(() => {
        const checkAuth = () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

                const isLoggedIn = !!token
                const user = userData ? JSON.parse(userData) : null

                // Check if user is authenticated
                if (!isLoggedIn) {
                    if (redirectToLogin) {
                        // This is a protected page, redirect to login
                        router.push('/login')
                        return
                    }
                    setAuthState({
                        isLoggedIn: false,
                        user: null,
                        isLoading: false,
                        isChecking: false
                    })
                    return
                }

                // User is logged in
                // Check if they need to choose a role
                if (!user?.userType) {
                    router.push('/choose-role')
                    return
                }

                // Check for role requirement
                if (requiredRole && user.userType !== requiredRole) {
                    if (user.userType === 'worker') {
                        router.push('/worker-profile')
                    } else if (user.userType === 'client') {
                        router.push('/client-profile')
                    } else {
                        router.push('/choose-role')
                    }
                    return
                }

                // If logged in user is on a login/register page, redirect them
                if (redirectLoggedInTo) {
                    if (user.userType === 'worker') {
                        router.push('/worker-profile')
                    } else if (user.userType === 'client') {
                        router.push('/client-profile')
                    }
                    return
                }

                setAuthState({
                    isLoggedIn: true,
                    user,
                    isLoading: false,
                    isChecking: false
                })
            } catch (e) {
                console.error('Auth check error:', e)
                setAuthState({
                    isLoggedIn: false,
                    user: null,
                    isLoading: false,
                    isChecking: false
                })
            }
        }

        checkAuth()
        // Set up storage listener for auth changes
        window.addEventListener('storage', checkAuth)
        return () => window.removeEventListener('storage', checkAuth)
    }, [router, redirectToLogin, requiredRole, redirectLoggedInTo])

    return authState
}
