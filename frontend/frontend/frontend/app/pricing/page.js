'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/context/SubscriptionContext'
import PlanBadge from '@/components/PlanBadge'

// ── Plan definitions (mirrors SQL seed data) ─────────────────────────────────
const WORKER_PLANS = [
    {
        id: 'worker_free',
        name: 'Free',
        price: { monthly: 0, yearly: 0 },
        badge: null,
        trial: false,
        cta: 'Get Started',
        highlight: false,
        features: [
            'Basic profile',
            'Apply to 10 jobs per month',
            'Basic job search',
            'Standard search ranking',
            'Follow other users',
            'Browse workers & clients',
        ],
        limits: [
            'No WhatsApp contact access',
            'No profile views history',
            'No verification badge',
            'Ads shown between content',
        ],
    },
    {
        id: 'worker_pro',
        name: 'Pro',
        price: { monthly: 4.99, yearly: 49.99 },
        badge: 'pro',
        trial: true,
        trialDays: 14,
        cta: 'Start Free Trial',
        highlight: true,
        features: [
            'Apply to 35 jobs per month',
            'WhatsApp contact access',
            'See who viewed your profile',
            'Job alerts & notifications',
            'Priority ranking in search results',
            '⭐ Pro gold badge on profile',
            '🔵 Eligibility for verification badge',
            'No ads',
        ],
        limits: [],
    },
    {
        id: 'worker_premium',
        name: 'Premium',
        price: { monthly: 9.99, yearly: 95.90 },
        badge: 'premium',
        trial: false,
        cta: 'Go Premium',
        highlight: false,
        features: [
            'Everything in Pro',
            'Unlimited portfolio images & videos',
            '💎 Premium diamond badge on profile',
            '🤖 AI-powered job matching (exclusive)',
            'Top placement in search results',
            '⭐ Priority support (dedicated channel)',
        ],
        limits: [],
    },
]

const CLIENT_PLANS = [
    {
        id: 'client_free',
        name: 'Free',
        price: { monthly: 0, yearly: 0 },
        badge: null,
        trial: false,
        cta: 'Get Started',
        highlight: false,
        features: [
            'Basic profile',
            'Post up to 15 jobs per month',
            'Browse workers (name, title, location, email)',
            'Contact workers via email',
            'Receive unlimited applications',
        ],
        limits: [
            'Worker profile details hidden (upgrade to see more)',
            'No portfolio access',
            'No job posting analytics',
            'No saved workers list',
        ],
    },
    {
        id: 'client_pro',
        name: 'Pro',
        price: { monthly: 14.99, yearly: 149.99 },
        badge: 'pro',
        trial: true,
        trialDays: 14,
        cta: 'Start Free Trial',
        highlight: true,
        features: [
            'Post up to 60 jobs per month',
            'Full worker profile access',
            'View worker portfolios (60 per month)',
            'Receive unlimited applications',
            'Job posting analytics',
            'See your profile views',
            '⭐ Pro badge — listed above free clients',
            '🔵 Eligibility for verification badge',
        ],
        limits: [],
    },
    {
        id: 'client_premium',
        name: 'Premium',
        price: { monthly: 29.99, yearly: 299.99 },
        badge: 'premium',
        trial: false,
        cta: 'Go Premium',
        highlight: false,
        features: [
            'Everything in Pro',
            'Unlimited job posts',
            'Unlimited portfolio views',
            'Advanced applicant analytics',
            'Unlimited saved workers list',
            '💎 Premium badge — listed above all',
            '⚡ Dedicated support channel (4-hour response)',
        ],
        limits: [],
    },
]

