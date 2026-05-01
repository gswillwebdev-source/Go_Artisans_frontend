'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getCoords } from '@/lib/locationCoords'
import FollowButton from '@/components/FollowButton'
import Link from 'next/link'

/**
 * WorldGlobe — interactive map with globe projection + full street-level zoom.
 * Powered by MapLibre GL JS. Must be imported with { ssr: false } via next/dynamic.
 *
 * Props:
 *   users          – array of user objects from /api/all-users
 *   currentUser    – logged-in user object (or null)
 *   followingIds   – array of user IDs the current user follows
 *   onFollowChange – (userId, isFollowing) => void
 */
export default function WorldGlobe({ users, currentUser, followingIds, onFollowChange }) {
    const containerRef = useRef(null)
    const mapRef = useRef(null)
    const [selectedUser, setSelectedUser] = useState(null)
    const [mapReady, setMapReady] = useState(false)

    /** Build a GeoJSON FeatureCollection from the user list */
    const buildGeoJSON = useCallback((allUsers, me) => {
        const features = []
        const addedIds = new Set()

        allUsers.forEach(user => {
            const coords = getCoords(user.location)
            if (!coords) return
            const isMe = me && String(user.id) === String(me.id)
            addedIds.add(String(user.id))
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                properties: {
                    id: user.id,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    email: user.email || '',
                    location: user.location || '',
                    user_type: user.user_type || '',
                    profile_picture: user.profile_picture || '',
                    bio: user.bio || '',
                    job_title: user.job_title || '',
                    follow_status: user.follow_status || '',
                    isCurrentUser: isMe,
                    dotColor: isMe ? '#3B82F6' : (user.user_type === 'worker' ? '#F59E0B' : '#10B981'),
                }
            })
        })

        // Always add the current user as a blue dot if they weren't already included
        if (me && !addedIds.has(String(me.id))) {
            const coords = getCoords(me.location)
            if (coords) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                    properties: {
                        id: me.id,
                        first_name: me.first_name || '',
                        last_name: me.last_name || '',
                        email: me.email || '',
                        location: me.location || '',
                        user_type: me.user_type || '',
                        profile_picture: me.profile_picture || '',
                        bio: me.bio || '',
                        job_title: me.job_title || '',
                        follow_status: '',
                        isCurrentUser: true,
                        dotColor: '#3B82F6',
                    }
                })
            }
        }

        return { type: 'FeatureCollection', features }
    }, [])

    useEffect(() => {
        if (!containerRef.current) return
        let destroyed = false

        // Inject MapLibre CSS once
        if (!document.getElementById('maplibre-css')) {
            const link = document.createElement('link')
            link.id = 'maplibre-css'
            link.rel = 'stylesheet'
            link.href = 'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css'
            document.head.appendChild(link)
        }

        const init = async () => {
            const maplibregl = (await import('maplibre-gl')).default
            if (destroyed || !containerRef.current) return

            // Start at current user's city, or default West Africa overview
            let startLng = 1, startLat = 8, startZoom = 2
            if (currentUser) {
                const coords = getCoords(currentUser.location)
                if (coords) { startLng = coords.lng; startLat = coords.lat; startZoom = 6 }
            }

            const map = new maplibregl.Map({
                container: containerRef.current,
                // OpenFreeMap — fully free, no API key, vector tiles with street detail
                style: 'https://tiles.openfreemap.org/styles/liberty',
                center: [startLng, startLat],
                zoom: startZoom,
                minZoom: 0,
                maxZoom: 20,
                attributionControl: false,
            })

            // Controls
            map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
            map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right')
            map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

            map.on('load', () => {
                if (destroyed) return

                // Globe projection (zoom out = globe, zoom in = flat street map)
                try {
                    map.setProjection({ type: 'globe' })
                    // Atmosphere effect
                    map.setFog({
                        range: [0.5, 10],
                        color: '#ffffff',
                        'horizon-blend': 0.08,
                        'high-color': '#245bde',
                        'space-color': '#0b0b2e',
                        'star-intensity': 0.5,
                    })
                } catch (_) { /* older version — flat map still works fine */ }

                const geojson = buildGeoJSON(users, currentUser)

                map.addSource('users', { type: 'geojson', data: geojson })

                // Soft glow around every dot
                map.addLayer({
                    id: 'users-glow',
                    type: 'circle',
                    source: 'users',
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 9, 6, 16, 14, 26],
                        'circle-color': ['get', 'dotColor'],
                        'circle-opacity': 0.2,
                        'circle-blur': 0.7,
                    }
                })

                // Main dot (scales with zoom)
                map.addLayer({
                    id: 'users-dots',
                    type: 'circle',
                    source: 'users',
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 6, 9, 14, 15],
                        'circle-color': ['get', 'dotColor'],
                        'circle-stroke-width': 1.5,
                        'circle-stroke-color': '#ffffff',
                    }
                })

                // Pulsing ring for current user
                map.addLayer({
                    id: 'current-user-ring',
                    type: 'circle',
                    source: 'users',
                    filter: ['==', ['get', 'isCurrentUser'], true],
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 12, 6, 20, 14, 30],
                        'circle-color': '#3B82F6',
                        'circle-opacity': 0,
                        'circle-stroke-width': 2.5,
                        'circle-stroke-color': '#3B82F6',
                        'circle-stroke-opacity': 0.85,
                    }
                })

                // Click dot → open popup
                map.on('click', 'users-dots', (e) => {
                    if (!e.features?.length) return
                    const props = { ...e.features[0].properties }
                    // Booleans may be stringified by GeoJSON serialisation
                    if (props.isCurrentUser === true || props.isCurrentUser === 'true') return
                    setSelectedUser(props)
                })

                // Cursor hand on hover
                map.on('mouseenter', 'users-dots', () => { map.getCanvas().style.cursor = 'pointer' })
                map.on('mouseleave', 'users-dots', () => { map.getCanvas().style.cursor = '' })

                // Click empty space → close popup
                map.on('click', (e) => {
                    const hits = map.queryRenderedFeatures(e.point, { layers: ['users-dots'] })
                    if (!hits.length) setSelectedUser(null)
                })

                mapRef.current = map
                setMapReady(true)
            })
        }

        init()

        return () => {
            destroyed = true
            if (mapRef.current) {
                try { mapRef.current.remove() } catch (_) { }
                mapRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Live-update dots when user list or follow status changes
    useEffect(() => {
        if (!mapRef.current || !mapReady) return
        const src = mapRef.current.getSource('users')
        if (src) src.setData(buildGeoJSON(users, currentUser))
    }, [users, currentUser, followingIds, mapReady, buildGeoJSON])

    const isFollowing = selectedUser
        ? followingIds.includes(selectedUser.id) || selectedUser.follow_status === 'following'
        : false

    return (
        <div className="relative w-full" style={{ height: '100vh', minHeight: 600 }}>
            {/* MapLibre canvas */}
            <div ref={containerRef} className="w-full h-full" />

            {/* Loading overlay */}
            {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                    <div className="text-center text-white">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-base opacity-70 tracking-wide">Loading Map…</p>
                    </div>
                </div>
            )}

            {/* Legend */}
            {mapReady && (
                <div className="absolute bottom-10 left-4 bg-black/60 text-white text-xs rounded-xl px-3 py-2 space-y-1.5 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block ring-2 ring-blue-400/40" /> You</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Worker</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Client</div>
                </div>
            )}

            {/* Hint bar */}
            {mapReady && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs rounded-full px-5 py-2 backdrop-blur-md pointer-events-none whitespace-nowrap z-10">
                    Drag to pan · Scroll / pinch to zoom to street level · Tap a dot to connect
                </div>
            )}

            {/* User popup */}
            {selectedUser && (
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-3xl shadow-2xl overflow-hidden z-20"
                    style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
                >
                    {/* Close */}
                    <button
                        onClick={() => setSelectedUser(null)}
                        className="absolute top-3 right-3 z-30 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-sm transition"
                    >×</button>

                    {/* Hero banner + avatar */}
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

                    {/* Name + type + location */}
                    <div className="pt-12 px-5 pb-1 text-center">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                            {selectedUser.first_name} {selectedUser.last_name}
                        </h3>
                        <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${selectedUser.user_type === 'worker'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                            }`}>
                            {selectedUser.user_type === 'worker' ? '🔧 Worker' : '👔 Client'}
                        </span>
                        {selectedUser.location && (
                            <p className="text-xs text-gray-400 mt-1">📍 {selectedUser.location}</p>
                        )}
                    </div>

                    {/* POST-FOLLOW details */}
                    {isFollowing && (
                        <div className="px-5 py-2 space-y-1.5 border-t border-gray-100 mt-2">
                            {selectedUser.job_title && (
                                <p className="text-sm text-indigo-600 font-medium text-center">{selectedUser.job_title}</p>
                            )}
                            {selectedUser.bio && (
                                <p className="text-xs text-gray-500 text-center line-clamp-2">{selectedUser.bio}</p>
                            )}
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

                    {/* Pre-follow prompt */}
                    {!isFollowing && (
                        <p className="px-5 pb-1 text-center text-xs text-gray-400">
                            Follow to see contact details & full profile
                        </p>
                    )}

                    {/* Follow / login button */}
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

