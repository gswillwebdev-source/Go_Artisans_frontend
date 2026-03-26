import { createClient } from '@supabase/supabase-js'

const frenchToEnglish = {
  peintre: 'painter', peinture: 'painting', maçon: 'mason', maçonnerie: 'masonry',
  carrelage: 'tiling', carreleur: 'tiler', plomberie: 'plumbing', plombier: 'plumber',
  'électricité': 'electrical', 'électricien': 'electrician', charpenterie: 'carpentry',
  charpentier: 'carpenter', menuiserie: 'woodworking', menuisier: 'carpenter',
  travaux: 'work', construction: 'construction', 'rénovation': 'renovation',
  'décoration': 'decoration', nettoyage: 'cleaning', installation: 'installation',
  'réparation': 'repair', maintenance: 'maintenance', jardin: 'gardening',
  jardinier: 'gardener', paysagiste: 'landscaper', toiture: 'roofing',
  couvreur: 'roofer', soudure: 'welding', soudeur: 'welder', 'mécanique': 'mechanics',
  'mécanicien': 'mechanic', climatisation: 'air conditioning', chauffage: 'heating',
  'plâtrier': 'drywall', serrurerie: 'locksmith', serrurier: 'locksmith',
}
const englishToFrench = Object.fromEntries(Object.entries(frenchToEnglish).map(([fr, en]) => [en, fr]))

function getSearchVariants(query) {
  if (!query || query.trim().length === 0) return []
  const normalized = query.toLowerCase().trim()
  const variants = new Set([normalized])
  if (frenchToEnglish[normalized]) variants.add(frenchToEnglish[normalized])
  if (englishToFrench[normalized]) variants.add(englishToFrench[normalized])
  const words = normalized.split(/\s+/)
  if (words.length > 1) {
    words.forEach(word => {
      if (frenchToEnglish[word]) variants.add(frenchToEnglish[word])
      if (englishToFrench[word]) variants.add(englishToFrench[word])
    })
  }
  return Array.from(variants)
}

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

    const { limit = 30, offset = 0, q = '', type = 'all' } = req.query
    const normalizedSearch = String(q).trim().toLowerCase()
    const normalizedType = String(type).toLowerCase()
    const searchVariants = getSearchVariants(normalizedSearch)

    console.log('[ALL USERS API] Fetching users - limit:', limit, 'offset:', offset, 'q:', q, 'type:', type, 'variants:', searchVariants)

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

    // Per-field substring match — checks each field individually so names always match correctly
    function matchesVariants(value, variants) {
      if (!value) return false
      const lv = String(value).toLowerCase()
      return variants.some(v => lv.includes(v))
    }

    function userMatchesSearch(user) {
      if (!normalizedSearch) return true
      return (
        matchesVariants(user.first_name, searchVariants) ||
        matchesVariants(user.last_name, searchVariants) ||
        matchesVariants(user.job_title, searchVariants) ||
        matchesVariants(user.bio, searchVariants) ||
        matchesVariants(user.location, searchVariants) ||
        (Array.isArray(user.services) && user.services.some(s => matchesVariants(s, searchVariants)))
      )
    }

    // Filter: Show all clients + only active workers
    const filteredUsers = (allUsers || []).filter(user => {
      if (normalizedType === 'workers' && user.user_type !== 'worker') return false
      if (normalizedType === 'clients' && user.user_type !== 'client') return false
      if (user.user_type === 'client') return userMatchesSearch(user)
      if (user.user_type === 'worker' && user.is_active === true) return userMatchesSearch(user)
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
