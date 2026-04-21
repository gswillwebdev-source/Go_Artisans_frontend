// Handworks/Trades available in Togo
export const handworks = [
    { value: 'carpentry', label: 'Carpentry / Menuiserie' },
    { value: 'plumbing', label: 'Plumbing / Plomberie' },
    { value: 'electrical', label: 'Electrical Work / Électricien' },
    { value: 'painting', label: 'Painting / Peinture' },
    { value: 'masonry', label: 'Masonry / Maçonnerie' },
    { value: 'welding', label: 'Welding / Soudure' },
    { value: 'hairdressing', label: 'Hairdressing / Coiffure' },
    { value: 'tailoring', label: 'Tailoring / Couture' },
    { value: 'mechanics', label: 'Mechanics / Mécanique' },
    { value: 'auto-repair', label: 'Auto Repair / Réparation Auto' },
    { value: 'refrigeration', label: 'Refrigeration / Climatisation' },
    { value: 'tiling', label: 'Tiling / Carrelage' },
    { value: 'landscaping', label: 'Landscaping / Aménagement Paysager' },
    { value: 'construction', label: 'Construction / Construction' },
    { value: 'roofing', label: 'Roofing / Couverture' },
    { value: 'glass-work', label: 'Glass Work / Vitrerie' },
    { value: 'aluminum-work', label: 'Aluminum Work / Menuiserie Alu' },
    { value: 'cleaning', label: 'Cleaning Services / Nettoyage' },
    { value: 'gardening', label: 'Gardening / Jardinage' },
    { value: 'tutoring', label: 'Tutoring / Tutorat' },
    { value: 'web-design', label: 'Web Design / Design Web' },
    { value: 'graphic-design', label: 'Graphic Design / Design Graphique' },
    { value: 'photography', label: 'Photography / Photographie' },
    { value: 'videography', label: 'Videography / Vidéographie' },
    { value: 'translation', label: 'Translation / Traduction' },
    { value: 'writing', label: 'Writing / Rédaction' },
    { value: 'marketing', label: 'Marketing / Marketing' },
    { value: 'consulting', label: 'Consulting / Conseil' },
    { value: 'event-planning', label: 'Event Planning / Organisation d\'événements' },
    { value: 'catering', label: 'Catering / Restauration' },
    { value: 'cooking', label: 'Cooking Services / Services Culinaires' },
    { value: 'fitness', label: 'Fitness Training / Entraînement Physique' },
    { value: 'music', label: 'Music Lessons / Cours de Musique' },
    { value: 'dance', label: 'Dance Lessons / Cours de Danse' },
    { value: 'home-repair', label: 'Home Repair / Réparations à Domicile' },
    { value: 'furniture-repair', label: 'Furniture Repair / Réparation de Meubles' },
    { value: 'upholstery', label: 'Upholstery / Garnissage' },
    { value: 'locksmith', label: 'Locksmith / Serrurier' },
    { value: 'pest-control', label: 'Pest Control / Dératisation' },
    { value: 'leather-work', label: 'Leather Work / Travail du Cuir' },
    { value: 'shoe-repair', label: 'Shoe Repair / Réparation de Chaussures' },
    { value: 'watch-repair', label: 'Watch Repair / Réparation de Montres' },
    { value: 'jewelry', label: 'Jewelry Making / Création de Bijoux' },
    { value: 'other', label: 'Other / Autre' },
];

