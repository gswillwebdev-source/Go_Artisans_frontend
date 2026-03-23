'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@supabase/supabase-js'
import { FOLLOW_SYNC_EVENT } from '@/hooks/useFollowSync'
import FollowButton from '@/components/FollowButton'

export default function AllUsersPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth({ redirectToLogin: false })
    const [displayUsers, setDisplayUsers] = useState([])
    const [followingIds, setFollowingIds] = useState([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const loaderRef = useRef(null)

    // Fetch user's follows ONCE on mount
    useEffect(() => {
        if (currentUser?.id) {
            fetchUserFollows()
        }
    }, [currentUser?.id])

    // Fetch initial 30 users
    useEffect(() => {
        if (!authLoading) {
            fetchInitialUsers()
        }
    }, [authLoading, currentUser?.id])

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !loadingMore && hasMore) {
                loadMoreUsers()
            }
        }, { threshold: 0.1 })

        if (loaderRef.current) {
            observer.observe(loaderRef.current)
        }

        return () => observer.disconnect()
    }, [loadingMore, offset, hasMore])

    // Listen for global follow/unfollow events to update followingIds in real-time
    useEffect(() => {
        const handleFollowChange = (event) => {
            const { followerId, followingId, isFollowing } = event.detail

            console.log('[ALL USERS] Follow event received with detail:', event.detail)
            console.log('[ALL USERS] Current user:', currentUser?.id)
            console.log('[ALL USERS] Follower ID matches current user?', String(followerId) === String(currentUser?.id))

            // If current user is the one doing the following, update followingIds
            // Use String comparison to handle UUID/string type differences
            if (String(followerId) === String(currentUser?.id)) {
                console.log('[ALL USERS] MATCH! Follow event for this user')
                setFollowingIds(prev => {
                    if (isFollowing) {
                        const updated = prev.includes(followingId) ? prev : [...prev, followingId]
                        console.log('[ALL USERS] Added to followingIds:', { old: prev, new: updated })
                        return updated
                    } else {
                        const updated = prev.filter(id => id !== followingId)
                        console.log('[ALL USERS] Removed from followingIds:', { old: prev, new: updated })
                        return updated
                    }
                })
            } else {
                console.log('[ALL USERS] NO MATCH - event is for different user')
            }
        }

        if (typeof window !== 'undefined') {
            console.log('[ALL USERS] Setting up event listener for FOLLOW_SYNC_EVENT:', FOLLOW_SYNC_EVENT)
            window.addEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
            return () => {
                window.removeEventListener(FOLLOW_SYNC_EVENT, handleFollowChange)
            }
        }
    }, [currentUser?.id])

    const fetchUserFollows = async () => {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            )

            const { data, error } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUser.id)
                .eq('status', 'active')

            if (!error && data) {
                console.log('[ALL USERS] Fetched', data.length, 'follows')
                setFollowingIds(data.map(f => f.following_id))
            }
        } catch (err) {
            console.error('[ALL USERS] Failed to fetch follows:', err)
        }
    }

    const fetchInitialUsers = async () => {
        try {
            setInitialLoading(true)
            setError(null)
            console.log('[ALL USERS] Fetching initial 30 users...')

            const response = await fetch('/api/all-users?limit=30&offset=0')
            if (!response.ok) throw new Error('Failed to fetch users')

            const data = await response.json()
            console.log('[ALL USERS] Loaded', data.users?.length, 'users')
            setDisplayUsers(data.users || [])
            setOffset(30)
            setHasMore(data.total > 30)
        } catch (err) {
            console.error('Failed to fetch users:', err)
            setError('Failed to load users')
        } finally {
            setInitialLoading(false)
        }
    }

    const loadMoreUsers = async () => {
        try {
            setLoadingMore(true)
            console.log('[ALL USERS] Loading more users from offset:', offset)

            const response = await fetch(`/api/all-users?limit=15&offset=${offset}`)
            if (!response.ok) throw new Error('Failed to fetch more users')

            const data = await response.json()
            const newUsers = data.users || []
            console.log('[ALL USERS] Loaded', newUsers.length, 'more users')

            setDisplayUsers(prev => [...prev, ...newUsers])
            setOffset(prev => prev + 15)
            setHasMore(offset + 15 < data.total)
        } catch (err) {
            console.error('[ALL USERS] Failed to load more users:', err)
        } finally {
            setLoadingMore(false)
        }
    }

    // Map follow status to each user based on followingIds (client-side, instant)
    const usersWithFollowStatus = displayUsers.map(user => ({
        ...user,
        follow_status: followingIds.includes(user.id) ? 'following' : null
    }))

    const handleFollowChange = (userId, isFollowing) => {
        console.log('[ALL USERS] Follow change:', { userId, isFollowing })
        // Update followingIds list
        if (isFollowing) {
            setFollowingIds(prev => [...prev, userId])
        } else {
            setFollowingIds(prev => prev.filter(id => id !== userId))
        }
    }

    // Filter users based on search and type
    const filteredUsers = usersWithFollowStatus.filter(user => {
        const matchesSearch =
            user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.job_title?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesType =
            filterType === 'all' ||
            (filterType === 'workers' && user.user_type === 'worker') ||
            (filterType === 'clients' && user.user_type === 'client')

        if (currentUser?.id === user.id) return false

        return matchesSearch && matchesType
    })

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Users</h1>
                    <p className="text-gray-600">Find and connect with workers and clients on GoArtisans</p>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex flex-col gap-4">
                        {/* Search Input */}
                        <input
                            type="text"
                            placeholder="Search by name or skill..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        {/* Filter Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-4 py-2 rounded-lg transition font-medium ${filterType === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                            >
                                All Users
                            </button>
                            <button
                                onClick={() => setFilterType('workers')}
                                className={`px-4 py-2 rounded-lg transition font-medium ${filterType === 'workers'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                            >
                                Workers
                            </button>
                            <button
                                onClick={() => setFilterType('clients')}
                                className={`px-4 py-2 rounded-lg transition font-medium ${filterType === 'clients'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                            >
                                Clients
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Info */}
                {!initialLoading && (
                    <p className="text-gray-600 mb-6">
                        Showing <span className="font-semibold">{filteredUsers.length}</span> user{filteredUsers.length !== 1 ? 's' : ''}
                    </p>
                )}

                {/* Users Grid */}
                {initialLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading users...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-600">{error}</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No users found</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                                    {/* Profile Picture Section */}
                                    <div className="h-48 bg-indigo-100 flex items-center justify-center overflow-hidden">
                                        {user.profile_picture ? (
                                            <img
                                                src={user.profile_picture}
                                                alt={`${user.first_name} ${user.last_name}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-6xl">
                                                {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4">
                                        {/* User Type Badge */}
                                        <div className="mb-3 flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${user.user_type === 'worker'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {user.user_type === 'worker' ? '🔧 Worker' : '👔 Client'}
                                            </span>
                                            {user.is_active && user.user_type === 'worker' && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-semibold">
                                                    ✓ Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Follow Button */}
                                        <div className="mb-3">
                                            {currentUser ? (
                                                <FollowButton
                                                    userId={currentUser.id}
                                                    targetUserId={user.id}
                                                    targetUserName={`${user.first_name} ${user.last_name}`}
                                                    followStatus={user.follow_status}
                                                    onFollowChange={(isFollowing) => handleFollowChange(user.id, isFollowing)}
                                                />
                                            ) : (
                                                <button disabled className="w-full bg-gray-300 text-white px-4 py-2 rounded-lg cursor-not-allowed font-medium text-sm">
                                                    Login to follow
                                                </button>
                                            )}
                                        </div>

                                        {/* Conditional Info - Show when followed or self */}
                                        {user.follow_status || !currentUser ? (
                                            <>
                                                {/* Name */}
                                                <Link href={`/workers/${user.id}`}>
                                                    <h3 className="font-bold text-gray-900 mb-1 hover:text-indigo-600 cursor-pointer">
                                                        {user.first_name} {user.last_name}
                                                    </h3>
                                                </Link>

                                                {/* Job Title */}
                                                {user.job_title && (
                                                    <p className="text-sm text-indigo-600 font-semibold mb-2">
                                                        {user.job_title}
                                                    </p>
                                                )}

                                                {/* Bio Preview */}
                                                {user.bio && (
                                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                        {user.bio}
                                                    </p>
                                                )}

                                                {/* Location */}
                                                {user.location && (
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        📍 {user.location}
                                                    </p>
                                                )}

                                                {/* Rating for workers */}
                                                {user.user_type === 'worker' && user.rating > 0 && (
                                                    <p className="text-sm text-yellow-500 font-semibold mb-2">
                                                        ⭐ {user.rating.toFixed(1)} / 5.0
                                                    </p>
                                                )}

                                                {/* Skills for workers */}
                                                {user.user_type === 'worker' && user.services && user.services.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-xs text-gray-600 font-semibold mb-1">Skills:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.services.slice(0, 3).map((service, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded"
                                                                >
                                                                    {service}
                                                                </span>
                                                            ))}
                                                            {user.services.length > 3 && (
                                                                <span className="text-xs text-gray-600">
                                                                    +{user.services.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* View Profile Link */}
                                                <Link
                                                    href={`/workers/${user.id}`}
                                                    className="block text-center text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-3"
                                                >
                                                    View Profile →
                                                </Link>
                                            </>
                                        ) : (
                                            /* Locked state - profile picture only visible */
                                            <p className="text-center text-xs text-gray-500">
                                                👤 Follow to see more
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Infinite scroll loader */}
                        {hasMore && (
                            <div ref={loaderRef} className="text-center py-12">
                                {loadingMore ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <p className="text-gray-500 text-sm">Loading more users...</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">Scroll to load more</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