function PlanCard({ plan, billing, userRole, currentPlanId, onSelect, loadingPlanId }) {
    const isCurrent = plan.id === currentPlanId
    const isLoading = loadingPlanId === plan.id
    const price = billing === 'yearly' ? plan.price.yearly : plan.price.monthly
    const saving = billing === 'yearly' && plan.price.monthly > 0
        ? Math.round((1 - plan.price.yearly / (plan.price.monthly * 12)) * 100)
        : 0

    return (
        <div className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all
            ${plan.highlight
                ? 'border-blue-500 shadow-xl shadow-blue-100 scale-105 bg-white'
                : 'border-slate-200 shadow-md bg-white hover:border-blue-300 hover:shadow-lg'
            }`}
        >
            {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                        MOST POPULAR
                    </span>
                </div>
            )}

            {plan.trial && (
                <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                        {plan.trialDays}-DAY FREE TRIAL
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                    {plan.badge === 'pro' && <PlanBadge planTier="pro" showLabel={false} />}
                    {plan.badge === 'premium' && <PlanBadge planTier="premium" showLabel={false} />}
                </div>

                <div className="flex items-end gap-1 mt-2">
                    {price === 0 ? (
                        <span className="text-4xl font-extrabold text-slate-800">Free</span>
                    ) : (
                        <>
                            <span className="text-4xl font-extrabold text-slate-800">${price}</span>
                            <span className="text-slate-500 text-sm mb-1">
                                /{billing === 'yearly' ? 'yr' : 'mo'}
                            </span>
                        </>
                    )}
                </div>

                {saving > 0 && (
                    <p className="text-green-600 text-sm font-semibold mt-1">
                        Save {saving}% vs monthly
                    </p>
                )}

                {plan.trial && price > 0 && (
                    <p className="text-slate-500 text-xs mt-1">
                        Then ${plan.price.monthly}/mo after trial · No card required to start
                    </p>
                )}
            </div>

            {/* CTA */}
            <button
                onClick={() => onSelect(plan)}
                disabled={isCurrent || isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition mb-5
                    ${isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-default border border-slate-200'
                        : plan.highlight
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                            : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
            >
                {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Processing…
                    </span>
                ) : isCurrent ? '✓ Current Plan' : plan.cta}
            </button>

            {/* Features */}
            <ul className="space-y-2 flex-1">
                {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                    </li>
                ))}
                {plan.limits.map((l, i) => (
                    <li key={`limit-${i}`} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="mt-0.5 shrink-0">—</span>
                        <span>{l}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default function PricingPage() {
    const router = useRouter()
    const { subscription, planTier, refresh } = useSubscription()
    const [userRole, setUserRole] = useState(null)
    const [billing, setBilling] = useState('monthly')
    const [activeTab, setActiveTab] = useState('worker')
    const [loadingPlanId, setLoadingPlanId] = useState(null)
    const [message, setMessage] = useState(null)
    const [user, setUser] = useState(null)
    const [payModal, setPayModal] = useState(null)
    // payModal shape: { plan, billing, step }
    // step: 'choose_method' | 'whatsapp_sent' | 'verifying'

    useEffect(() => {
        async function init() {
            const { data: { session } } = await supabase.auth.getSession()
            const u = session?.user
            if (u) {
                setUser(u)
                const { data: profile } = await supabase
                    .from('users')
                    .select('user_type')
                    .eq('id', u.id)
                    .single()
                if (profile?.user_type) {
                    setUserRole(profile.user_type)
                    setActiveTab(profile.user_type === 'client' ? 'client' : 'worker')
                }
            }
        }
        init()
    }, [])

    const currentPlanId = subscription?.plan_id || null
    const plans = activeTab === 'client' ? CLIENT_PLANS : WORKER_PLANS

    const handleSelect = async (plan) => {
        if (!user) {
            router.push('/login?redirect=/pricing')
            return
        }
        if (plan.price.monthly === 0) {
            router.push('/subscription')
            return
        }
        // Always show the payment method chooser first
        setPayModal({ plan, billing, step: 'choose_method' })
    }

    // ── WhatsApp payment: record pending request then open WhatsApp ─────────
    const handleWhatsAppPayment = async () => {
        if (!payModal) return
        const { plan, billing: bc } = payModal
        setLoadingPlanId(`${plan.id}_whatsapp`)

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession()
            // Record the pending request in the DB so admin can activate it
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/request-whatsapp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession?.access_token}`
                },
                body: JSON.stringify({ plan_id: plan.id, billing_cycle: bc })
            })
        } catch (_) { /* non-blocking — still open WhatsApp */ }

        const price = bc === 'yearly' ? plan.price.yearly : plan.price.monthly
        const msg = encodeURIComponent(
            `Hi GoArtisans! 👋\n\nI'd like to subscribe to the *${plan.name} Plan* (${bc}, $${price}/${bc === 'yearly' ? 'yr' : 'mo'}).\n\nMy account email: ${user?.email}\n\nPlease activate my plan once payment is confirmed. Thank you!`
        )
        // 228 = Togo country code
        window.open(`https://wa.me/22893495719?text=${msg}`, '_blank')
        setPayModal(prev => ({ ...prev, step: 'whatsapp_sent' }))
        setLoadingPlanId(null)
    }

    // ── FedaPay $1 verification ──────────────────────────────────────────────
    const handleFedaPayVerify = async () => {
        if (!payModal) return
        const { plan, billing: bc } = payModal
        setLoadingPlanId(`${plan.id}_fedapay`)
        setPayModal(prev => ({ ...prev, step: 'verifying' }))
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession()
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/verify-and-subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession?.access_token}`
                },
                body: JSON.stringify({ plan_id: plan.id, billing_cycle: bc })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Payment failed')
            if (data.checkout_url) {
                window.location.href = data.checkout_url
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message })
            setPayModal(null)
        } finally {
            setLoadingPlanId(null)
        }
    }

    // ── Free trial via FedaPay card verification ($1 refunded → trial activates on webhook) ──
    const handleTrialCheckout = async () => {
        if (!payModal) return
        const { plan, billing: bc } = payModal
        setLoadingPlanId(`${plan.id}_trial`)
        setPayModal(prev => ({ ...prev, step: 'verifying' }))
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession()
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/trial-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession?.access_token}`
                },
                body: JSON.stringify({ plan_id: plan.id, billing_cycle: bc })
            })
            const data = await res.json()
            if (!res.ok) {
                if (res.status === 409) {
                    setMessage({ type: 'error', text: 'You have already used your free trial for this plan.' })
                    setPayModal(null)
                    setLoadingPlanId(null)
                    return
                }
                throw new Error(data.error || 'Failed to start trial')
            }
            // Always redirects to FedaPay for card verification
            if (data.checkout_url) {
                window.location.href = data.checkout_url
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message })
            setPayModal(null)
        } finally {
            setLoadingPlanId(null)
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
            {/* Hero */}
            <section className="text-center py-16 px-4">
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                    💎 Upgrade Your Experience
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Choose the plan that<br className="hidden sm:block" /> fits your goals
                </h1>
                <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-8">
                    Whether you are an artisan looking for work or an employer seeking talent,
                    GoArtisans has a plan designed for you.
                </p>

                {/* Billing toggle */}
                <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm mb-4">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${billing === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${billing === 'yearly' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Yearly
                        <span className="ml-1.5 text-xs text-green-600 font-bold">Save 20%</span>
                    </button>
                </div>
            </section>

            {/* Tab switcher */}
            <div className="max-w-4xl mx-auto px-4 mb-10">
                <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm max-w-sm mx-auto">
                    <button
                        onClick={() => setActiveTab('worker')}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${activeTab === 'worker' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        🔨 For Workers
                    </button>
                    <button
                        onClick={() => setActiveTab('client')}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${activeTab === 'client' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        🏢 For Employers
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`max-w-2xl mx-auto px-4 mb-8`}>
                    <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                </div>
            )}

            {/* Plan cards */}
            <section className="max-w-6xl mx-auto px-4 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {plans.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            billing={billing}
                            userRole={userRole}
                            currentPlanId={currentPlanId}
                            onSelect={handleSelect}
                            loadingPlanId={loadingPlanId}
                        />
                    ))}
                </div>

                {/* Comparison note */}
                <p className="text-center text-slate-500 text-sm mt-10">
                    All paid plans include a cancel-anytime option. Prices in USD.
                    Need help?{' '}
                    <button
                        onClick={() => window.open('https://wa.me/22893495719?text=' + encodeURIComponent('Hi GoArtisans! I need help with my subscription.'), '_blank')}
                        className="text-blue-600 underline cursor-pointer"
                    >
                        Contact us on WhatsApp
                    </button>
                </p>
            </section>

            {/* ── Unified Payment Method Modal ── */}
            {payModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">

                        {/* ── STEP: choose_method ── */}
                        {payModal.step === 'choose_method' && (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">Choose Payment Method</h3>
                                    <button onClick={() => setPayModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                                </div>

                                {/* Plan summary */}
                                <div className="bg-slate-50 rounded-xl p-4 mb-5">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your selected plan</p>
                                    <p className="font-bold text-slate-900 text-lg">{payModal.plan.name} Plan</p>
                                    <p className="text-blue-600 font-semibold">
                                        ${payModal.billing === 'yearly' ? payModal.plan.price.yearly : payModal.plan.price.monthly}
                                        /{payModal.billing === 'yearly' ? 'yr' : 'mo'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* ── FedaPay (Mobile Money / Card) ── */}
                                    <button
                                        onClick={handleFedaPayVerify}
                                        disabled={!!loadingPlanId}
                                        className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-green-500 rounded-xl transition group disabled:opacity-60"
                                    >
                                        <div className="bg-green-100 p-2 rounded-lg shrink-0">
                                            <span className="text-2xl">🌍</span>
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-semibold text-slate-800">Pay via FedaPay</p>
                                            <p className="text-xs text-slate-500">Mobile Money · Flooz · T-Money · Visa · Mastercard</p>
                                            <p className="text-xs text-amber-600 mt-0.5">A $1 verification charge is deducted and immediately refunded.</p>
                                        </div>
                                        {loadingPlanId === `${payModal.plan.id}_fedapay`
                                            ? <span className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full shrink-0"></span>
                                            : <span className="text-slate-400 group-hover:text-green-500 shrink-0">→</span>
                                        }
                                    </button>

                                    {/* ── WhatsApp (manual activation) ── */}
                                    <button
                                        onClick={handleWhatsAppPayment}
                                        disabled={!!loadingPlanId}
                                        className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-green-500 rounded-xl transition group disabled:opacity-60"
                                    >
                                        <div className="bg-green-100 p-2 rounded-lg shrink-0">
                                            <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.524 5.855L.057 23.882l6.196-1.453A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.005-1.37l-.36-.213-3.68.863.927-3.578-.234-.372A9.818 9.818 0 1112 21.818z" />
                                            </svg>
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-semibold text-slate-800">Pay via WhatsApp</p>
                                            <p className="text-xs text-slate-500">Send us a WhatsApp message — admin activates your plan after payment.</p>
                                        </div>
                                        {loadingPlanId === `${payModal.plan.id}_whatsapp`
                                            ? <span className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full shrink-0"></span>
                                            : <span className="text-slate-400 group-hover:text-green-500 shrink-0">→</span>
                                        }
                                    </button>

                                    {/* ── Free trial (only if the plan offers a trial) ── */}
                                    {payModal.plan.trial && (
                                        <button
                                            onClick={handleTrialCheckout}
                                            disabled={!!loadingPlanId}
                                            className="w-full flex items-center gap-4 p-4 border-2 border-blue-200 hover:border-blue-500 rounded-xl transition group disabled:opacity-60"
                                        >
                                            <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                                                <span className="text-2xl">🎉</span>
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-semibold text-slate-800">Start {payModal.plan.trialDays}-Day Free Trial</p>
                                                <p className="text-xs text-slate-500">Enter your card via FedaPay — <strong>not charged today</strong>.</p>
                                                <p className="text-xs text-amber-600 mt-0.5">A $1 card verification is charged and immediately refunded. Billing begins on day {payModal.plan.trialDays}.</p>
                                            </div>
                                            {loadingPlanId === `${payModal.plan.id}_trial`
                                                ? <span className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full shrink-0"></span>
                                                : <span className="text-slate-400 group-hover:text-blue-500 shrink-0">→</span>
                                            }
                                        </button>
                                    )}
                                </div>

                                <p className="text-center text-xs text-slate-400 mt-4">
                                    🔒 Secure checkout · Cancel anytime
                                </p>
                            </>
                        )}

                        {/* ── STEP: verifying (redirect in progress) ── */}
                        {payModal.step === 'verifying' && (
                            <div className="text-center py-8">
                                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
                                    <span className="animate-spin h-7 w-7 border-4 border-green-500 border-t-transparent rounded-full"></span>
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Redirecting to FedaPay…</h3>
                                <p className="text-sm text-slate-500">You will be charged $1 to verify your payment method. This fee is refunded immediately after confirmation.</p>
                            </div>
                        )}

                        {/* ── STEP: whatsapp_sent ── */}
                        {payModal.step === 'whatsapp_sent' && (
                            <>
                                <div className="text-center py-4">
                                    <span className="text-5xl">✅</span>
                                    <h3 className="text-lg font-bold text-slate-900 mt-3 mb-2">Request Sent!</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Your subscription request has been recorded. Please complete the payment on WhatsApp — our admin will activate your <strong>{payModal.plan.name}</strong> plan within <strong>24 hours</strong> after confirming payment.
                                    </p>
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left mb-5">
                                        <p className="text-xs text-amber-700">
                                            💡 If WhatsApp didn't open automatically,{' '}
                                            <button
                                                className="underline font-semibold"
                                                onClick={() => {
                                                    const price = payModal.billing === 'yearly' ? payModal.plan.price.yearly : payModal.plan.price.monthly
                                                    const msg = encodeURIComponent(`Hi GoArtisans! 👋\n\nI'd like to subscribe to the *${payModal.plan.name} Plan* (${payModal.billing}, $${price}/${payModal.billing === 'yearly' ? 'yr' : 'mo'}).\n\nMy account email: ${user?.email}\n\nPlease activate my plan once payment is confirmed. Thank you!`)
                                                    window.open(`https://wa.me/22893495719?text=${msg}`, '_blank')
                                                }}
                                            >
                                                tap here to open WhatsApp
                                            </button>.
                                        </p>
                                    </div>
                                    <button onClick={() => setPayModal(null)} className="w-full bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-700 transition">
                                        Done
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* FAQ */}
            <section className="max-w-3xl mx-auto px-4 py-16">
                <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {[
                        {
                            q: 'How does the 14-day free trial work?',
                            a: 'Click "Start Free Trial" in the payment chooser. You\'ll be taken to FedaPay to enter your card — a $1 verification charge is made and immediately refunded to confirm your card is valid. Your 14-day trial starts the moment the card is verified. At the end of the trial, you will automatically receive a payment email with a checkout link for your first subscription payment. If no payment is made within 3 days, your subscription is automatically disabled.'
                        },
                        {
                            q: 'What is the $1 verification charge?',
                            a: 'To confirm your payment method works, we charge $1 (655 XOF) through FedaPay. This amount is refunded immediately after confirmation. It is a one-time check to activate your plan automatically.'
                        },
                        {
                            q: 'How does WhatsApp payment work?',
                            a: 'Choose "Pay via WhatsApp", send us a message, and complete the payment arrangement with our admin. Once payment is confirmed, your plan is activated manually within 24 hours.'
                        },
                        {
                            q: 'Can I cancel anytime?',
                            a: 'Yes. You can cancel your subscription at any time. You will retain access until the end of your current billing period.'
                        },
                        {
                            q: 'Can I switch between monthly and yearly billing?',
                            a: 'Yes. You can switch billing cycles at any time. The change will take effect at the start of your next billing period.'
                        },
                        {
                            q: 'Is there a difference between worker and client plans?',
                            a: 'Yes. Worker plans are optimised for job seekers and artisans — with features like unlimited applications and profile visibility. Client/Employer plans focus on posting jobs and finding the right talent.'
                        },
                    ].map(({ q, a }, i) => (
                        <details key={i} className="bg-white border border-slate-200 rounded-xl p-5 group">
                            <summary className="font-semibold text-slate-800 cursor-pointer list-none flex justify-between items-center">
                                {q}
                                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-slate-600 text-sm leading-relaxed">{a}</p>
                        </details>
                    ))}
                </div>
            </section>
        </main>
    )
}
