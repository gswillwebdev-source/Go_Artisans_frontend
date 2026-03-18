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
            user_type: sessionUser.user_metadata?.user_type || null,
            email_verified: Boolean(sessionUser.email_confirmed_at)
        })

        const syncEmailVerified = async (sessionUser) => {
            if (!sessionUser?.email_confirmed_at) return

            await supabase
                .from('users')
                .update({ email_verified: true })
                .eq('id', sessionUser.id)
        }

        const ensureProfileExists = async (sessionUser, fallbackUser) => {
            const { data: existingProfile, error: existingProfileError } = await supabase
                .from('users')
                .select('id,email,first_name,last_name,phone_number,user_type,email_verified')
                .eq('id', sessionUser.id)
                .single()

            if (existingProfile) {
                return existingProfile
            }

            if (existingProfileError && existingProfileError.code !== 'PGRST116') {
                return fallbackUser
            }

            // Insert only when row is missing to avoid null-overwriting existing role.
            const insertPayload = {
                id: sessionUser.id,
                email: sessionUser.email,
                first_name: fallbackUser.first_name,
                last_name: fallbackUser.last_name,
                phone_number: fallbackUser.phone_number,
                email_verified: fallbackUser.email_verified
            }

            if (fallbackUser.user_type) {
                insertPayload.user_type = fallbackUser.user_type
            }

            const { data: insertedProfile, error: insertError } = await supabase
                .from('users')
                .insert(insertPayload)
                .select('id,email,first_name,last_name,phone_number,user_type,email_verified')
                .single()

            if (insertError) {
                // If another request inserted concurrently, fall back to a fresh read.
                const { data: raceWinnerProfile } = await supabase
                    .from('users')
                    .select('id,email,first_name,last_name,phone_number,user_type,email_verified')
                    .eq('id', sessionUser.id)
                    .single()

                return raceWinnerProfile || fallbackUser
            }

            return insertedProfile || fallbackUser
        }

        const getRoleFromDatabase = async (userId) => {
            if (!userId) return null

            const { data, error } = await supabase
                .from('users')
                .select('user_type')
                .eq('id', userId)
                .single()

            if (error || !data?.user_type) {
                return null
            }

            return data.user_type
        }

        const routeForUser = async (user) => {
            let resolvedUser = user

            if (!resolvedUser?.user_type && resolvedUser?.id) {
                const dbRole = await getRoleFromDatabase(resolvedUser.id)
                if (dbRole) {
                    resolvedUser = { ...resolvedUser, user_type: dbRole }
                    setAuthState((prev) => {
                        if (!prev?.user || prev.user.id !== resolvedUser.id) {
                            return prev
                        }
                        return { ...prev, user: resolvedUser }
                    })
                }
            }

            if (!resolvedUser?.user_type) {
                router.replace('/choose-role')
                return true
            }

            if (requiredRole && resolvedUser.user_type !== requiredRole) {
                if (resolvedUser.user_type === 'worker') {
                    router.replace('/worker-profile')
                } else if (resolvedUser.user_type === 'client') {
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
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('explicitLogout')
                }

                await syncEmailVerified(session.user)

                const fallbackUser = buildFallbackUser(session.user)

                // Get user profile from database (only essential fields, use indexed id lookup)
                const profilePromise = Promise.race([
                    supabase
                        .from('users')
                        .select('id,email,first_name,last_name,phone_number,user_type,email_verified')
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

                await routeForUser(user)
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
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('explicitLogout')
                    }

                    await syncEmailVerified(session.user)

                    const fallbackUser = buildFallbackUser(session.user)

                    // Get user profile from database using user ID for faster query
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('id,email,first_name,last_name,phone_number,user_type,email_verified')
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

                    await routeForUser(user)
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
