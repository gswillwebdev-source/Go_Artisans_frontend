'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/context/SubscriptionContext'

export default function ProfileViewsPage() {
    const { isPro, isPremium, isTrialing, loading: subLoading } = useSubscription()
    const canAccess = isPro || isPremium || isTrialing

    const [viewers, setViewers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (subLoading) return
        if (!canAccess) { setLoading(false); return }
        fetchViewers()
    }, [subLoading, canAccess])

    const fetchViewers = async () => {
        try {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) { setLoading(false); return }

            const since = new Date()
            since.setDate(since.getDate() - 30)

            const { data, error: err } = await supabase
                .from('profile_views')
                .select(`
                    viewed_at,
                    view_date,
                    viewer:viewer_id (
                        id,
                        first_name,
                        last_name,
                        job_title,
                        profile_picture,
                        user_type
                    )
                `)
                .eq('viewed_id', session.user.id)
                .gte('view_date', since.toISOString().slice(0, 10))
                .order('viewed_at', { ascending: false })
                .limit(100)

            if (err) throw err
            setViewers(data || [])
        } catch (err) {
            console.error('[Profile Views Error]', err)
            setError('Failed to load profile views. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        const now = new Date()
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Yesterday'
        if (diff < 7) return `${diff} days ago`
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    if (subLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
            </div>
        )
    }

    if (!canAccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
                    <p className="text-4xl mb-4">🔒</p>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Pro Feature</h2>
                    <p className="text-gray-600 mb-6">Upgrade to Pro to see who viewed your profile in the last 30 days.</p>
                    <Link href="/pricing" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
                        Upgrade to Pro — $4.99/mo
                    </Link>
                </div>
            </div>
        )
    }

    // Deduplicate: show each viewer once (most recent visit only)
    const uniqueViewers = []
    const seenIds = new Set()
    for (const row of viewers) {
        const vid = row.viewer?.id
        if (vid && !seenIds.has(vid)) {
            seenIds.add(vid)
            uniqueViewers.push(row)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/worker-profile" className="text-indigo-600 hover:underline text-sm">← Back to Profile</Link>
                    <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-1">👁️ Who Viewed My Profile</h1>
                    <p className="text-gray-600">People who visited your profile in the last <strong>30 days</strong>.</p>
                </div>

                {/* Stats bar */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <span className="text-3xl font-bold text-indigo-700">{uniqueViewers.length}</span>
                    <div>
                        <p className="font-semibold text-indigo-900">profile {uniqueViewers.length === 1 ? 'visit' : 'visitors'}</p>
                        <p className="text-indigo-600 text-sm">in the past 30 days · {viewers.length} total views</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {uniqueViewers.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                        <p className="text-5xl mb-4">👀</p>
                        <p className="text-gray-500 font-medium">No profile visitors yet in the last 30 days.</p>
                        <p className="text-gray-400 text-sm mt-2">Share your profile to attract clients!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {uniqueViewers.map((row, idx) => {
                            const v = row.viewer
                            if (!v) return null
                            return (
                                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                                    {/* Avatar */}
                                    {v.profile_picture ? (
                                        <img
                                            src={v.profile_picture}
                                            alt={`${v.first_name} ${v.last_name}`}
                                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                                            {v.first_name?.charAt(0)}{v.last_name?.charAt(0)}
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">
                                            {v.first_name} {v.last_name}
                                        </p>
                                        {v.job_title && (
                                            <p className="text-sm text-indigo-600 truncate">{v.job_title}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {v.user_type === 'client' ? '🏢 Client' : '👷 Worker'} · {formatDate(row.viewed_at)}
                                        </p>
                                    </div>

                                    {/* Link to their profile if worker */}
                                    {v.user_type === 'worker' && (
                                        <Link
                                            href={`/workers/${v.id}`}
                                            className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                                        >
                                            View →
                                        </Link>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                <p className="text-center text-xs text-gray-400 mt-8">
                    Profile view history is retained for 30 days. Upgrade to Premium for 90-day history.
                </p>
            </div>
        </div>
    )
}
