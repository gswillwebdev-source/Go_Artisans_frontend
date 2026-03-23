import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Calculate visibility based on user types and follow status
function calculateVisibility(viewerType, viewerId, profileOwnerType, profileOwnerId, isFollowing, isFollowedBy) {
  const isSelf = viewerId === profileOwnerId
  const visibility = {
    canSeeContact: false,
    canSeeGallery: false,
    canSeeJobs: false,
    canApply: false,
    canViewReviews: false
  }

  // Self view - can see everything
  if (isSelf) {
    return {
      canSeeContact: true,
      canSeeGallery: true,
      canSeeJobs: true,
      canApply: false,
      canViewReviews: true
    }
  }

  // Worker viewing Client profile
  if (viewerType === 'worker' && profileOwnerType === 'client') {
    return {
      canSeeContact: false,
      canSeeGallery: false,
      canSeeJobs: true, // Can see client's posted jobs
      canApply: true,   // Can apply to jobs
      canViewReviews: false
    }
  }

  // Worker viewing Worker profile
  if (viewerType === 'worker' && profileOwnerType === 'worker') {
    if (isFollowing || isFollowedBy) {
      return {
        canSeeContact: true,
        canSeeGallery: true,
        canSeeJobs: false,
        canApply: false,
        canViewReviews: true
      }
    }
    // Not following - no extra info
    return visibility
  }

  // Client viewing Worker profile
  if (viewerType === 'client' && profileOwnerType === 'worker') {
    if (isFollowing || isFollowedBy) {
      return {
        canSeeContact: true,
        canSeeGallery: true,
        canSeeJobs: false,
        canApply: false,
        canViewReviews: true
      }
    }
    // Not following - can see basic info but not contact
    return visibility
  }

  // Client viewing Client profile
  if (viewerType === 'client' && profileOwnerType === 'client') {
    if (isFollowing || isFollowedBy) {
      return {
        canSeeContact: false,
        canSeeGallery: false,
        canSeeJobs: true,
        canApply: false,
        canViewReviews: false
      }
    }
    // Not following - can't see job posts
    return visibility
  }

  return visibility
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    const { viewer_id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    console.log('[USER API] Fetching profile for:', { id, viewer_id })

    // Fetch the profile user
    const { data: profileUser, error: profileError } = await supabase
      .from('users')
      .select(`
        id, email, first_name, last_name, phone_number, user_type,
        job_title, location, bio, years_experience, services, portfolio,
        profile_picture, completed_jobs, rating, is_active, created_at
      `)
      .eq('id', id)
      .single()

    if (profileError) {
      console.error('[USER API] Profile fetch error:', profileError)
      return res.status(404).json({ error: 'User not found' })
    }

    // Fetch followers/following counts directly from follows table
    const followerCountResult = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id)
      .eq('status', 'active')

    const followingCountResult = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', id)
      .eq('status', 'active')

    const followerCount = followerCountResult.count ?? 0
    const followingCount = followingCountResult.count ?? 0

    if (followerCountResult.error) {
      console.error('[USER API] Follower count query error:', followerCountResult.error)
    }
    if (followingCountResult.error) {
      console.error('[USER API] Following count query error:', followingCountResult.error)
    }

    console.log('[USER API] Count queries:', {
      followerCountResult: { count: followerCountResult.count, error: followerCountResult.error },
      followingCountResult: { count: followingCountResult.count, error: followingCountResult.error },
      followerCount,
      followingCount
    })

    // Check follow status if viewer is authenticated
    let isFollowing = false
    let isFollowedBy = false
    let followStatus = null

    if (viewer_id && viewer_id !== id) {
      // Check if viewer follows profile user
      const { data: followCheck } = await supabase
        .from('follows')
        .select('id, status')
        .eq('follower_id', viewer_id)
        .eq('following_id', id)
        .single()

      if (followCheck && followCheck.status === 'active') {
        isFollowing = true
        followStatus = 'following'
      }

      // Check if profile user follows viewer
      const { data: followerCheck } = await supabase
        .from('follows')
        .select('id, status')
        .eq('follower_id', id)
        .eq('following_id', viewer_id)
        .single()

      if (followerCheck && followerCheck.status === 'active') {
        isFollowedBy = true
        if (followStatus === 'following') {
          followStatus = 'mutual'
        } else {
          followStatus = 'follower'
        }
      }
    }

    // Get viewer user type if viewer_id provided
    let viewerType = null
    if (viewer_id) {
      const { data: viewerUser } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', viewer_id)
        .single()

      if (viewerUser) {
        viewerType = viewerUser.user_type
      }
    }

    // Calculate visibility rules
    const visibility = viewerType
      ? calculateVisibility(
        viewerType,
        viewer_id,
        profileUser.user_type,
        id,
        isFollowing,
        isFollowedBy
      )
      : {
        canSeeContact: false,
        canSeeGallery: false,
        canSeeJobs: false,
        canApply: false,
        canViewReviews: false
      }

    // Apply visibility rules to response
    let safeUser = { ...profileUser }

    // Remove contact info if not allowed
    if (!visibility.canSeeContact) {
      safeUser.phone_number = null
      safeUser.email = null
    }

    // Hide portfolio/gallery if not allowed
    if (!visibility.canSeeGallery) {
      safeUser.portfolio = []
    }

    console.log('[USER API] Profile fetched with visibility rules applied')
    console.log('[USER API] Response:', {
      follower_count: followerCount,
      following_count: followingCount,
      follow_status: followStatus,
      isLoggedIn: !!viewer_id
    })

    return res.status(200).json({
      user: safeUser,
      follower_count: followerCount,
      following_count: followingCount,
      follow_status: followStatus,
      is_self: viewer_id === id,
      visibility: visibility
    })

  } catch (error) {
    console.error('[USER API] Error:', error)
    console.error('[USER API] Error details:', {
      message: error.message
    })

    return res.status(500).json({ error: 'Failed to fetch user profile' })
  }
}
