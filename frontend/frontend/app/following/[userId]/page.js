'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { FOLLOW_SYNC_EVENT } from '@/hooks/useFollowSync'
import { useLanguage } from '@/context/LanguageContext'

export default function FollowingPage() {
    const { t } = useLanguage()
    const params = useParams()
    const userId = params.userId
    const { user: currentUser, isLoading: authLoading } = useAuth({ redirectToLogin: false })
    const router = useRouter()

    const [following, setFollowing] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Wait for auth to load and userId to be available
        if (!userId || authLoading) return

        // Redirect if not viewing own following
        if (currentUser?.id !== userId) {
            router.push('/browse-workers')
            return
        }

        async function fetchFollowing() {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(
                    `/api/following/${userId}?viewer_id=${currentUser.id}&limit=50&offset=0`
                )

                if (response.status === 403) {
                    setError(t('youCanOnlyViewYourOwnFollowingList'))
                    return
                }

                if (!response.ok) {
                    throw new Error(t('failedToFetchFollowing'))
                }

                const data = await response.json()
                setFollowing(data.following || [])

            } catch (err) {
                console.error('Failed to fetch following:', err)
                setError(t('failedToLoadFollowingList'))
            } finally {
                setLoading(false)
            }
        }

        fetchFollowing()
    }, [userId, currentUser?.id, router])

    // Listen for follow/unfollow events and refresh if needed
    useEffect(() => {
        const handleFollowChange = (event) => {
            console.log('[FOLLOWING PAGE] Follow event received')
            // Refetch following list when any follow/unfollow happens
            if (userId && currentUser?.id === userId) {
                async function refreshFollowing() {
                    try {
                        const response = await fetch(
                            `/api/following/${userId}?viewer_id=${currentUser?.id}&limit=50&offset=0`
                        )
                        if (response.ok) {
                            const data = await response.json()
                            setFollowing(data.following || [])
                        }
                    } catch (err) {
                        console.error('Failed to refresh following list:', err)
                    }
                }
                refreshFollowing()
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
            return () => window.removeEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
        }
    }, [userId, currentUser?.id])

    if (error) {
        return (
            <div className="min-h-screen py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="glass-surface rounded-2xl shadow p-8 text-center border border-white/80">
                        <p className="text-slate-900 mb-4">{error}</p>
                        <Link href="/browse-workers" className="text-blue-700 hover:text-blue-800 font-semibold">
                            {t('backToBrowse')}
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/worker-profile" className="text-blue-700 hover:text-blue-800 mb-6 inline-block font-semibold">
                    ← {t('backToProfile')}
                </Link>

                <div className="glass-surface rounded-2xl shadow-lg p-8 border border-white/80">
                    <h1 className="display-font text-3xl font-bold text-slate-900 mb-2 tracking-tight">{t('youAreFollowing')}</h1>
                    <p className="text-slate-600 mb-8">{t('yourFollowingCount').replace('{{count}}', following.length).replace('{{label}}', following.length === 1 ? t('usersLabelSingular') : t('usersLabelPlural'))}</p>

                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">{t('loadingFollowingList')}</p>
                        </div>
                    ) : following.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500 mb-4">{t('noFollowingYet')}</p>
                            <Link href="/browse-workers" className="text-blue-700 hover:text-blue-800 font-semibold">
                                {t('browseWorkersToStartFollowing')}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {following.map((followingUser) => (
                                <Link
                                    key={followingUser.id}
                                    href={`/workers/${followingUser.id}`}
                                >
                                    <div className="elevated-card interactive-rise rounded-2xl p-6 cursor-pointer">
                                        {/* Profile Picture */}
                                        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl mb-4 mx-auto overflow-hidden ring-4 ring-blue-50">
                                            {followingUser.profile_picture ? (
                                                <img
                                                    src={followingUser.profile_picture}
                                                    alt={`${followingUser.first_name} ${followingUser.last_name}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span>{followingUser.first_name?.charAt(0)}{followingUser.last_name?.charAt(0)}</span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <h3 className="font-bold text-slate-900 text-center mb-1">
                                            {followingUser.first_name} {followingUser.last_name}
                                        </h3>

                                        {followingUser.job_title && (
                                            <p className="text-sm text-slate-600 text-center mb-2">
                                                {followingUser.job_title}
                                            </p>
                                        )}

                                        {followingUser.location && (
                                            <p className="text-sm text-slate-500 text-center">
                                                📍 {followingUser.location}
                                            </p>
                                        )}

                                        {followingUser.user_type === 'worker' && followingUser.rating && (
                                            <p className="text-sm text-yellow-500 text-center mt-2">
                                                ⭐ {followingUser.rating.toFixed(1)} / 5.0
                                            </p>
                                        )}

                                        {followingUser.user_type === 'client' && (
                                            <p className="text-sm text-blue-700 text-center mt-2">
                                                👔 {t('client')}
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
