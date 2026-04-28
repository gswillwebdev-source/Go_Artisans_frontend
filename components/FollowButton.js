'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { FOLLOW_SYNC_EVENT } from '@/hooks/useFollowSync'

export default function FollowButton({ userId, targetUserId, targetUserName, followStatus, onFollowChange }) {
  const [status, setStatus] = useState(followStatus) // 'following', 'follower', 'mutual', or null
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    // Update status when followStatus prop changes
    setStatus(followStatus)
  }, [followStatus])

  useEffect(() => {
    // Get auth token from Supabase session
    const getToken = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        setToken(session.access_token)
      }
    }
    getToken()
  }, [])

  const handleFollowClick = async () => {
    if (!userId || !targetUserId) {
      setError('User information missing')
      return
    }

    if (!token) {
      setError('Not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)
    const previousStatus = status // Save current state for rollback

    try {
      const action = status === 'following' ? 'unfollow' : 'follow'
      console.log('[FOLLOW BUTTON] Action:', { action, userId, targetUserId, currentStatus: status })

      // Update local state optimistically BEFORE API call
      if (action === 'follow') {
        setStatus('following')
      } else {
        setStatus(null)
      }

      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: action,
          userId: userId,
          following_id: targetUserId
        })
      })

      const data = await response.json()
      console.log('[FOLLOW BUTTON] Response:', { status: response.status, data })

      if (!response.ok) {
        // Rollback local state on error
        setStatus(previousStatus)
        setError(data.error || 'Failed to update follow status')
        return
      }

      // Emit follow sync event for all pages to listen to
      const event = new CustomEvent(FOLLOW_SYNC_EVENT, {
        detail: {
          followerId: userId,
          followingId: targetUserId,
          isFollowing: action === 'follow'
        }
      })
      console.log('[FOLLOW BUTTON] Emitting event:', { followerId: userId, followingId: targetUserId, isFollowing: action === 'follow' })
      window.dispatchEvent(event)
      console.log('[FOLLOW BUTTON] Event emitted successfully')

      // Notify parent component that Supabase is now updated
      if (onFollowChange) {
        console.log('[FOLLOW BUTTON] Calling onFollowChange callback')
        onFollowChange(action === 'follow')
      }

    } catch (err) {
      console.error('Follow error:', err)
      // Rollback on error
      setStatus(previousStatus)
      setError('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Determine button text and styling
  let buttonText = 'Follow'
  let buttonStyle = 'bg-indigo-600 hover:bg-indigo-700 text-white'

  if (status === 'following') {
    buttonText = 'Following'
    buttonStyle = 'bg-gray-200 hover:bg-gray-300 text-gray-800'
  } else if (status === 'mutual') {
    buttonText = 'Follow Back'
    buttonStyle = 'bg-green-600 hover:bg-green-700 text-white'
  } else if (status === 'follower') {
    buttonText = 'Follow Back'
    buttonStyle = 'bg-indigo-600 hover:bg-indigo-700 text-white'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {status === 'following' ? (
        // Show 2 buttons when already following
        <div className="flex gap-2 w-full">
          <button
            onClick={handleFollowClick}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Unfollow'}
          </button>
          <button
            onClick={() => window.location.href = `/workers/${targetUserId}`}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            About
          </button>
        </div>
      ) : (
        // Show single Follow button when not following
        <button
          onClick={handleFollowClick}
          disabled={isLoading}
          className="w-full px-6 py-2 rounded-lg font-medium transition bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Follow'}
        </button>
      )}
      {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
    </div>
  )
}
