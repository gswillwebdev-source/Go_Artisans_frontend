import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

export const FREE_APPLY_LIMIT = 10;
export const PRO_APPLY_LIMIT = 35;
export const FREE_JOB_POST_LIMIT = 15;
export const PRO_JOB_POST_LIMIT = 60;
export const FREE_PORTFOLIO_LIMIT = 5;
export const PRO_PORTFOLIO_LIMIT = 15;
export const FREE_ALERT_LIMIT = 5;
export const PRO_ALERT_LIMIT = 15;

export function SubscriptionProvider({ children }) {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [usage, setUsage] = useState({ job_applications: 0, job_posts: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSubscription();
            fetchUsage();
        } else {
            setSubscription(null);
            setLoading(false);
        }
    }, [user]);

    async function fetchSubscription() {
        try {
            const { data } = await supabase.rpc('get_user_subscription', { p_user_id: user.id });
            setSubscription(data);
        } catch {
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    }

    async function fetchUsage() {
        if (!user) return;
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const [appsRes, postsRes] = await Promise.all([
            supabase.from('applications').select('id', { count: 'exact', head: true })
                .eq('worker_id', user.id).gte('created_at', firstOfMonth),
            supabase.from('jobs').select('id', { count: 'exact', head: true })
                .eq('client_id', user.id).gte('created_at', firstOfMonth),
        ]);
        setUsage({
            job_applications: appsRes.count || 0,
            job_posts: postsRes.count || 0,
        });
    }

    const planTier = subscription?.plan_id?.includes('premium') ? 'premium'
        : subscription?.plan_id?.includes('pro') ? 'pro' : 'free';
    const isFree = planTier === 'free';
    const isPro = planTier === 'pro';
    const isPremium = planTier === 'premium';

    function canApplyToJobs() {
        if (isPremium) return true;
        if (isPro) return usage.job_applications < PRO_APPLY_LIMIT;
        return usage.job_applications < FREE_APPLY_LIMIT;
    }

    function canPostJobs() {
        if (isPremium) return true;
        if (isPro) return usage.job_posts < PRO_JOB_POST_LIMIT;
        return usage.job_posts < FREE_JOB_POST_LIMIT;
    }

    return (
        <SubscriptionContext.Provider value={{
            subscription, usage, loading,
            planTier, isFree, isPro, isPremium,
            canApplyToJobs, canPostJobs,
            refreshSubscription: fetchSubscription,
            FREE_APPLY_LIMIT, PRO_APPLY_LIMIT,
            FREE_JOB_POST_LIMIT, PRO_JOB_POST_LIMIT,
            FREE_PORTFOLIO_LIMIT, PRO_PORTFOLIO_LIMIT,
            FREE_ALERT_LIMIT, PRO_ALERT_LIMIT,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

const DEFAULT_SUBSCRIPTION_VALUE = {
    subscription: null,
    usage: { job_applications: 0, job_posts: 0 },
    loading: false,
    planTier: 'free',
    isFree: true,
    isPro: false,
    isPremium: false,
    canApplyToJobs: () => true,
    canPostJobs: () => true,
    refreshSubscription: () => { },
    FREE_APPLY_LIMIT,
    PRO_APPLY_LIMIT,
    FREE_JOB_POST_LIMIT,
    PRO_JOB_POST_LIMIT,
    FREE_PORTFOLIO_LIMIT,
    PRO_PORTFOLIO_LIMIT,
    FREE_ALERT_LIMIT,
    PRO_ALERT_LIMIT,
};

export function useSubscription() {
    return useContext(SubscriptionContext) ?? DEFAULT_SUBSCRIPTION_VALUE;
}
