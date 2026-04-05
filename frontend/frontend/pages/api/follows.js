import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const { action, following_id, userId } = req.body

    // Get auth token from request headers
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'Missing authentication token' })
    }

    // Create Supabase client with user's session token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Verify the token user matches the userId (security check)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    if (user.id !== userId) {
      return res.status(403).json({ error: 'You can only manage your own follows' })
    }

    // Validate following_id
    if (!following_id) {
      return res.status(400).json({ error: 'following_id is required' })
    }

    // Prevent self-follow
    if (userId === following_id) {
      return res.status(400).json({ error: 'Cannot follow yourself' })
    }

    if (action === 'follow') {
      // Create follow relationship
      const { data, error } = await supabase
        .from('follows')
        .insert({
          follower_id: userId,
          following_id: following_id,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        // Check if it's a unique constraint violation (already following)
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Already following this user' })
        }
        console.error('[FOLLOW API] Insert error:', error)
        throw error
      }

      console.log('[FOLLOW API] User followed successfully')
      return res.status(200).json({
        success: true,
        message: 'Followed successfully',
        follow_id: data.id,
        status: 'active'
      })

    } else if (action === 'unfollow') {
      // Delete follow relationship
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', following_id)

      if (error) {
        console.error('[FOLLOW API] Delete error:', error)
        throw error
      }

      console.log('[FOLLOW API] User unfollowed successfully')
      return res.status(200).json({
        success: true,
        message: 'Unfollowed successfully'
      })

    } else {
      return res.status(400).json({ error: 'Invalid action. Use "follow" or "unfollow"' })
    }

  } catch (error) {
    console.error('[FOLLOW API] Error:', error)
    console.error('[FOLLOW API] Error details:', {
      message: error.message,
      code: error.code
    })

    return res.status(500).json({ error: 'Failed to process follow request' })
  }
}
