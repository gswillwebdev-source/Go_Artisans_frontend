'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getCoords } from '@/lib/locationCoords'
import FollowButton from '@/components/FollowButton'
import Image from 'next/image'
import Link from 'next/link'

/**
 * WorldGlobe — 3D interactive globe showing all users' locations.
 * Must be imported with { ssr: false } via next/dynamic.
 *
 * Props:
 *   users          – array of user objects from /api/all-users
 *   currentUser    – logged-in user object (or null)
 *   followingIds   – array of user IDs the current user follows
 *   onFollowChange – (userId, isFollowing) => void
 */
export default function WorldGlobe({ users, currentUser, followingIds, onFollowChange }) {
    const containerRef = useRef(null)
    const globeRef = useRef(null)
    const [selectedUser, setSelectedUser] = useState(null)
    const [globeReady, setGlobeReady] = useState(false)

    // Build point data from users + current user
    const buildPoints = useCallback((allUsers, me) => {
        const points = []

        // Other users
        allUsers.forEach(user => {
            if (me && user.id === me.id) return
            const coords = getCoords(user.location)
            if (!coords) return
            points.push({
                ...user,
                lat: coords.lat,
                lng: coords.lng,
                isCurrentUser: false,
            })
        })

        // Current user — blue pulsing ring
        if (me) {
            const coords = getCoords(me.location)
            if (coords) {
                points.push({
                    ...me,
                    lat: coords.lat,
                    lng: coords.lng,
                    isCurrentUser: true,
                })
            }
        }

        return points
    }, [])

    useEffect(() => {
        if (!containerRef.current) return
        let globe = null
        let destroyed = false

        const initGlobe = async () => {
            const GlobeLib = (await import('globe.gl')).default

            if (destroyed) return

            const points = buildPoints(users, currentUser)

            // Determine camera start point
            let startLat = 8
            let startLng = 1
            if (currentUser) {
                const coords = getCoords(currentUser.location)
                if (coords) { startLat = coords.lat; startLng = coords.lng }
            }

            globe = GlobeLib()(containerRef.current)
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
                .width(containerRef.current.offsetWidth || 800)
                .height(containerRef.current.offsetHeight || 600)

                // --- Pulsing rings for current user ---
                .ringsData(
                    points.filter(p => p.isCurrentUser).map(p => ({ lat: p.lat, lng: p.lng }))
                )
                .ringColor(() => 'rgba(59, 130, 246, 0.8)')
                .ringMaxRadius(4)
                .ringPropagationSpeed(2)
                .ringRepeatPeriod(1000)

                // --- Points for all users ---
                .pointsData(points)
                .pointLat('lat')
                .pointLng('lng')
                .pointColor(d =>
                    d.isCurrentUser
                        ? '#3B82F6'         // blue for current user
                        : d.user_type === 'worker'
                            ? '#F59E0B'       // amber for workers
                            : '#10B981'       // emerald for clients
                )
                .pointAltitude(d => d.isCurrentUser ? 0.08 : 0.04)
                .pointRadius(d => d.isCurrentUser ? 0.8 : 0.55)
                .pointLabel(d =>
                    `<div style="background:rgba(17,24,39,0.9);color:#fff;padding:6px 10px;border-radius:8px;font-size:13px;pointer-events:none;">
            ${d.isCurrentUser ? '📍 You' : `${d.first_name || ''} ${d.last_name || ''}`}
          </div>`
                )
                .onPointClick(d => {
                    if (!d.isCurrentUser) setSelectedUser(d)
                })

                // Camera
                .pointOfView({ lat: startLat, lng: startLng, altitude: 2.5 }, 1000)

            // Auto-rotate
            globe.controls().autoRotate = true
            globe.controls().autoRotateSpeed = 0.5

            // Pause rotation when user interacts
            globe.controls().addEventListener('start', () => {
                globe.controls().autoRotate = false
            })

            globeRef.current = globe
            setGlobeReady(true)
        }

        initGlobe()

        return () => {
            destroyed = true
            if (globeRef.current) {
                try { globeRef.current._destructor?.() } catch (_) { }
                globeRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Update points when users or followingIds change (after globe is ready)
    useEffect(() => {
        if (!globeRef.current || !globeReady) return
        const points = buildPoints(users, currentUser)
        globeRef.current
            .pointsData(points)
            .ringsData(points.filter(p => p.isCurrentUser).map(p => ({ lat: p.lat, lng: p.lng })))
    }, [users, currentUser, followingIds, globeReady, buildPoints])

    // Handle resize
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const ro = new ResizeObserver(() => {
            if (globeRef.current && el) {
                globeRef.current.width(el.offsetWidth).height(el.offsetHeight)
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const isFollowing = selectedUser
        ? followingIds.includes(selectedUser.id) || selectedUser.follow_status === 'following'
        : false

    return (
        /* Full-viewport globe — edge to edge, no border-radius on outer wrapper */
        <div className="relative w-full" style={{ height: '100vh', minHeight: 600 }}>
            {/* Globe canvas */}
            <div ref={containerRef} className="w-full h-full bg-gray-950" />

            {/* Loading overlay */}
            {!globeReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                    <div className="text-center text-white">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-base opacity-70 tracking-wide">Loading 3D Globe…</p>
                    </div>
                </div>
            )}

            {/* Legend — bottom left */}
            {globeReady && (
                <div className="absolute bottom-10 left-4 bg-black/60 text-white text-xs rounded-xl px-3 py-2 space-y-1.5 backdrop-blur-md">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block ring-2 ring-blue-400/40" /> You</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Worker</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Client</div>
                </div>
            )}

            {/* Hint — bottom center */}
            {globeReady && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs rounded-full px-5 py-2 backdrop-blur-md pointer-events-none whitespace-nowrap">
                    Drag to rotate · Scroll to zoom · Tap a dot to connect
                </div>
            )}

            {/* User popup card */}
            {selectedUser && (
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-3xl shadow-2xl overflow-hidden z-20"
                    style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
                >
                    {/* Close */}
                    <button
                        onClick={() => setSelectedUser(null)}
                        className="absolute top-3 right-3 z-30 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-sm transition"
                    >
                        ×
                    </button>

                    {/* Banner / avatar hero */}
                    <div className="h-24 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                            <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-indigo-100 flex items-center justify-center shadow-lg">
                                {selectedUser.profile_picture ? (
                                    <img
                                        src={selectedUser.profile_picture}
                                        alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-indigo-600">
                                        {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Name + type */}
                    <div className="pt-12 px-5 pb-1 text-center">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                            {selectedUser.first_name} {selectedUser.last_name}
                        </h3>
                        <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            selectedUser.user_type === 'worker'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                        }`}>
                            {selectedUser.user_type === 'worker' ? '🔧 Worker' : '👔 Client'}
                        </span>
                        {selectedUser.location && (
                            <p className="text-xs text-gray-400 mt-1">📍 {selectedUser.location}</p>
                        )}
                    </div>

                    {/* POST-FOLLOW details — only visible once following */}
                    {isFollowing && (
                        <div className="px-5 py-2 space-y-1.5 border-t border-gray-100 mt-2">
                            {selectedUser.job_title && (
                                <p className="text-sm text-indigo-600 font-medium text-center">{selectedUser.job_title}</p>
                            )}
                            {selectedUser.bio && (
                                <p className="text-xs text-gray-500 text-center line-clamp-2">{selectedUser.bio}</p>
                            )}
                            {/* Email — visible after following */}
                            {selectedUser.email && (
                                <a
                                    href={`mailto:${selectedUser.email}`}
                                    className="flex items-center justify-center gap-1.5 text-sm text-indigo-700 font-medium hover:underline"
                                >
                                    ✉️ {selectedUser.email}
                                </a>
                            )}
                            <Link
                                href={`/workers/${selectedUser.id}`}
                                className="block text-center text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl transition mt-1"
                                onClick={() => setSelectedUser(null)}
                            >
                                View Full Profile →
                            </Link>
                        </div>
                    )}

                    {/* Not following yet — prompt */}
                    {!isFollowing && (
                        <p className="px-5 pb-1 text-center text-xs text-gray-400">
                            Follow to see contact details & full profile
                        </p>
                    )}

                    {/* Follow button */}
                    <div className="px-5 pb-5 pt-2">
                        {currentUser ? (
                            <FollowButton
                                userId={currentUser.id}
                                targetUserId={selectedUser.id}
                                targetUserName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                                followStatus={isFollowing ? 'following' : null}
                                onFollowChange={(following) => {
                                    onFollowChange(selectedUser.id, following)
                                    setSelectedUser(prev =>
                                        prev ? { ...prev, follow_status: following ? 'following' : null } : null
                                    )
                                }}
                            />
                        ) : (
                            <Link
                                href="/login"
                                className="block w-full text-center text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition"
                            >
                                Log in to follow
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
