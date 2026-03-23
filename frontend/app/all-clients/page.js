'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@supabase/supabase-js'
import { FOLLOW_SYNC_EVENT } from '@/hooks/useFollowSync'
import FollowButton from '@/components/FollowButton'

export default function AllClientsPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth({ redirectToLogin: false })
    const [displayClients, setDisplayClients] = useState([])
    const [followingIds, setFollowingIds] = useState([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const loaderRef = useRef(null)

    // Fetch user's follows ONCE on mount
    useEffect(() => {
        if (currentUser?.id) {
            fetchUserFollows()
        }
    }, [currentUser?.id])

    // Fetch initial 30 clients
    useEffect(() => {
        if (!authLoading) {
            fetchInitialClients()
        }
    }, [authLoading, currentUser?.id])

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !loadingMore && hasMore) {
                loadMoreClients()
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

            console.log('[ALL CLIENTS] Follow event received with detail:', event.detail)
            console.log('[ALL CLIENTS] Current user:', currentUser?.id)
            console.log('[ALL CLIENTS] Follower ID matches current user?', String(followerId) === String(currentUser?.id))

            // If current user is the one doing the following, update followingIds
            // Use String comparison to handle UUID/string type differences
            if (String(followerId) === String(currentUser?.id)) {
                console.log('[ALL CLIENTS] MATCH! Follow event for this user')
                setFollowingIds(prev => {
                    if (isFollowing) {
                        const updated = prev.includes(followingId) ? prev : [...prev, followingId]
                        console.log('[ALL CLIENTS] Added to followingIds:', { old: prev, new: updated })
                        return updated
                    } else {
                        const updated = prev.filter(id => id !== followingId)
                        console.log('[ALL CLIENTS] Removed from followingIds:', { old: prev, new: updated })
                        return updated
                    }
                })
            } else {
                console.log('[ALL CLIENTS] NO MATCH - event is for different user')
            }
        }

        if (typeof window !== 'undefined') {
            console.log('[ALL CLIENTS] Setting up event listener for FOLLOW_SYNC_EVENT:', FOLLOW_SYNC_EVENT)
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
                console.log('[ALL CLIENTS] Fetched', data.length, 'follows')
                setFollowingIds(data.map(f => f.following_id))
            }
        } catch (err) {
            console.error('[ALL CLIENTS] Failed to fetch follows:', err)
        }
    }

    const fetchInitialClients = async () => {
        try {
            setInitialLoading(true)
            setError(null)
            console.log('[ALL CLIENTS] Fetching initial 30 clients...')

            const response = await fetch('/api/all-clients?limit=30&offset=0')
            if (!response.ok) throw new Error('Failed to fetch clients')

            const data = await response.json()
            console.log('[ALL CLIENTS] Loaded', data.users?.length, 'clients')
            setDisplayClients(data.users || [])
            setOffset(30)
            setHasMore(data.total > 30)
        } catch (err) {
            console.error('Failed to fetch clients:', err)
            setError('Failed to load clients')
        } finally {
            setInitialLoading(false)
        }
    }

    const loadMoreClients = async () => {
        try {
            setLoadingMore(true)
            console.log('[ALL CLIENTS] Loading more clients from offset:', offset)

            const response = await fetch(`/api/all-clients?limit=15&offset=${offset}`)
            if (!response.ok) throw new Error('Failed to fetch more clients')

            const data = await response.json()
            const newClients = data.users || []
            console.log('[ALL CLIENTS] Loaded', newClients.length, 'more clients')

            setDisplayClients(prev => [...prev, ...newClients])
            setOffset(prev => prev + 15)
            setHasMore(offset + 15 < data.total)
        } catch (err) {
            console.error('[ALL CLIENTS] Failed to load more clients:', err)
        } finally {
            setLoadingMore(false)
        }
    }

    // Map follow status to each client based on followingIds (client-side, instant)
    const clientsWithFollowStatus = displayClients.map(client => ({
        ...client,
        follow_status: followingIds.includes(client.id) ? 'following' : null
    }))

    const handleFollowChange = (clientId, isFollowing) => {
        console.log('[ALL CLIENTS] Follow change:', { clientId, isFollowing })
        // Update followingIds list
        if (isFollowing) {
            setFollowingIds(prev => [...prev, clientId])
        } else {
            setFollowingIds(prev => prev.filter(id => id !== clientId))
        }
    }

    // Filter clients based on search
    const filteredClients = clientsWithFollowStatus.filter(client => {
        const matchesSearch =
            client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.job_title?.toLowerCase().includes(searchTerm.toLowerCase())

        if (currentUser?.id === client.id) return false

        return matchesSearch
    })

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Clients</h1>
                    <p className="text-gray-600">Find and connect with clients on GoArtisans</p>
                </div>

                {/* Search */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex flex-col gap-4">
                        {/* Search Input */}
                        <input
                            type="text"
                            placeholder="Search by name or business..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Results Info */}
                {!initialLoading && (
                    <p className="text-gray-600 mb-6">
                        Showing <span className="font-semibold">{filteredClients.length}</span> client{filteredClients.length !== 1 ? 's' : ''}
                    </p>
                )}

                {/* Clients Grid */}
                {initialLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading clients...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-600">{error}</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No clients found</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredClients.map((client) => (
                                <div key={client.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                                    {/* Profile Picture Section */}
                                    <div className="h-48 bg-green-100 flex items-center justify-center overflow-hidden">
                                        {client.profile_picture ? (
                                            <img
                                                src={client.profile_picture}
                                                alt={`${client.first_name} ${client.last_name}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-green-200 flex items-center justify-center text-green-600 font-bold text-6xl">
                                                {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4">
                                        {/* User Type Badge */}
                                        <div className="mb-3 flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-100 text-green-800">
                                                👔 Client
                                            </span>
                                        </div>

                                        {/* Follow Button */}
                                        <div className="mb-3">
                                            {currentUser ? (
                                                <FollowButton
                                                    userId={currentUser.id}
                                                    targetUserId={client.id}
                                                    targetUserName={`${client.first_name} ${client.last_name}`}
                                                    followStatus={client.follow_status}
                                                    onFollowChange={(isFollowing) => handleFollowChange(client.id, isFollowing)}
                                                />
                                            ) : (
                                                <button disabled className="w-full bg-gray-300 text-white px-4 py-2 rounded-lg cursor-not-allowed font-medium text-sm">
                                                    Login to follow
                                                </button>
                                            )}
                                        </div>

                                        {/* Conditional Info - Show when followed or not logged in */}
                                        {client.follow_status || !currentUser ? (
                                            <>
                                                {/* Name */}
                                                <Link href={`/workers/${client.id}`}>
                                                    <h3 className="font-bold text-gray-900 mb-1 hover:text-indigo-600 cursor-pointer">
                                                        {client.first_name} {client.last_name}
                                                    </h3>
                                                </Link>

                                                {/* Business/Job Title */}
                                                {client.job_title && (
                                                    <p className="text-sm text-green-600 font-semibold mb-2">
                                                        {client.job_title}
                                                    </p>
                                                )}

                                                {/* Bio/About */}
                                                {client.bio && (
                                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                        {client.bio}
                                                    </p>
                                                )}

                                                {/* Location */}
                                                {client.location && (
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        📍 {client.location}
                                                    </p>
                                                )}

                                                {/* Completed Transactions */}
                                                {client.completed_jobs > 0 && (
                                                    <p className="text-sm text-indigo-600 font-semibold mb-2">
                                                        ✓ {client.completed_jobs} Transaction{client.completed_jobs !== 1 ? 's' : ''}
                                                    </p>
                                                )}

                                                {/* View Profile Link */}
                                                <Link
                                                    href={`/workers/${client.id}`}
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
                                        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                                        <p className="text-gray-500 text-sm">Loading more clients...</p>
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
