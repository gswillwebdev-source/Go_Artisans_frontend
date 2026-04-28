'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { FOLLOW_SYNC_EVENT } from '@/hooks/useFollowSync'
import FollowStats from '@/components/FollowStats'
import VerifiedBadge from '@/components/VerifiedBadge'
import ReferralBadge, { getReferralTier } from '@/components/ReferralBadge'

// Lazy load the ratings component - loads after main profile is shown for faster initial load
const WorkerRatingsDisplay = lazy(() => import('@/components/WorkerRatingsDisplay'))

export default function WorkerProfilePage() {
    const params = useParams()
    const workerId = params.id
    const { user: currentUser, isLoading: authLoading } = useAuth({ redirectToLogin: false })
    const [worker, setWorker] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [visibility, setVisibility] = useState(null)
    const [viewerPlanTier, setViewerPlanTier] = useState('free')
    // Portfolio view limit for Pro clients
    const [portfolioViewsThisMonth, setPortfolioViewsThisMonth] = useState(0)
    const [portfolioViewLimitReached, setPortfolioViewLimitReached] = useState(false)
    const PRO_PORTFOLIO_LIMIT = 60

    useEffect(() => {
        // If workerId is undefined or auth is still loading, don't fetch yet
        if (!workerId || authLoading) {
            return
        }

        async function fetchWorkerData() {
            try {
                setLoading(true)
                setError(null)

                // Fetch worker profile with visibility rules
                // Pass currentUser.id if user is logged in, otherwise omit viewer_id
                const viewerId = currentUser?.id
                const url = viewerId
                    ? `/api/user/${workerId}?viewer_id=${viewerId}`
                    : `/api/user/${workerId}`
                console.log('[WORKER PAGE] Fetching with:', { workerId, viewerId, isLoggedIn: !!currentUser })

                const response = await fetch(url)

                if (!response.ok) {
                    throw new Error('Failed to fetch worker profile')
                }

                const data = await response.json()
                console.log('[WORKER PAGE] Profile data loaded:', {
                    hasServices: !!data.user?.services,
                    servicesCount: data.user?.services?.length || 0,
                    services: data.user?.services,
                    hasPortfolio: !!data.user?.portfolio,
                    portfolioCount: data.user?.portfolio?.length || 0,
                    canSeeGallery: data.visibility?.canSeeGallery
                })

                setWorker(data.user)
                setFollowerCount(data.follower_count || 0)
                setFollowingCount(data.following_count || 0)
                setVisibility(data.visibility)
                setViewerPlanTier(data.viewer_plan_tier || 'free')

                // Record profile view (don't block UI — fire and forget)
                if (viewerId && viewerId !== workerId) {
                    const today = new Date().toISOString().slice(0, 10)
                    supabase.from('profile_views').upsert({
                        viewer_id: viewerId,
                        viewed_id: workerId,
                        view_date: today,
                        viewed_at: new Date().toISOString(),
                    }, { onConflict: 'viewer_id,viewed_id,view_date' }).then(() => { })
                }

            } catch (err) {
                console.error('Failed to fetch worker:', err)
                setError('Failed to load worker profile')
            } finally {
                setLoading(false)
            }
        }

        fetchWorkerData()
    }, [workerId, currentUser?.id, authLoading])

    // For Pro clients: track portfolio views and enforce monthly limit
    useEffect(() => {
        if (!currentUser || viewerPlanTier !== 'pro' || !workerId || loading) return

        const viewMonth = (() => {
            const now = new Date()
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        })()

        async function trackPortfolioView() {
            // Get current month count BEFORE recording this view
            const { count: currentCount } = await supabase
                .from('portfolio_views')
                .select('id', { count: 'exact', head: true })
                .eq('viewer_id', currentUser.id)
                .eq('view_month', viewMonth)

            const count = currentCount || 0

            // Check if this worker is already counted this month
            const { data: existing } = await supabase
                .from('portfolio_views')
                .select('id')
                .eq('viewer_id', currentUser.id)
                .eq('worker_id', workerId)
                .eq('view_month', viewMonth)
                .maybeSingle()

            setPortfolioViewsThisMonth(count)

            if (count >= PRO_PORTFOLIO_LIMIT && !existing) {
                // Limit reached and this worker isn't already in this month's views
                setPortfolioViewLimitReached(true)
                return
            }

            setPortfolioViewLimitReached(false)

            // Record view (upsert — revisiting same worker doesn't burn extra quota)
            if (!existing) {
                await supabase.from('portfolio_views').upsert({
                    viewer_id: currentUser.id,
                    worker_id: workerId,
                    view_month: viewMonth
                }, { onConflict: 'viewer_id,worker_id,view_month' })
            }
        }

        trackPortfolioView()
    }, [currentUser?.id, viewerPlanTier, workerId, loading])

    // Listen for global follow/unfollow events and update follower count in real-time
    useEffect(() => {
        const handleFollowChange = (event) => {
            const { followingId, isFollowing } = event.detail

            console.log('[WORKER PAGE] Event listener triggered:', { eventFollowingId: followingId, pageWorkerId: workerId, match: String(followingId) === String(workerId) })

            // If someone followed or unfollowed THIS worker, update follower count
            // Convert to string for comparison to handle any type mismatches
            if (String(followingId) === String(workerId)) {
                console.log('[WORKER PAGE] MATCH! Follow event received for this worker:', { followingId, workerId, isFollowing })
                setFollowerCount(prev => {
                    const newCount = isFollowing ? prev + 1 : Math.max(0, prev - 1)
                    console.log('[WORKER PAGE] Follower count synced:', { old: prev, new: newCount })
                    return newCount
                })
            } else {
                console.log('[WORKER PAGE] NO MATCH - event is for different worker')
            }
        }

        if (typeof window !== 'undefined') {
            console.log('[WORKER PAGE] Setting up event listener for workerId:', workerId)
            window.addEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
            return () => {
                console.log('[WORKER PAGE] Removing event listener for workerId:', workerId)
                window.removeEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
            }
        }
    }, [workerId])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">Loading...</div>
            </div>
        )
    }

    if (error || !worker) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {error || 'Worker not found'}
                    </h2>
                    <Link href="/all-users" className="text-indigo-600 hover:text-indigo-700">
                        Back to workers
                    </Link>
                </div>
            </div>
        )
    }

    // Free-tier client viewing a worker's profile (not their own)
    const isFreeTierClientView = !!(
        currentUser &&
        viewerPlanTier === 'free' &&
        worker.user_type === 'worker' &&
        currentUser.id !== worker.id
    )

    return (
        <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/all-users" className="text-indigo-600 hover:text-indigo-700 mb-6 inline-block">
                    ← Back to workers
                </Link>

                <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row gap-6 sm:gap-8 mb-8">
                        {/* Profile Picture */}
                        <div className="self-center md:self-start">
                            {worker.profile_picture ? (
                                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-lg overflow-hidden bg-gray-200">
                                    <img
                                        src={worker.profile_picture}
                                        alt={`${worker.first_name} ${worker.last_name}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-lg bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-4xl sm:text-5xl md:text-6xl">
                                    {worker.first_name?.charAt(0)}{worker.last_name?.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Worker Info */}
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 break-words flex items-center gap-2 flex-wrap">
                                {worker.first_name} {worker.last_name}
                                {worker.is_verified && <VerifiedBadge size={28} className="flex-shrink-0" />}
                                {worker.plan_tier === 'premium' && (
                                    <span className="inline-flex items-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">💎</span>
                                )}
                                {worker.plan_tier === 'pro' && (
                                    <span className="inline-flex items-center bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">⭐</span>
                                )}
                            </h1>

                            {/* Referral / invitation badge — under the name */}
                            {getReferralTier(worker.referral_count ?? 0) && (
                                <div className="mb-2">
                                    <ReferralBadge tier={getReferralTier(worker.referral_count ?? 0)} />
                                </div>
                            )}

                            <p className="text-lg sm:text-xl lg:text-2xl text-indigo-600 font-semibold mb-3 break-words">
                                {worker.job_title || 'No title specified'}
                            </p>

                            {/* Location — visible to everyone */}
                            {worker.location && (
                                <div className="flex items-center text-gray-600 mb-4">
                                    <span className="text-xl mr-3">📍</span>
                                    <span>{worker.location}</span>
                                </div>
                            )}

                            {isFreeTierClientView ? (
                                /* ── FREE TIER: email contact + upgrade callout ── */
                                <div className="space-y-4">
                                    {worker.email && (
                                        <a
                                            href={`mailto:${worker.email}`}
                                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
                                        >
                                            <span>📧</span> Contact via Email
                                        </a>
                                    )}
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                        <p className="text-amber-800 font-semibold text-sm mb-1">🔒 Free plan — limited view</p>
                                        <p className="text-amber-700 text-xs mb-3">
                                            Upgrade to <strong>Pro</strong> or <strong>Premium</strong> to unlock the full
                                            profile: bio, experience, ratings, skills, portfolio, and more.
                                        </p>
                                        <Link
                                            href="/plans"
                                            className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                                        >
                                            Upgrade now →
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                /* ── PRO / PREMIUM / SELF / WORKER VIEW ── */
                                <>
                                    {/* Availability Status */}
                                    <div className="mb-4">
                                        <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${worker.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'}`}>
                                            {worker.is_active ? '✓ Available for work' : '✗ Currently busy'}
                                        </span>
                                    </div>

                                    <div className="space-y-3 text-gray-600">
                                        {worker.years_experience > 0 && (
                                            <div className="flex items-center">
                                                <span className="text-xl mr-3">⏱️</span>
                                                <span>{worker.years_experience} years of experience</span>
                                            </div>
                                        )}
                                        {worker.completed_jobs > 0 && (
                                            <div className="flex items-center">
                                                <span className="text-xl mr-3">✅</span>
                                                <span>{worker.completed_jobs} jobs completed</span>
                                            </div>
                                        )}
                                        {worker.rating > 0 && (
                                            <div className="flex items-center">
                                                <span className="text-xl mr-3">⭐</span>
                                                <span>{worker.rating.toFixed(1)} / 5.0 rating</span>
                                            </div>
                                        )}
                                        {visibility?.canSeeContact && worker.email && (
                                            <div className="flex items-center">
                                                <span className="text-xl mr-3">📧</span>
                                                <span>{worker.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Follow Stats */}
                                    <FollowStats
                                        followerCount={followerCount}
                                        followingCount={followingCount}
                                        isOwnProfile={false}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── FULL PROFILE SECTIONS (hidden for free-tier clients) ── */}
                    {!isFreeTierClientView && (
                        <>
                            <hr className="my-8" />

                            {/* Bio Section */}
                            {worker.bio && (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                                    <p className="text-gray-600 whitespace-pre-wrap">{worker.bio}</p>
                                </div>
                            )}

                            {/* Skills/Services Section */}
                            {worker.services && worker.services.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills & Services</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {worker.services.map((service, index) => (
                                            <span
                                                key={index}
                                                className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full"
                                            >
                                                {service}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Portfolio Section */}
                            {worker.portfolio && worker.portfolio.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Portfolio</h2>
                                    {portfolioViewLimitReached ? (
                                        /* Pro monthly limit reached */
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                                            <p className="text-3xl mb-2">🔒</p>
                                            <p className="text-amber-800 font-semibold mb-1">Portfolio view limit reached</p>
                                            <p className="text-amber-700 text-sm mb-3">
                                                You've viewed <strong>{portfolioViewsThisMonth}</strong> of <strong>{PRO_PORTFOLIO_LIMIT}</strong> worker portfolios this month on the Pro plan.
                                                Try again next month or upgrade to Premium for unlimited access.
                                            </p>
                                            <Link href="/plans" className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
                                                Upgrade to Premium →
                                            </Link>
                                        </div>
                                    ) : (
                                        <>
                                            {viewerPlanTier === 'pro' && (
                                                <p className="text-xs text-slate-500 mb-3">
                                                    📊 {portfolioViewsThisMonth}/{PRO_PORTFOLIO_LIMIT} portfolio views used this month
                                                </p>
                                            )}
                                            {viewerPlanTier === 'premium' && (
                                                <p className="text-xs text-purple-600 font-medium mb-3 flex items-center gap-1">
                                                    💎 Unlimited portfolio access — Premium
                                                </p>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {worker.portfolio.map((item, index) => {
                                                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(item) || item.startsWith('data:image')
                                                    const isVideo = /\.(mp4|webm|ogg|mov)/i.test(item) || item.startsWith('data:video')

                                                    if (isVideo) {
                                                        return (
                                                            <div key={index} className="overflow-hidden rounded-lg bg-black">
                                                                <video
                                                                    src={item}
                                                                    controls
                                                                    className="w-full h-48 object-cover"
                                                                    preload="metadata"
                                                                />
                                                            </div>
                                                        )
                                                    }

                                                    if (isImage) {
                                                        return (
                                                            <a
                                                                key={index}
                                                                href={item}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="overflow-hidden rounded-lg hover:shadow-lg transition-shadow block"
                                                            >
                                                                <img
                                                                    src={item}
                                                                    alt={`Portfolio item ${index + 1}`}
                                                                    className="w-full h-48 object-cover hover:scale-105 transition-transform"
                                                                />
                                                            </a>
                                                        )
                                                    }

                                                    return (
                                                        <a
                                                            key={index}
                                                            href={item}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition text-indigo-600 text-sm flex items-center justify-center h-48 break-all"
                                                        >
                                                            📎 {item.substring(item.lastIndexOf('/') + 1) || `Portfolio Item ${index + 1}`}
                                                        </a>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Reviews Section */}
                            {visibility?.canSeeGallery && (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Client Ratings & Feedback</h2>
                                    <Suspense fallback={<div className="text-gray-500">Loading reviews...</div>}>
                                        <WorkerRatingsDisplay workerId={worker.id} />
                                    </Suspense>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
