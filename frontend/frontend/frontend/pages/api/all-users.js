import { createClient } from '@supabase/supabase-js'

function errorDetails(error) {
  if (!error) return null
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    name: error.name
  }
}

function escapeIlike(value) {
  return String(value).replace(/[%_,]/g, '').trim()
}

function applyTypeFilter(query, normalizedType) {
  if (normalizedType === 'workers') {
    return query.eq('user_type', 'worker').eq('is_active', true)
  }

  if (normalizedType === 'clients') {
    return query.eq('user_type', 'client')
  }

  // all = clients + active workers
  return query.or('user_type.eq.client,and(user_type.eq.worker,is_active.eq.true)')
}

function applySearchFilter(query, variants) {
  if (!Array.isArray(variants) || variants.length === 0) return query

  const conditions = []
  for (const rawVariant of variants) {
    const variant = escapeIlike(rawVariant)
    if (!variant) continue
    conditions.push(`first_name.ilike.%${variant}%`)
    conditions.push(`last_name.ilike.%${variant}%`)
    conditions.push(`job_title.ilike.%${variant}%`)
    conditions.push(`bio.ilike.%${variant}%`)
    conditions.push(`location.ilike.%${variant}%`)
  }

  if (conditions.length === 0) return query
  return query.or(conditions.join(','))
}

function getPlanRank(user) {
  const subs = Array.isArray(user.user_subscriptions) ? user.user_subscriptions : []
  const activeSub = subs.find(s => s.status === 'active' || s.status === 'trialing')
  if (!activeSub) return 0
  const tier = activeSub.plan_id?.split('_')[1] || 'free'
  if (tier === 'premium') return 2
  if (tier === 'pro') return 1
  return 0
}

function sanitizeListUser(user) {
  const profilePicture = user?.profile_picture
  const isLargeInlineImage =
    typeof profilePicture === 'string' &&
    profilePicture.startsWith('data:image/') &&
    profilePicture.length > 5000
  // Compute plan_tier from joined subscriptions and strip the raw array
  const subs = Array.isArray(user.user_subscriptions) ? user.user_subscriptions : []
  const activeSub = subs.find(s => s.status === 'active' || s.status === 'trialing')
  const planTier = activeSub ? (activeSub.plan_id?.split('_')[1] || 'free') : 'free'
  const { user_subscriptions: _subs, ...rest } = user
  return { ...rest, profile_picture: isLargeInlineImage ? null : profilePicture || null, plan_tier: planTier }
}

async function fetchUsersWithFallback(supabase, { normalizedType, searchVariants, limitNum, offsetNum }) {
  const selectClause = `
    id, first_name, last_name, profile_picture, job_title, location,
    user_type, rating, bio, services, completed_jobs, is_active, created_at, phone_number,
    referral_count,
    user_subscriptions(plan_id, status),
    verification_badges!user_id(status, badge_type)
  `

  // Use 'planned' count (Postgres statistics) — much faster than 'exact' (full scan)
  let resultQuery = supabase
    .from('users')
    .select(selectClause, { count: 'planned' })
    .order('created_at', { ascending: false })
    .range(offsetNum, offsetNum + limitNum - 1)

  resultQuery = applyTypeFilter(resultQuery, normalizedType)
  resultQuery = applySearchFilter(resultQuery, searchVariants)

  const result = await resultQuery

  if (result.error) {
    console.warn('[ALL USERS API] Select fallback failed:', errorDetails(result.error))
  }

  // Sort pro/premium users above free users before returning
  if (result.data && result.data.length > 0) {
    result.data = result.data.slice().sort((a, b) => getPlanRank(b) - getPlanRank(a))
  }

  return result
}

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
      process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { limit = 30, offset = 0, q = '', type = 'all' } = req.query
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 30))
    const offsetNum = Math.max(0, parseInt(offset, 10) || 0)
    const normalizedSearch = String(q).trim().toLowerCase()
    const normalizedType = String(type).toLowerCase()
    const searchVariants = getSearchVariants(normalizedSearch)

    console.log('[ALL USERS API] Fetching users - limit:', limitNum, 'offset:', offsetNum, 'q:', q, 'type:', type, 'variants:', searchVariants)

    const { data: users, count, error: usersError } = await fetchUsersWithFallback(supabase, {
      normalizedType,
      searchVariants,
      limitNum,
      offsetNum
    })

    if (usersError) {
      console.error('[ALL USERS API] Error:', usersError)
      throw usersError
    }

    const total = typeof count === 'number' ? count : (users || []).length

    console.log('[ALL USERS API] Returning', users?.length || 0, 'users')

    return res.status(200).json({
      users: (users || []).map(sanitizeListUser),
      total: total,
      limit: limitNum,
      offset: offsetNum
    })

  } catch (error) {
    console.error('[ALL USERS API] Error:', errorDetails(error))
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
}
