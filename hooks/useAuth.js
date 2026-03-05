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
                // Get user profile from database
                const { data: profile, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', session.user.email)
                    .single()

                if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found"
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
                    // Get user profile from database
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', session.user.email)
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
