'use client'

import { useEffect, useState, useCallback } from 'react'

// Custom event for follow state changes
const FOLLOW_EVENT = 'follow-state-change'

/**
 * Hook to sync follow state across pages
 * Listens for follow/unfollow events and updates local state accordingly
 *
 * @param {string} userId - The user ID to track follows for (can be follower or followee)
 * @returns {object} { followingIds, isFollowing, triggerRefresh }
 */
export function useFollowSync(userId) {
    const [followingIds, setFollowingIds] = useState([])

    // Emit a follow change event that all pages can listen to
    const emitFollowChange = useCallback((data) => {
        const event = new CustomEvent(FOLLOW_EVENT, { detail: data })
        window.dispatchEvent(event)
    }, [])

    // Listen for follow change events
    useEffect(() => {
        const handleFollowChange = (event) => {
            const { followerId, followingId, isFollowing } = event.detail

            if (!userId) return

            // Update follower IDs if this is the current user
            if (followerId === userId) {
                setFollowingIds(prev => {
                    if (isFollowing) {
                        return prev.includes(followingId) ? prev : [...prev, followingId]
                    } else {
                        return prev.filter(id => id !== followingId)
                    }
                })
            }
        }

        window.addEventListener(FOLLOW_EVENT, handleFollowChange)
        return () => window.removeEventListener(FOLLOW_EVENT, handleFollowChange)
    }, [userId])

    return {
        followingIds,
        emitFollowChange,
        isFollowing: (targetId) => followingIds.includes(targetId)
    }
}

// Export the event name for use in FollowButton
export const FOLLOW_SYNC_EVENT = FOLLOW_EVENT
