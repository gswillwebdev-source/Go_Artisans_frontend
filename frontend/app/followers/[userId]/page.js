'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { FOLLOW_SYNC_EVENT } from '@/hooks/useFollowSync'

export default function FollowersPage() {
    const params = useParams()
    const userId = params.userId
    const { user: currentUser, isLoading: authLoading } = useAuth({ redirectToLogin: false })
    const router = useRouter()

    const [followers, setFollowers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [userName, setUserName] = useState('')

    useEffect(() => {
        // Wait for auth to load and userId to be available
        if (!userId || authLoading) return

        // Redirect if not viewing own followers
        if (currentUser?.id !== userId) {
            router.push('/browse-workers')
            return
        }

        async function fetchFollowers() {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(
                    `/api/followers/${userId}?viewer_id=${currentUser.id}&limit=50&offset=0`
                )

                if (response.status === 403) {
                    setError('You can only view your own followers')
                    return
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch followers')
                }

                const data = await response.json()
                setFollowers(data.followers || [])

                // Fetch user name for title
                if (data.followers.length > 0 || currentUser) {
                    setUserName(currentUser?.first_name || '')
                }

            } catch (err) {
                console.error('Failed to fetch followers:', err)
                setError('Failed to load followers')
            } finally {
                setLoading(false)
            }
        }

        fetchFollowers()
    }, [userId, currentUser?.id, router])

    // Listen for follow/unfollow events and refresh if needed
    useEffect(() => {
        const handleFollowChange = (event) => {
            console.log('[FOLLOWERS PAGE] Follow event received')
            // Refetch followers when any follow/unfollow happens
            if (userId && currentUser?.id === userId) {
                async function refreshFollowers() {
                    try {
                        const response = await fetch(
                            `/api/followers/${userId}?viewer_id=${currentUser?.id}&limit=50&offset=0`
                        )
                        if (response.ok) {
                            const data = await response.json()
                            setFollowers(data.followers || [])
                        }
                    } catch (err) {
                        console.error('Failed to refresh followers:', err)
                    }
                }
                refreshFollowers()
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
            return () => window.removeEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
        }
    }, [userId, currentUser?.id])

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-900 mb-4">{error}</p>
                        <Link href="/browse-workers" className="text-indigo-600 hover:text-indigo-700">
                            Back to browse
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/worker-profile" className="text-indigo-600 hover:text-indigo-700 mb-6 inline-block">
                    ← Back to profile
                </Link>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Followers</h1>
                    <p className="text-gray-600 mb-8">You have {followers.length} follower{followers.length !== 1 ? 's' : ''}</p>

                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading followers...</p>
                        </div>
                    ) : followers.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 mb-4">You don't have any followers yet</p>
                            <Link href="/browse-workers" className="text-indigo-600 hover:text-indigo-700">
                                Browse workers to get started
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {followers.map((follower) => (
                                <Link
                                    key={follower.id}
                                    href={`/workers/${follower.id}`}
                                >
                                    <div className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition cursor-pointer">
                                        {/* Profile Picture */}
                                        <div className="w-24 h-24 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-3xl mb-4 mx-auto overflow-hidden">
                                            {follower.profile_picture ? (
                                                <img
                                                    src={follower.profile_picture}
                                                    alt={`${follower.first_name} ${follower.last_name}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span>{follower.first_name?.charAt(0)}{follower.last_name?.charAt(0)}</span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <h3 className="font-bold text-gray-900 text-center mb-1">
                                            {follower.first_name} {follower.last_name}
                                        </h3>

                                        {follower.job_title && (
                                            <p className="text-sm text-gray-600 text-center mb-2">
                                                {follower.job_title}
                                            </p>
                                        )}

                                        {follower.location && (
                                            <p className="text-sm text-gray-500 text-center">
                                                📍 {follower.location}
                                            </p>
                                        )}

                                        {follower.rating && (
                                            <p className="text-sm text-yellow-500 text-center mt-2">
                                                ⭐ {follower.rating.toFixed(1)} / 5.0
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
