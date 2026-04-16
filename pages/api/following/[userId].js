import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query
    const { viewer_id, limit = 20, offset = 0 } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Privacy check: Only the user can view their own following list
    if (viewer_id !== userId) {
      return res.status(403).json({ error: 'Cannot view other users\' following list' })
    }

    console.log('[FOLLOWING API] Fetching following list for:', userId)

    // Fetch users this person is following with pagination
    const { data: following, error: followingError, count } = await supabase
      .from('follows')
      .select(
        `
        following_id,
        following:following_id (
          id, first_name, last_name, profile_picture, job_title, location,
          user_type, rating, bio
        )
        `,
        { count: 'exact' }
      )
      .eq('follower_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (followingError) {
      console.error('[FOLLOWING API] Error:', followingError)
      throw followingError
    }

    // Transform response to clean up nested structure
    const cleanFollowing = (following || []).map(f => ({
      ...f.following,
      relationship: {
        followed_at: f.created_at
      }
    }))

    console.log('[FOLLOWING API] Retrieved', cleanFollowing.length, 'following')

    return res.status(200).json({
      following: cleanFollowing,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('[FOLLOWING API] Error:', error)
    console.error('[FOLLOWING API] Error details:', {
      message: error.message
    })

    return res.status(500).json({ error: 'Failed to fetch following list' })
  }
}