// Locations organized by country for profile-based filtering
export const locationsByCountry = {
    togo: {
        countryName: 'Togo',
        flag: '🇹🇬',
        locations: [
    { value: 'lome', label: 'Lomé' },
    { value: 'sokode', label: 'Sokodé' },
    { value: 'kara', label: 'Kara' },
    { value: 'atakpame', label: 'Atakpamé' },
    { value: 'tsevia', label: 'Tsévié' },
    { value: 'anecho', label: 'Aného' },
    { value: 'kpalime', label: 'Kpalimé' },
    { value: 'badou', label: 'Badou' },
    { value: 'ganta-ho', label: 'Ganta-Ho' },
    { value: 'dapango', label: 'Dapango' },
    { value: 'vogan', label: 'Vogar' },
    { value: 'tabligbo', label: 'Tabligbo' },
    { value: 'akodeassos', label: 'Akodéassé' },
    { value: 'matcha', label: 'Matcha' },
    { value: 'niamtougou', label: 'Niamtougou' },
    { value: 'sansanne-mango', label: 'Sansanné-Mango' },
    { value: 'dapaong', label: 'Dapaong' },
    { value: 'kande', label: 'Kandé' },
    { value: 'bafilo', label: 'Bafilo' },
    { value: 'tchamba', label: 'Tchamba' },
    { value: 'sotouboua', label: 'Sotouboua' },
    { value: 'bassar', label: 'Bassar' },
    { value: 'glei', label: 'Gléi' },
    { value: 'dogbo', label: 'Dogbo' },
    { value: 'amlamadamedji', label: 'Amlamé' },
    { value: 'lavie', label: 'Lavié' },
    { value: 'tohoun', label: 'Tohoun' },
    { value: 'agou', label: 'Agou' },
    { value: 'afagnan', label: 'Afagnon' },
    { value: 'ave', label: 'Avé' },
    { value: 'dzita', label: 'Dzita' },
    { value: 'fiave', label: 'Fiavé' },
    { value: 'adeta', label: 'Adéta' },
    { value: 'notse', label: 'Notsé' },
    { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    ghana: {
        countryName: 'Ghana',
        flag: '🇬🇭',
        locations: [
            { value: 'accra', label: 'Accra' },
            { value: 'kumasi', label: 'Kumasi' },
            { value: 'tamale', label: 'Tamale' },
            { value: 'takoradi', label: 'Takoradi' },
            { value: 'cape-coast', label: 'Cape Coast' },
            { value: 'sunyani', label: 'Sunyani' },
            { value: 'techiman', label: 'Techiman' },
            { value: 'ho', label: 'Ho' },
            { value: 'koforidua', label: 'Koforidua' },
            { value: 'bolgatanga', label: 'Bolgatanga' },
            { value: 'wa', label: 'Wa' },
            { value: 'tema', label: 'Tema' },
            { value: 'obuasi', label: 'Obuasi' },
            { value: 'sekondi', label: 'Sekondi' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    benin: {
        countryName: 'Bénin',
        flag: '🇧🇯',
        locations: [
            { value: 'cotonou', label: 'Cotonou' },
            { value: 'porto-novo', label: 'Porto-Novo' },
            { value: 'parakou', label: 'Parakou' },
            { value: 'abomey-calavi', label: 'Abomey-Calavi' },
            { value: 'djougou', label: 'Djougou' },
            { value: 'bohicon', label: 'Bohicon' },
            { value: 'kandi', label: 'Kandi' },
            { value: 'lokossa', label: 'Lokossa' },
            { value: 'natitingou', label: 'Natitingou' },
            { value: 'ouidah', label: 'Ouidah' },
            { value: 'abomey', label: 'Abomey' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    burkina_faso: {
        countryName: 'Burkina Faso',
        flag: '🇧🇫',
        locations: [
            { value: 'ouagadougou', label: 'Ouagadougou' },
            { value: 'bobo-dioulasso', label: 'Bobo-Dioulasso' },
            { value: 'koudougou', label: 'Koudougou' },
            { value: 'ouahigouya', label: 'Ouahigouya' },
            { value: 'banfora', label: 'Banfora' },
            { value: 'dedougou', label: 'Dédougou' },
            { value: 'kaya', label: 'Kaya' },
            { value: 'tenkodogo', label: 'Tenkodogo' },
            { value: 'fada-ngourma', label: 'Fada N\'Gourma' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    nigeria: {
        countryName: 'Nigeria',
        flag: '🇳🇬',
        locations: [
            { value: 'lagos', label: 'Lagos' },
            { value: 'abuja', label: 'Abuja' },
            { value: 'kano', label: 'Kano' },
            { value: 'ibadan', label: 'Ibadan' },
            { value: 'port-harcourt', label: 'Port Harcourt' },
            { value: 'benin-city', label: 'Benin City' },
            { value: 'kaduna', label: 'Kaduna' },
            { value: 'enugu', label: 'Enugu' },
            { value: 'aba', label: 'Aba' },
            { value: 'maiduguri', label: 'Maiduguri' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    ivory_coast: {
        countryName: "Côte d'Ivoire",
        flag: '🇨🇮',
        locations: [
            { value: 'abidjan', label: 'Abidjan' },
            { value: 'bouake', label: 'Bouaké' },
            { value: 'daloa', label: 'Daloa' },
            { value: 'korhogo', label: 'Korhogo' },
            { value: 'yamoussoukro', label: 'Yamoussoukro' },
            { value: 'san-pedro', label: 'San-Pédro' },
            { value: 'man', label: 'Man' },
            { value: 'gagnoa', label: 'Gagnoa' },
            { value: 'abengourou', label: 'Abengourou' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    senegal: {
        countryName: 'Sénégal',
        flag: '🇸🇳',
        locations: [
            { value: 'dakar', label: 'Dakar' },
            { value: 'thies', label: 'Thiès' },
            { value: 'saint-louis', label: 'Saint-Louis' },
            { value: 'touba', label: 'Touba' },
            { value: 'kaolack', label: 'Kaolack' },
            { value: 'ziguinchor', label: 'Ziguinchor' },
            { value: 'mbour', label: 'Mbour' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
}

// Keep togoLocations as alias for backward compatibility
export const togoLocations = locationsByCountry.togo.locations

/**
 * Detects which country's locations to show based on a free-text profile location string.
 * Matches against country names and city names (case-insensitive, accent-insensitive).
 * Falls back to Togo locations if no match.
 */
function norm(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function getLocationsForProfile(profileLocation) {
    if (!profileLocation) return locationsByCountry.togo.locations
    const n = norm(profileLocation)
    for (const [, data] of Object.entries(locationsByCountry)) {
        // Match country name
        if (n.includes(norm(data.countryName))) return data.locations
        // Match any city value or label
        for (const loc of data.locations) {
            if (norm(loc.label) && n.includes(norm(loc.label))) return data.locations
            if (norm(loc.value) && n.includes(norm(loc.value))) return data.locations
        }
    }
    return locationsByCountry.togo.locations
}

