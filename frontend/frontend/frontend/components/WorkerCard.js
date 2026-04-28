'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import VerifiedBadge from '@/components/VerifiedBadge'
import ReferralBadge, { getReferralTier } from '@/components/ReferralBadge'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function WorkerCard({ worker }) {
    const { user } = useAuth({ redirectToLogin: false })
    const [saved, setSaved] = useState(false)
    const [savingInProgress, setSavingInProgress] = useState(false)

    const bioPreview = worker.bio ? worker.bio.substring(0, 120) : 'No bio available'

    // Subscription badge
    const sub = Array.isArray(worker.user_subscriptions) ? worker.user_subscriptions[0] : worker.user_subscriptions
    const planTier = sub?.plan_id?.split('_')[1] || 'free'
    const isPro = planTier === 'pro'
    const isPremium = planTier === 'premium'

    // Verification badge (from joined verification_badges or is_verified flag)
    const badges = Array.isArray(worker.verification_badges) ? worker.verification_badges : []
    const isVerified = worker.is_verified || badges.some(b => b.status === 'approved')

    // Invitation/referral level badge
    const referralTier = getReferralTier(worker.referral_count ?? 0)

    // Check if already saved on mount
    useEffect(() => {
        if (!user?.id) return
        let cancelled = false
        supabase
            .from('saved_workers')
            .select('id')
            .eq('client_id', user.id)
            .eq('worker_id', worker.id)
            .maybeSingle()
            .then(({ data }) => {
                if (!cancelled) setSaved(!!data)
            })
        return () => { cancelled = true }
    }, [user?.id, worker.id])

    const handleSaveToggle = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!user?.id || savingInProgress) return
        setSavingInProgress(true)
        if (saved) {
            await supabase
                .from('saved_workers')
                .delete()
                .eq('client_id', user.id)
                .eq('worker_id', worker.id)
            setSaved(false)
        } else {
            await supabase
                .from('saved_workers')
                .insert({ client_id: user.id, worker_id: worker.id })
            setSaved(true)
        }
        setSavingInProgress(false)
    }

    return (
        <div className="elevated-card interactive-rise rounded-2xl p-6">
            {/* Top row: status + save button */}
            <div className="flex justify-between items-center mb-2">
                {user?.id ? (
                    <button
                        type="button"
                        onClick={handleSaveToggle}
                        disabled={savingInProgress}
                        title={saved ? 'Remove from saved' : 'Save worker'}
                        className={`p-1.5 rounded-full transition-colors ${saved ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                        </svg>
                    </button>
                ) : <span />}
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${worker.is_active
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                    }`}>
                    {worker.is_active ? '✓ Available' : '✗ Busy'}
                </span>
            </div>

            {/* Profile Picture */}
            <div className="mb-4 flex justify-center">
                {worker.profile_picture ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-200 ring-4 ring-blue-50">
                        <img
                            src={worker.profile_picture}
                            alt={`${worker.first_name} ${worker.last_name}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-4xl ring-4 ring-blue-50">
                        {worker.first_name?.charAt(0)}{worker.last_name?.charAt(0)}
                    </div>
                )}
            </div>

            {/* Worker Info */}
            <h3 className="display-font text-xl font-bold text-slate-900 mb-1 text-center tracking-tight flex items-center justify-center gap-1 flex-wrap">
                {worker.first_name} {worker.last_name}
                {isVerified && <VerifiedBadge size={20} className="flex-shrink-0" />}
                {isPremium && (
                    <span className="inline-flex items-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">💎</span>
                )}
                {isPro && !isPremium && (
                    <span className="inline-flex items-center bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">⭐</span>
                )}
            </h3>
            {referralTier && (
                <div className="flex justify-center mb-1">
                    <ReferralBadge tier={referralTier} className="text-xs" />
                </div>
            )}

            <p className="text-blue-700 font-semibold text-center mb-3">
                {worker.job_title || 'No title specified'}
            </p>

            <div className="space-y-2 mb-4 text-center">
                <div className="flex items-center justify-center text-slate-600 text-sm">
                    <span className="font-medium">📍</span>
                    <span className="ml-2">{worker.location || 'Location not specified'}</span>
                </div>
                {worker.years_experience > 0 && (
                    <div className="flex items-center justify-center text-slate-600 text-sm">
                        <span className="font-medium">⏱️</span>
                        <span className="ml-2">{worker.years_experience} years experience</span>
                    </div>
                )}
                {worker.rating > 0 && (
                    <div className="flex items-center justify-center text-slate-600 text-sm">
                        <span className="font-medium">⭐</span>
                        <span className="ml-2">{worker.rating.toFixed(1)} / 5.0</span>
                    </div>
                )}
            </div>

            {/* Bio Preview */}
            <p className="text-slate-600 text-sm mb-4 text-center line-clamp-2">
                {bioPreview}
                {worker.bio && worker.bio.length > 120 ? '...' : ''}
            </p>

            {/* Services */}
            {worker.services && worker.services.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {worker.services.slice(0, 3).map((service, index) => (
                            <span
                                key={index}
                                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-lg"
                            >
                                {service}
                            </span>
                        ))}
                        {worker.services.length > 3 && (
                            <span className="text-xs text-slate-500">+{worker.services.length - 3} more</span>
                        )}
                    </div>
                </div>
            )}

            {/* View Profile Button */}
            <Link
                href={`/workers/${worker.id}`}
                className="w-full primary-action py-2.5 rounded-xl text-center font-semibold transition shadow-sm"
            >
                View Profile
            </Link>
        </div>
    )
}
