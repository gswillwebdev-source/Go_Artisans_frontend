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

    // Privacy check: Only the user can view their own followers list
    if (viewer_id !== userId) {
      return res.status(403).json({ error: 'Cannot view other users\' followers' })
    }

    console.log('[FOLLOWERS API] Fetching followers for:', userId)

    // Fetch followers with pagination
    const { data: followers, error: followersError, count } = await supabase
      .from('follows')
      .select(
        `
        follower_id,
        follower:follower_id (
          id, first_name, last_name, profile_picture, job_title, location,
          user_type, rating, bio
        )
        `,
        { count: 'exact' }
      )
      .eq('following_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (followersError) {
      console.error('[FOLLOWERS API] Error:', followersError)
      throw followersError
    }

    // Transform response to clean up nested structure
    const cleanFollowers = (followers || []).map(f => ({
      ...f.follower,
      relationship: {
        followed_at: f.created_at
      }
    }))

    console.log('[FOLLOWERS API] Retrieved', cleanFollowers.length, 'followers')

    return res.status(200).json({
      followers: cleanFollowers,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('[FOLLOWERS API] Error:', error)
    console.error('[FOLLOWERS API] Error details:', {
      message: error.message
    })

    return res.status(500).json({ error: 'Failed to fetch followers' })
  }
}
