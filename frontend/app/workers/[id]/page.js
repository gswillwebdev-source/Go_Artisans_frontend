'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { FOLLOW_SYNC_EVENT } from '@/hooks/useFollowSync'
import FollowStats from '@/components/FollowStats'

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

                // Debug: Log all sections
                console.log('[WORKER PAGE] === SECTIONS DEBUG ===')
                console.log('[WORKER PAGE] Bio:', !!data.user?.bio)
                console.log('[WORKER PAGE] Services/Skills:', data.user?.services)
                console.log('[WORKER PAGE] Portfolio/Gallery:', data.user?.portfolio)
                console.log('[WORKER PAGE] canSeeGallery:', data.visibility?.canSeeGallery)

            } catch (err) {
                console.error('Failed to fetch worker:', err)
                setError('Failed to load worker profile')
            } finally {
                setLoading(false)
            }
        }

        fetchWorkerData()
    }, [workerId, currentUser?.id, authLoading])

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
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 break-words">
                                {worker.first_name} {worker.last_name}
                            </h1>
                            <p className="text-lg sm:text-xl lg:text-2xl text-indigo-600 font-semibold mb-4 break-words">
                                {worker.job_title || 'No title specified'}
                            </p>

                            {/* Availability Status */}
                            <div className="mb-4">
                                <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${worker.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {worker.is_active ? '✓ Available for work' : '✗ Currently busy'}
                                </span>
                            </div>

                            <div className="space-y-3 text-gray-600">
                                {worker.location && (
                                    <div className="flex items-center">
                                        <span className="text-xl mr-3">📍</span>
                                        <span>{worker.location}</span>
                                    </div>
                                )}
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

                            {/* Follow Stats - Visible to all */}
                            <FollowStats
                                followerCount={followerCount}
                                followingCount={followingCount}
                                isOwnProfile={false}
                            />
                        </div>
                    </div>

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

                    {/* Portfolio Section - Only if allowed by visibility rules */}
                    {visibility?.canSeeGallery && worker.portfolio && worker.portfolio.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Portfolio</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {worker.portfolio.map((item, index) => {
                                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(item) || item.includes('data:image')

                                    return isImage ? (
                                        <a
                                            key={index}
                                            href={item}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="overflow-hidden rounded-lg hover:shadow-lg transition-shadow"
                                        >
                                            <img
                                                src={item}
                                                alt={`Portfolio item ${index + 1}`}
                                                className="w-full h-48 object-cover hover:scale-105 transition-transform"
                                            />
                                        </a>
                                    ) : (
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
                        </div>
                    )}

                    {!visibility?.canSeeGallery && worker.portfolio && worker.portfolio.length > 0 && (
                        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-blue-800 text-sm">
                                👤 Follow this worker to see their portfolio and reviews
                            </p>
                        </div>
                    )}

                    {/* Reviews Section - Only if allowed by visibility rules */}
                    {visibility?.canSeeGallery && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Client Ratings & Feedback</h2>
                            <Suspense fallback={<div className="text-gray-500">Loading reviews...</div>}>
                                <WorkerRatingsDisplay workerId={worker.id} />
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
