// Bilingual translation mappings for French <-> English
// Used to enable cross-language search

const frenchToEnglishJobs = {
    'peintre': 'painter',
    'peinture': 'painting',
    'maçon': 'mason',
    'maçonnerie': 'masonry',
    'carrelage': 'tiling',
    'carreleur': 'tiler',
    'plomberie': 'plumbing',
    'plombier': 'plumber',
    'électricité': 'electrical',
    'électricien': 'electrician',
    'charpenterie': 'carpentry',
    'charpentier': 'carpenter',
    'menuiserie': 'woodworking',
    'menuisier': 'carpenter',
    'travaux': 'work',
    'construction': 'construction',
    'rénovation': 'renovation',
    'rénover': 'renovate',
    'décoration': 'decoration',
    'décorateur': 'decorator',
    'nettoyage': 'cleaning',
    'nettoyeur': 'cleaner',
    'installation': 'installation',
    'installer': 'install',
    'réparation': 'repair',
    'réparer': 'repair',
    'maintenance': 'maintenance',
    'jardin': 'gardening',
    'jardinier': 'gardener',
    'paysagiste': 'landscaper',
    'aménagement': 'landscaping',
    'toiture': 'roofing',
    'couverture': 'roofing',
    'couvreur': 'roofer',
    'soudure': 'welding',
    'soudeur': 'welder',
    'mécanique': 'mechanics',
    'mécanicien': 'mechanic',
    'automobile': 'automotive',
    'moteur': 'engine',
    'transmission': 'transmission',
    'freins': 'brakes',
    'batterie': 'battery',
    'pneus': 'tires',
    'climatisation': 'air conditioning',
    'climatiseur': 'air conditioner',
    'chauffage': 'heating',
    'plâtrerie': 'drywall',
    'plâtrier': 'drywall',
    'serrurerie': 'locksmith',
    'serrurier': 'locksmith',
    'vitrerie': 'glazing',
    'vitrier': 'glazier',
    'tapisserie': 'upholstery',
    'tapissier': 'upholsterer',
    'paysage': 'landscape',
    'semis': 'seeding',
    'taille': 'trimming',
    'élagage': 'pruning',
    'élageur': 'tree trimmer',
    'terrassement': 'earthwork',
    'fondation': 'foundation',
    'béton': 'concrete',
    'ferraillage': 'reinforcement',
    'espalier': 'trellis',
    'escalier': 'stairs',
    'balustrade': 'railing',
    'porte': 'door',
    'fenêtre': 'window',
    'volet': 'shutter',
    'persienne': 'blind',
    'rideau': 'curtain',
}

const englishToFrench = Object.fromEntries(
    Object.entries(frenchToEnglishJobs).map(([fr, en]) => [en, fr])
)

/**
 * Get all search variants for a query term
 * Returns the original term plus any translations
 * @param {string} query - The search query
 * @returns {string[]} Array of search terms including translations
 */
export function getSearchVariants(query) {
    if (!query || query.trim().length === 0) {
        return []
    }

    const normalized = query.toLowerCase().trim()
    const variants = new Set([normalized])

    // Check if it's French and add English translation
    if (frenchToEnglishJobs[normalized]) {
        variants.add(frenchToEnglishJobs[normalized])
    }

    // Check if it's English and add French translation
    if (englishToFrench[normalized]) {
        variants.add(englishToFrench[normalized])
    }

    // Also add partial matches for compound words or phrases
    const words = normalized.split(/\s+/)
    if (words.length > 1) {
        words.forEach(word => {
            if (frenchToEnglishJobs[word]) {
                variants.add(frenchToEnglishJobs[word])
            }
            if (englishToFrench[word]) {
                variants.add(englishToFrench[word])
            }
        })
    }

    return Array.from(variants)
}

/**
 * Build a Supabase OR query for bilingual search
 * @param {string} query - The search query
 * @param {string[]} fields - Array of field names to search
 * @returns {string} Supabase OR query string
 */
export function buildBilingualQuery(query, fields = ['title', 'description', 'job_title', 'bio']) {
    const variants = getSearchVariants(query)

    if (variants.length === 0) {
        return ''
    }

    // Build OR conditions for all variants across all fields
    const conditions = []
    variants.forEach(variant => {
        fields.forEach(field => {
            conditions.push(`${field}.ilike.%${variant}%`)
        })
    })

    return conditions.join(',')
}

export default {
    frenchToEnglishJobs,
    englishToFrench,
    getSearchVariants,
    buildBilingualQuery,
}
