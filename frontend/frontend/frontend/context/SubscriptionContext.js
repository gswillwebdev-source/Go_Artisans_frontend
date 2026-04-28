'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState(null)
    const [badge, setBadge] = useState(null)
    const [usage, setUsage] = useState({ job_applications: 0, direct_messages: 0, job_posts: 0, portfolio_views: 0 })
    const [loading, setLoading] = useState(true)

    const fetchSubscription = useCallback(async () => {
        try {
            // Use getSession() instead of getUser() — reads from cache, no lock contention
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (!user) {
                setSubscription(null)
                setBadge(null)
                setLoading(false)
                return
            }

            // Fetch subscription via Supabase RPC (bypasses backend auth complexity)
            const { data: subData } = await supabase
                .rpc('get_user_subscription', { p_user_id: user.id })

            const { data: badgeData } = await supabase
                .from('verification_badges')
                .select('status, badge_type, verified_fields')
                .eq('user_id', user.id)
                .maybeSingle()

            // Count job applications made this calendar month (for free-tier limit enforcement)
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const { count: appCount } = await supabase
                .from('applications')
                .select('id', { count: 'exact', head: true })
                .eq('worker_id', user.id)
                .gte('created_at', startOfMonth.toISOString())

            // Count jobs posted this calendar month (for free-tier client limit)
            const { data: userTypeRow } = await supabase
                .from('users')
                .select('user_type')
                .eq('id', user.id)
                .single()

            let jobPostCount = 0
            if (userTypeRow?.user_type === 'client') {
                const { count: postCount } = await supabase
                    .from('jobs')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', user.id)
                    .gte('created_at', startOfMonth.toISOString())
                jobPostCount = postCount || 0
            }

            // Count portfolio views this calendar month (for pro-tier limit)
            let portfolioViewCount = 0
            const planIdNow = subData?.[0]?.plan_id ?? null
            const planTierNow = planIdNow ? (planIdNow.split('_')[1] || 'free') : 'free'
            if (planTierNow === 'pro') {
                const viewMonth = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`
                const { count: pvCount } = await supabase
                    .from('portfolio_views')
                    .select('id', { count: 'exact', head: true })
                    .eq('viewer_id', user.id)
                    .eq('view_month', viewMonth)
                portfolioViewCount = pvCount || 0
            }

            setSubscription(subData?.[0] || null)
            setBadge(badgeData || null)
            setUsage(prev => ({ ...prev, job_applications: appCount || 0, job_posts: jobPostCount, portfolio_views: portfolioViewCount }))
        } catch (err) {
            console.error('SubscriptionContext error:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSubscription()

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) fetchSubscription()
            if (event === 'SIGNED_OUT') {
                setSubscription(null)
                setBadge(null)
                setLoading(false)
            }
        })

        return () => authSub?.unsubscribe()
    }, [fetchSubscription])

    // Helpers
    const planTier = subscription?.plan_id?.split('_')[1] || 'free'
    const isFree = planTier === 'free'
    const isPro = planTier === 'pro'
    const isPremium = planTier === 'premium'
    const isTrialing = subscription?.is_trialing || false
    const isVerified = badge?.status === 'approved'

    // Free = 10 applications/month, Pro = 35/month, Premium = unlimited
    const FREE_APPLY_LIMIT = 10
    const PRO_APPLY_LIMIT = 35

    // Free clients: 15 job posts/month; Pro: 60/month; Premium: unlimited
    const FREE_JOB_POST_LIMIT = 15
    const PRO_JOB_POST_LIMIT = 60
    // Pro clients: 60 unique worker portfolios/month (by upsert de-dup); Premium: unlimited
    const PRO_PORTFOLIO_VIEW_LIMIT = 60

    const canApplyToJobs = useCallback(() => {
        if (isPremium || isTrialing) return true
        if (isPro) return usage.job_applications < PRO_APPLY_LIMIT
        // Free tier: 10 per calendar month
        return usage.job_applications < FREE_APPLY_LIMIT
    }, [isPro, isPremium, isTrialing, usage.job_applications])

    const canPostJobs = useCallback(() => {
        if (isPremium || isTrialing) return true
        if (isPro) return usage.job_posts < PRO_JOB_POST_LIMIT
        // Free: hard cap of 15 per calendar month
        return usage.job_posts < FREE_JOB_POST_LIMIT
    }, [isPro, isPremium, isTrialing, usage.job_posts])

    const canViewPortfolio = useCallback(() => {
        if (isPremium || isTrialing || isFree) return true // free sees nothing anyway; premium unlimited
        if (isPro) return usage.portfolio_views < PRO_PORTFOLIO_VIEW_LIMIT
        return true
    }, [isFree, isPro, isPremium, isTrialing, usage.portfolio_views])

    const canSendMessage = useCallback(() => {
        if (!subscription) return false
        const limit = subscription.limits?.direct_messages_per_month
        if (limit === undefined || limit === 0) return false
        if (limit === -1) return true
        return usage.direct_messages < limit
    }, [subscription, usage])

    const PRO_PORTFOLIO_LIMIT = 15
    const PRO_ALERT_LIMIT = 15

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            badge,
            usage,
            loading,
            planTier,
            isFree,
            isPro,
            isPremium,
            isTrialing,
            isVerified,
            canApplyToJobs,
            canPostJobs,
            canSendMessage,
            canViewPortfolio,
            monthlyAppCount: usage.job_applications,
            jobPostsThisMonth: usage.job_posts,
            portfolioViewsThisMonth: usage.portfolio_views,
            FREE_APPLY_LIMIT,
            PRO_APPLY_LIMIT,
            FREE_JOB_POST_LIMIT,
            PRO_JOB_POST_LIMIT,
            PRO_PORTFOLIO_VIEW_LIMIT,
            FREE_PORTFOLIO_LIMIT: 5,
            FREE_ALERT_LIMIT: 5,
            PRO_PORTFOLIO_LIMIT,
            PRO_ALERT_LIMIT,
            refresh: fetchSubscription
        }}>
            {children}
        </SubscriptionContext.Provider>
    )
}

export function useSubscription() {
    const ctx = useContext(SubscriptionContext)
    if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
    return ctx
}
