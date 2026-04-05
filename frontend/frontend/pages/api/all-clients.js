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

function sanitizeListUser(user) {
  const profilePicture = user?.profile_picture
  const isLargeInlineImage =
    typeof profilePicture === 'string' &&
    profilePicture.startsWith('data:image/') &&
    profilePicture.length > 5000
  return { ...user, profile_picture: isLargeInlineImage ? null : profilePicture || null }
}

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

    const { limit = 30, offset = 0, q = '' } = req.query
    const normalizedSearch = String(q).trim().toLowerCase()
    const searchVariants = getSearchVariants(normalizedSearch)

    console.log('[ALL CLIENTS API] Fetching clients - limit:', limit, 'offset:', offset, 'q:', q, 'variants:', searchVariants)

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

    function matchesVariants(value, variants) {
      if (!value) return false
      const lv = String(value).toLowerCase()
      return variants.some(v => lv.includes(v))
    }

    const filteredClients = (allClients || []).filter(client => {
      if (!normalizedSearch) return true
      return (
        matchesVariants(client.first_name, searchVariants) ||
        matchesVariants(client.last_name, searchVariants) ||
        matchesVariants(client.job_title, searchVariants) ||
        matchesVariants(client.bio, searchVariants) ||
        matchesVariants(client.location, searchVariants)
      )
    })

    // Apply pagination
    const paginatedClients = filteredClients.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    )
    const total = filteredClients.length

    console.log('[ALL CLIENTS API] Returning', paginatedClients.length, 'clients')

    return res.status(200).json({
      users: paginatedClients.map(sanitizeListUser),
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('[ALL CLIENTS API] Error:', error)
    return res.status(500).json({ error: 'Failed to fetch clients' })
  }
}
