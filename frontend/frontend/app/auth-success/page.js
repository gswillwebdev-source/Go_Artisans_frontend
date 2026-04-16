'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthSuccessPage() {
    const router = useRouter()

    useEffect(() => {
        const handleAuthSuccess = async () => {
            try {
                const params = typeof window !== 'undefined'
                    ? new URLSearchParams(window.location.search)
                    : new URLSearchParams('')
                const callbackType = params.get('type')

                // Get the current session from Supabase
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Error getting session:', error)
                    router.push('/login')
                    return
                }

                if (session?.user) {
                    const isExplicitlyLoggedOut = typeof window !== 'undefined' && localStorage.getItem('explicitLogout') === '1'
                    const isSignupVerificationCallback = callbackType === 'signup'

                    if (isExplicitlyLoggedOut && isSignupVerificationCallback) {
                        await supabase.auth.signOut()
                        router.push('/login')
                        return
                    }

                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('explicitLogout')
                    }

                    if (session.user.email_confirmed_at) {
                        // Mirror Supabase Auth verification state into public.users for UI checks.
                        await supabase
                            .from('users')
                            .update({ email_verified: true })
                            .eq('id', session.user.id)
                    }

                    // Get user profile to check role
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('user_type,email_verified')
                        .eq('id', session.user.id)
                        .single()

                    if (profileError && profileError.code !== 'PGRST116') {
                        console.error('Error fetching profile:', profileError)
                    }

                    const resolvedRole = profile?.user_type || session.user.user_metadata?.user_type || null

                    // Redirect based on user role
                    if (resolvedRole === 'worker') {
                        router.push('/worker-profile')
                    } else if (resolvedRole === 'client') {
                        router.push('/client-profile')
                    } else {
                        // No role assigned yet, show role selection
                        router.push('/choose-role')
                    }
                } else {
                    router.push('/login')
                }
            } catch (err) {
                console.error('Auth success error:', err)
                router.push('/login')
            }
        }

        handleAuthSuccess()
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="inline-block mb-4">
                    <div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div>
                </div>
                <h2 className="text-2xl font-bold mb-4">Completing your login...</h2>
                <p className="text-gray-600">Please wait while we authenticate you.</p>
            </div>
        </div>
    )
}
