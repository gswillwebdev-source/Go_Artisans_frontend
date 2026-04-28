'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/context/SubscriptionContext'
import PlanBadge from '@/components/PlanBadge'

const PLAN_LABELS = {
    worker_free: 'Free',
    worker_pro: 'Pro',
    worker_premium: 'Premium',
    client_free: 'Free',
    client_pro: 'Pro',
    client_premium: 'Premium',
}

const PLAN_PRICES = {
    worker_pro: { monthly: 9.99, yearly: 99.99 },
    worker_premium: { monthly: 19.99, yearly: 199.99 },
    client_pro: { monthly: 14.99, yearly: 149.99 },
    client_premium: { monthly: 29.99, yearly: 299.99 },
}

function SubscriptionPageContent() {
    const router = useRouter()
    const params = useSearchParams()
    const { subscription, badge, usage, loading, planTier, isVerified, refresh } = useSubscription()

    const [user, setUser] = useState(null)
    const [activeTab, setActiveTab] = useState(params.get('tab') || 'overview')
    const [cancelling, setCancelling] = useState(false)
    const [verifyLoading, setVerifyLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [viewers, setViewers] = useState([])
    const [viewersLoading, setViewersLoading] = useState(false)

    useEffect(() => {
        async function init() {
            const { data: { user: u } } = await supabase.auth.getUser()
            if (!u) { router.push('/login'); return }
            setUser(u)
        }
        init()
    }, [router])

    useEffect(() => {
        if (activeTab === 'viewers' && user) loadViewers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, user])

    const loadViewers = async () => {
        if (!user) return
        setViewersLoading(true)
        try {
            const lookback = subscription?.limits?.who_viewed_days || 0
            if (lookback === 0) { setViewers([]); return }

            const since = new Date()
            since.setDate(since.getDate() - lookback)

            const { data, error } = await supabase
                .from('profile_views')
                .select(`
                    viewed_at,
                    view_date,
                    viewer:viewer_id (id, first_name, last_name, job_title, profile_picture, user_type)
                `)
                .eq('viewed_id', user.id)
                .gte('view_date', since.toISOString().slice(0, 10))
                .order('viewed_at', { ascending: false })
                .limit(50)

            if (!error) setViewers(data || [])
        } finally {
            setViewersLoading(false)
        }
    }

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel? You will keep access until the end of your billing period.')) return
        setCancelling(true)
        try {
            const { error } = await supabase
                .from('user_subscriptions')
                .update({
                    cancel_at_period_end: true,
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing'])

            if (error) throw error
            await refresh()
            setMessage({ type: 'success', text: 'Subscription cancelled. You will keep access until the period ends.' })
        } catch {
            setMessage({ type: 'error', text: 'Failed to cancel. Please try again.' })
        } finally {
            setCancelling(false)
        }
    }

    const handleRequestVerification = async () => {
        setVerifyLoading(true)
        setMessage(null)
        try {
            const { error } = await supabase
                .from('verification_badges')
                .upsert({
                    user_id: user.id,
                    status: 'pending',
                    badge_type: 'identity',
                    verified_fields: ['email'],
                    submitted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (error) throw error
            await refresh()
            setMessage({ type: 'success', text: 'Verification request submitted! Our team will review it within 1–3 business days.' })
        } catch {
            setMessage({ type: 'error', text: 'Failed to submit verification. Please try again.' })
        } finally {
            setVerifyLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    const planId = subscription?.plan_id || 'free'
    const planName = PLAN_LABELS[planId] || 'Free'
    const badgeColor = subscription?.badge_color || 'none'
    const periodEnd = subscription?.period_end ? new Date(subscription.period_end) : null
    const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null
    const isTrialing = subscription?.is_trialing || false
    const prices = PLAN_PRICES[planId]
    const isCancelledAtEnd = subscription?.cancel_at_period_end

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'viewers', label: 'Who Viewed Me' },
        { id: 'verify', label: 'Verification' },
        { id: 'billing', label: 'Billing' },
    ]

    return (
        <main className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">My Subscription</h1>
                        <p className="text-slate-500 mt-1">Manage your plan, badge, and account perks</p>
                    </div>
                    <button
                        onClick={() => router.push('/pricing')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow"
                    >
                        Upgrade Plan
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                        <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                {/* Current plan card */}
                <div className={`rounded-2xl p-6 mb-6 text-white shadow-lg
                    ${badgeColor === 'diamond'
                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'
                        : badgeColor === 'gold'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                            : 'bg-gradient-to-r from-slate-700 to-slate-800'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-white/80 text-sm uppercase tracking-widest font-semibold">
                                    {planId.includes('worker') ? 'Worker' : 'Employer'} Plan
                                </span>
                                <PlanBadge planTier={planTier} isVerified={isVerified} size="sm" />
                            </div>
                            <h2 className="text-3xl font-extrabold">
                                {badgeColor === 'diamond' && '💎 '}
                                {badgeColor === 'gold' && '⭐ '}
                                {planName}
                            </h2>
                            {isTrialing && trialEnd && (
                                <p className="text-white/80 text-sm mt-1">
                                    Trial ends {trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            )}
                            {!isTrialing && periodEnd && planName !== 'Free' && (
                                <p className="text-white/80 text-sm mt-1">
                                    {isCancelledAtEnd ? 'Cancels' : 'Renews'} {periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            {prices && (
                                <>
                                    <div className="text-3xl font-extrabold">${prices.monthly}</div>
                                    <div className="text-white/70 text-sm">/month</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${activeTab === tab.id ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Overview ────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {/* Usage meters */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                {
                                    label: 'Job Applications',
                                    used: usage.job_applications,
                                    limit: subscription?.limits?.job_applications_per_month ?? 5,
                                    icon: '📋'
                                },
                                {
                                    label: 'Direct Messages',
                                    used: usage.direct_messages,
                                    limit: subscription?.limits?.direct_messages_per_month ?? 0,
                                    icon: '💬'
                                },
                                {
                                    label: 'Job Posts',
                                    used: usage.job_posts,
                                    limit: subscription?.limits?.job_posts_per_month ?? 2,
                                    icon: '📣'
                                },
                            ].map(({ label, used, limit, icon }) => (
                                <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span>{icon}</span>
                                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                                    </div>
                                    <div className="flex items-end gap-1 mb-2">
                                        <span className="text-2xl font-bold text-slate-900">{used}</span>
                                        <span className="text-slate-400 text-sm mb-0.5">
                                            {limit === -1 ? '/ ∞' : `/ ${limit}`}
                                        </span>
                                    </div>
                                    {limit !== -1 && limit > 0 && (
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div
                                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                    {limit === 0 && (
                                        <p className="text-xs text-slate-400 mt-1">Not available on this plan</p>
                                    )}
                                    {limit === -1 && (
                                        <p className="text-xs text-green-600 font-medium mt-1">Unlimited</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Features list */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-3">Plan Features</h3>
                            {subscription?.features ? (
                                <ul className="space-y-2">
                                    {subscription.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                            <span className="text-green-500">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500 text-sm">Upgrade to see your features.</p>
                            )}
                        </div>

                        {planName !== 'Free' && !isCancelledAtEnd && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <h4 className="font-semibold text-red-800 mb-1">Cancel Subscription</h4>
                                <p className="text-red-700 text-sm mb-3">
                                    You will keep all Pro/Premium features until your period ends.
                                </p>
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                    className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                                >
                                    {cancelling ? 'Cancelling…' : 'Cancel Subscription'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Who Viewed Me ───────────────────────────────── */}
                {activeTab === 'viewers' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">
                            Who Viewed Your Profile
                            {subscription?.limits?.who_viewed_days > 0 && (
                                <span className="text-slate-400 font-normal text-sm ml-2">
                                    (last {subscription.limits.who_viewed_days} days)
                                </span>
                            )}
                        </h3>

                        {planTier === 'free' ? (
                            <div className="text-center py-12">
                                <div className="text-5xl mb-3">👁️</div>
                                <p className="text-slate-600 mb-4">Upgrade to Pro or Premium to see who viewed your profile</p>
                                <button onClick={() => router.push('/pricing')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
                                    Upgrade Now
                                </button>
                            </div>
                        ) : viewersLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                            </div>
                        ) : viewers.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No profile views recorded yet.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {viewers.map((v, i) => (
                                    <li key={i} className="flex items-center gap-3 py-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                            {v.viewer?.first_name?.[0]}{v.viewer?.last_name?.[0]}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800 text-sm">
                                                {v.viewer?.first_name} {v.viewer?.last_name}
                                            </p>
                                            <p className="text-slate-500 text-xs">{v.viewer?.job_title || v.viewer?.user_type}</p>
                                        </div>
                                        <span className="text-slate-400 text-xs">
                                            {new Date(v.viewed_at).toLocaleDateString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* ── Tab: Verification ───────────────────────────────── */}
                {activeTab === 'verify' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0
                                ${isVerified ? 'bg-blue-100' : badge?.status === 'pending' ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                                {isVerified ? '✓' : badge?.status === 'pending' ? '⏳' : '?'}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">
                                    {isVerified ? 'You are verified!' : badge?.status === 'pending' ? 'Verification pending' : 'Get Verified'}
                                </h3>
                                <p className="text-slate-500 text-sm">
                                    {isVerified
                                        ? 'Your profile shows a blue ✓ verification badge. This builds trust with potential clients and workers.'
                                        : badge?.status === 'pending'
                                            ? 'Your verification request is under review. This typically takes 1–3 business days.'
                                            : 'A verified badge shows that your identity has been confirmed, making your profile more trustworthy.'}
                                </p>
                            </div>
                        </div>

                        {!isVerified && badge?.status !== 'pending' && (
                            <>
                                <div className="space-y-3 mb-6">
                                    <h4 className="font-semibold text-slate-700">What you need to verify:</h4>
                                    {[
                                        { icon: '📧', label: 'Email address', note: 'Confirmed when you signed up' },
                                        { icon: '📱', label: 'Phone number', note: 'We may send a verification code' },
                                        { icon: '🪪', label: 'Government ID', note: 'Optional — for professional badge' },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                                            <span className="text-xl">{item.icon}</span>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800">{item.label}</p>
                                                <p className="text-xs text-slate-500">{item.note}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleRequestVerification}
                                    disabled={verifyLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition w-full"
                                >
                                    {verifyLoading ? 'Submitting…' : 'Request Verification Badge'}
                                </button>
                            </>
                        )}

                        {badge?.status === 'rejected' && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                                <p className="text-red-700 text-sm font-semibold">Verification rejected</p>
                                {badge.rejection_reason && <p className="text-red-600 text-sm mt-1">{badge.rejection_reason}</p>}
                                <button onClick={handleRequestVerification} className="mt-3 text-sm text-blue-600 underline">
                                    Re-submit
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Billing ────────────────────────────────────── */}
                {activeTab === 'billing' && (
                    <div className="space-y-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Billing Summary</h3>
                            <dl className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Plan</dt>
                                    <dd className="font-semibold text-slate-800">{planName}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Status</dt>
                                    <dd>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                                            ${isTrialing ? 'bg-green-100 text-green-700' : isCancelledAtEnd ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {isTrialing ? 'Trialing' : isCancelledAtEnd ? 'Cancelled' : 'Active'}
                                        </span>
                                    </dd>
                                </div>
                                {prices && (
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">Amount</dt>
                                        <dd className="font-semibold text-slate-800">${prices.monthly}/mo</dd>
                                    </div>
                                )}
                                {periodEnd && planName !== 'Free' && (
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">{isCancelledAtEnd ? 'Access until' : 'Next billing'}</dt>
                                        <dd className="font-semibold text-slate-800">
                                            {periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                            <p className="font-semibold mb-1">💳 Payment Integration</p>
                            <p>Secure payment processing via Stripe. Your payment details are never stored on GoArtisans servers.</p>
                        </div>

                        <button
                            onClick={() => router.push('/pricing')}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm transition"
                        >
                            View All Plans
                        </button>
                    </div>
                )}
            </div>
        </main>
    )
}

function SubscriptionContent() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
            <SubscriptionPageContent />
        </Suspense>
    )
}

export default function SubscriptionPage() {
    return (
        <Suspense>
            <SubscriptionContent />
        </Suspense>
    )
}