'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
        // Get initial session
        const getInitialSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                console.error('Error getting session:', error)
                setAuthState({
                    isLoggedIn: false,
                    user: null,
                    isLoading: false,
                    isChecking: false
                })
                return
            }

            if (session?.user) {
                // Get user profile from database (only essential fields, use indexed id lookup)
                const profilePromise = Promise.race([
                    supabase
                        .from('users')
                        .select('id,email,first_name,last_name,phone_number,user_type')
                        .eq('id', session.user.id)
                        .single(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
                    )
                ])

                let profileResult
                try {
                    profileResult = await profilePromise
                } catch (err) {
                    if (err.message === 'Profile fetch timeout') {
                        console.warn('Profile fetch timed out, using metadata')
                    } else {
                        console.error('Error fetching user profile:', err)
                    }
                    profileResult = { data: null, error: err }
                }

                const { data: profile, error: profileError } = profileResult

                if (profileError && profileError.code !== 'PGRST116') {
                    console.warn('Profile fetch error (non-fatal):', profileError.message)
                }

                let user = profile

                // if profile doesn't exist (new signup) create it in background after page renders
                if (!user) {
                    user = {
                        id: session.user.id,
                        email: session.user.email,
                        first_name: session.user.user_metadata?.first_name || session.user.user_metadata?.name?.split(' ')[0] || '',
                        last_name: session.user.user_metadata?.last_name || session.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                        phone_number: session.user.user_metadata?.phone_number || null,
                        user_type: session.user.user_metadata?.user_type || null
                    }

                    // Create profile in background, completely non-blocking
                    setTimeout(() => {
                        supabase
                            .from('users')
                            .insert({
                                id: session.user.id,
                                email: session.user.email,
                                first_name: user.first_name,
                                last_name: user.last_name,
                                phone_number: user.phone_number,
                                user_type: user.user_type
                            })
                            .then(() => {
                                // Profile created successfully (silently)
                            })
                            .catch(() => {
                                // Silently fail - profile might already exist
                            })
                    }, 5000)
                }

                setAuthState({
                    isLoggedIn: true,
                    user,
                    isLoading: false,
                    isChecking: false
                })

                // Check if they need to choose a role
                if (!user?.user_type) {
                    router.push('/choose-role')
                    return
                }

                // Check for role requirement
                if (requiredRole && user.user_type !== requiredRole) {
                    if (user.user_type === 'worker') {
                        router.push('/worker-profile')
                    } else if (user.user_type === 'client') {
                        router.push('/client-profile')
                    } else {
                        router.push('/choose-role')
                    }
                    return
                }

                // Redirect logged in users if specified
                if (redirectLoggedInTo) {
                    router.push(redirectLoggedInTo)
                    return
                }
            } else {
                if (redirectToLogin) {
                    router.push('/login')
                    return
                }
                setAuthState({
                    isLoggedIn: false,
                    user: null,
                    isLoading: false,
                    isChecking: false
                })
            }
        }

        getInitialSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    // Get user profile from database using user ID for faster query
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()

                    if (profileError && profileError.code !== 'PGRST116') {
                        console.error('Error fetching user profile:', profileError)
                    }

                    const user = profile || {
                        id: session.user.id,
                        email: session.user.email,
                        first_name: session.user.user_metadata?.first_name || '',
                        last_name: session.user.user_metadata?.last_name || '',
                        user_type: session.user.user_metadata?.user_type || null
                    }

                    setAuthState({
                        isLoggedIn: true,
                        user,
                        isLoading: false,
                        isChecking: false
                    })

                    // Check if they need to choose a role
                    if (!user?.user_type) {
                        router.push('/choose-role')
                        return
                    }

                    // Check for role requirement
                    if (requiredRole && user.user_type !== requiredRole) {
                        if (user.user_type === 'worker') {
                            router.push('/worker-profile')
                        } else if (user.user_type === 'client') {
                            router.push('/client-profile')
                        } else {
                            router.push('/choose-role')
                        }
                        return
                    }

                    // Redirect logged in users if specified
                    if (redirectLoggedInTo) {
                        router.push(redirectLoggedInTo)
                        return
                    }
                } else if (event === 'SIGNED_OUT') {
                    setAuthState({
                        isLoggedIn: false,
                        user: null,
                        isLoading: false,
                        isChecking: false
                    })

                    if (redirectToLogin) {
                        router.push('/login')
                    }
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [router, requiredRole, redirectToLogin, redirectLoggedInTo])

    return authState
}
