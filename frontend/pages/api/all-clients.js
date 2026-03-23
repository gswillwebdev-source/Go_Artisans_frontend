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

    console.log('[ALL CLIENTS API] Fetching clients - limit:', limit, 'offset:', offset)

    // Fetch all clients
    const { data: allClients, error: clientsError } = await supabase
      .from('users')
      .select(`
        id, first_name, last_name, profile_picture, job_title, location,
        user_type, bio, completed_jobs, is_active, created_at
      `)
      .eq('user_type', 'client')
      .order('created_at', { ascending: false })

    if (clientsError) {
      console.error('[ALL CLIENTS API] Error:', clientsError)
      throw clientsError
    }

    // Apply pagination
    const paginatedClients = (allClients || []).slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    )
    const total = (allClients || []).length

    console.log('[ALL CLIENTS API] Returning', paginatedClients.length, 'clients')

    return res.status(200).json({
      users: paginatedClients,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('[ALL CLIENTS API] Error:', error)
    return res.status(500).json({ error: 'Failed to fetch clients' })
  }
}
