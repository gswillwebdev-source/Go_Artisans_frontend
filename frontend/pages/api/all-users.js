import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Add caching headers
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { limit = 30, offset = 0 } = req.query

    console.log('[ALL USERS API] Fetching users - limit:', limit, 'offset:', offset)

    // Fetch all users (clients + workers) - filter after
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        id, first_name, last_name, profile_picture, job_title, location,
        user_type, rating, bio, services, portfolio, completed_jobs, is_active, created_at
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('[ALL USERS API] Error:', usersError)
      throw usersError
    }

    // Filter: Show all clients + only active workers
    const filteredUsers = (allUsers || []).filter(user => {
      if (user.user_type === 'client') {
        return true
      }
      if (user.user_type === 'worker' && user.is_active === true) {
        return true
      }
      return false
    })

    // Apply pagination
    const paginatedUsers = filteredUsers.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    )
    const total = filteredUsers.length

    console.log('[ALL USERS API] Returning', paginatedUsers.length, 'users')

    return res.status(200).json({
      users: paginatedUsers,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('[ALL USERS API] Error:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
}
