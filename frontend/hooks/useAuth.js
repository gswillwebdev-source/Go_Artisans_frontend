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
        const buildFallbackUser = (sessionUser) => ({
            id: sessionUser.id,
            email: sessionUser.email,
            first_name: sessionUser.user_metadata?.first_name || sessionUser.user_metadata?.name?.split(' ')[0] || '',
            last_name: sessionUser.user_metadata?.last_name || sessionUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            phone_number: sessionUser.user_metadata?.phone_number || null,
            user_type: sessionUser.user_metadata?.user_type || null
        })

        const ensureProfileExists = async (sessionUser, fallbackUser) => {
            const { data, error } = await supabase
                .from('users')
                .upsert({
                    id: sessionUser.id,
                    email: sessionUser.email,
                    first_name: fallbackUser.first_name,
                    last_name: fallbackUser.last_name,
                    phone_number: fallbackUser.phone_number,
                    user_type: fallbackUser.user_type
                }, { onConflict: 'id' })
                .select('id,email,first_name,last_name,phone_number,user_type')
                .single()

            if (error) {
                return fallbackUser
            }

            return data || fallbackUser
        }

        const routeForUser = (user) => {
            if (!user?.user_type) {
                router.replace('/choose-role')
                return true
            }

            if (requiredRole && user.user_type !== requiredRole) {
                if (user.user_type === 'worker') {
                    router.replace('/worker-profile')
                } else if (user.user_type === 'client') {
                    router.replace('/client-profile')
                } else {
                    router.replace('/choose-role')
                }
                return true
            }

            if (redirectLoggedInTo) {
                router.replace(redirectLoggedInTo)
                return true
            }

            return false
        }

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
                const fallbackUser = buildFallbackUser(session.user)

                // Get user profile from database (only essential fields, use indexed id lookup)
                const profilePromise = Promise.race([
                    supabase
                        .from('users')
                        .select('id,email,first_name,last_name,phone_number,user_type')
                        .eq('id', session.user.id)
                        .single(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
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

                let user = profile || fallbackUser

                // Ensure new users have a profile row immediately (no delayed insert).
                if (!profile) {
                    user = await ensureProfileExists(session.user, fallbackUser)
                }

                setAuthState({
                    isLoggedIn: true,
                    user,
                    isLoading: false,
                    isChecking: false
                })

                routeForUser(user)
            } else {
                if (redirectToLogin) {
                    router.replace('/login')
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
                    const fallbackUser = buildFallbackUser(session.user)

                    // Get user profile from database using user ID for faster query
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('id,email,first_name,last_name,phone_number,user_type')
                        .eq('id', session.user.id)
                        .single()

                    if (profileError && profileError.code !== 'PGRST116') {
                        console.error('Error fetching user profile:', profileError)
                    }

                    let user = profile || fallbackUser

                    if (!profile) {
                        user = await ensureProfileExists(session.user, fallbackUser)
                    }

                    setAuthState({
                        isLoggedIn: true,
                        user,
                        isLoading: false,
                        isChecking: false
                    })

                    routeForUser(user)
                } else if (event === 'SIGNED_OUT') {
                    setAuthState({
                        isLoggedIn: false,
                        user: null,
                        isLoading: false,
                        isChecking: false
                    })

                    if (redirectToLogin) {
                        router.replace('/login')
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
