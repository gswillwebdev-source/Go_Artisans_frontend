'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { supabase } from '@/lib/supabase'

export default function PostHogInit() {
    const pathname = usePathname()

    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

        if (!key || posthog.__loaded) {
            return
        }

        posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            person_profiles: 'identified_only',
            capture_pageview: false,
            capture_pageleave: true,
            session_recording: {
                maskAllInputs: true,
            },
        })
    }, [])

    useEffect(() => {
        if (!posthog.__loaded || !pathname) {
            return
        }

        const query = typeof window !== 'undefined' ? window.location.search : ''
        const currentUrl = `${pathname}${query}`

        posthog.capture('$pageview', {
            $current_url: currentUrl,
        })
    }, [pathname])

    useEffect(() => {
        if (!posthog.__loaded) {
            return
        }

        let isMounted = true

        const identifySessionUser = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!isMounted) {
                return
            }

            const user = session?.user

            if (user?.id) {
                posthog.identify(user.id, {
                    email: user.email,
                    user_type: user.user_metadata?.user_type,
                })
            }
        }

        identifySessionUser()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            const user = session?.user

            if (event === 'SIGNED_OUT' || !user?.id) {
                posthog.reset()
                return
            }

            posthog.identify(user.id, {
                email: user.email,
                user_type: user.user_metadata?.user_type,
            })
        })

        return () => {
            isMounted = false
            subscription?.unsubscribe()
        }
    }, [])

    return null
}