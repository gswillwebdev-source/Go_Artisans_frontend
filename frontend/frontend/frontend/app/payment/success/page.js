'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/context/SubscriptionContext'

function SuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { refresh } = useSubscription()
    const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
    const planId = searchParams.get('plan')
    const isTrial = searchParams.get('trial') === '1'

    useEffect(() => {
        async function activate() {
            try {
                // FedaPay webhook activates subscription automatically — just refresh context
                await refresh()
                setStatus('success')
                setTimeout(() => router.push('/subscription'), 5000)
            } catch (err) {
                console.error('Activation error:', err)
                setStatus('error')
            }
        }
        activate()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const planName = planId
        ? planId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : 'your plan'

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="text-slate-600 text-lg">Activating your subscription…</p>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-5xl">⚠️</div>
                <h1 className="text-2xl font-bold text-slate-800">Something went wrong</h1>
                <p className="text-slate-500 max-w-sm">
                    Your payment may have been processed. Please check your subscription status or contact support.
                </p>
                <Link href="/subscription" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition">
                    Go to My Subscription
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div className={`${isTrial ? 'bg-blue-100' : 'bg-green-100'} rounded-full p-5 mb-2`}>
                <svg className={`w-14 h-14 ${isTrial ? 'text-blue-500' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">
                {isTrial ? '🎉 Trial Activated!' : 'Payment Successful!'}
            </h1>
            <p className="text-slate-600 text-lg max-w-md">
                {isTrial
                    ? <>Your <strong>14-day free trial</strong> of <strong>{planName}</strong> is now active.</>
                    : <>Welcome to <strong>{planName}</strong>. Your subscription is now active and all features have been unlocked.</>
                }
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 max-w-sm">
                ✅ Payment received via FedaPay. Your subscription is now active.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Link
                    href="/subscription"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow"
                >
                    View My Subscription
                </Link>
                <Link
                    href="/"
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-semibold transition"
                >
                    Go to Dashboard
                </Link>
            </div>
            <p className="text-slate-400 text-xs mt-4">Redirecting to your subscription in 5 seconds…</p>
        </div>
    )
}

export default function PaymentSuccessPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl p-10 max-w-lg w-full">
                <Suspense fallback={
                    <div className="flex justify-center">
                        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                }>
                    <SuccessContent />
                </Suspense>
            </div>
        </main>
    )
}

