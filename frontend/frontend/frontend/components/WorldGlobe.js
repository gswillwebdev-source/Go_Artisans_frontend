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
        .pointAltitude(d => d.isCurrentUser ? 0.06 : 0.03)
        .pointRadius(d => d.isCurrentUser ? 0.6 : 0.4)
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
        try { globeRef.current._destructor?.() } catch (_) {}
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

  const isFollowing = selectedUser ? followingIds.includes(selectedUser.id) : false

  return (
    <div className="relative w-full" style={{ height: 'clamp(400px, 70vh, 700px)' }}>
      {/* Globe container */}
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden bg-gray-950" />

      {/* Loading overlay */}
      {!globeReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 rounded-2xl">
          <div className="text-center text-white">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm opacity-70">Loading 3D globe…</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {globeReady && (
        <div className="absolute top-3 left-3 bg-gray-900/80 text-white text-xs rounded-xl px-3 py-2 space-y-1 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> You
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Worker
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Client
          </div>
        </div>
      )}

      {/* Interaction hint */}
      {globeReady && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900/70 text-white text-xs rounded-full px-4 py-1.5 backdrop-blur-sm pointer-events-none">
          Drag to rotate · Scroll to zoom · Click a dot to view profile
        </div>
      )}

      {/* User popup */}
      {selectedUser && (
        <div className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              selectedUser.user_type === 'worker'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {selectedUser.user_type === 'worker' ? '🔧 Worker' : '👔 Client'}
            </span>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Avatar */}
          <div className="px-4 pt-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 flex items-center justify-center">
              {selectedUser.profile_picture ? (
                <img
                  src={selectedUser.profile_picture}
                  alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-indigo-600">
                  {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/workers/${selectedUser.id}`}
                className="font-bold text-gray-900 hover:text-indigo-600 block truncate"
                onClick={() => setSelectedUser(null)}
              >
                {selectedUser.first_name} {selectedUser.last_name}
              </Link>
              {selectedUser.job_title && (
                <p className="text-xs text-indigo-600 font-medium truncate">{selectedUser.job_title}</p>
              )}
              {selectedUser.location && (
                <p className="text-xs text-gray-500">📍 {selectedUser.location}</p>
              )}
            </div>
          </div>

          {/* Bio preview */}
          {selectedUser.bio && (
            <p className="px-4 pt-2 text-sm text-gray-600 line-clamp-2">{selectedUser.bio}</p>
          )}

          {/* Actions */}
          <div className="px-4 py-3 flex gap-2">
            {currentUser ? (
              <div className="flex-1">
                <FollowButton
                  userId={currentUser.id}
                  targetUserId={selectedUser.id}
                  targetUserName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                  followStatus={isFollowing ? 'following' : null}
                  onFollowChange={(following) => {
                    onFollowChange(selectedUser.id, following)
                    setSelectedUser(prev => prev ? { ...prev, follow_status: following ? 'following' : null } : null)
                  }}
                />
              </div>
            ) : null}
            <Link
              href={`/workers/${selectedUser.id}`}
              className="flex-1 text-center text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg transition"
              onClick={() => setSelectedUser(null)}
            >
              View Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
