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
    // ── WEST AFRICA ──────────────────────────────────────────────
    togo: {
        countryName: 'Togo', flag: '🇹🇬',
        locations: [
            { value: 'lome', label: 'Lomé' },
            { value: 'sokode', label: 'Sokodé' },
            { value: 'kara', label: 'Kara' },
            { value: 'atakpame', label: 'Atakpamé' },
            { value: 'tsevia', label: 'Tsévié' },
            { value: 'anecho', label: 'Aného' },
            { value: 'kpalime', label: 'Kpalimé' },
            { value: 'dapaong', label: 'Dapaong' },
            { value: 'notse', label: 'Notsé' },
            { value: 'kande', label: 'Kandé' },
            { value: 'bafilo', label: 'Bafilo' },
            { value: 'tchamba', label: 'Tchamba' },
            { value: 'sotouboua', label: 'Sotouboua' },
            { value: 'bassar', label: 'Bassar' },
            { value: 'agou', label: 'Agou' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    ghana: {
        countryName: 'Ghana', flag: '🇬🇭',
        locations: [
            { value: 'accra', label: 'Accra' },
            { value: 'kumasi', label: 'Kumasi' },
            { value: 'tamale', label: 'Tamale' },
            { value: 'takoradi', label: 'Takoradi' },
            { value: 'cape-coast', label: 'Cape Coast' },
            { value: 'ho', label: 'Ho' },
            { value: 'koforidua', label: 'Koforidua' },
            { value: 'tema', label: 'Tema' },
            { value: 'sunyani', label: 'Sunyani' },
            { value: 'bolgatanga', label: 'Bolgatanga' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    benin: {
        countryName: 'Bénin', flag: '🇧🇯',
        aliases: ['benin'],
        locations: [
            { value: 'cotonou', label: 'Cotonou' },
            { value: 'porto-novo', label: 'Porto-Novo' },
            { value: 'parakou', label: 'Parakou' },
            { value: 'abomey-calavi', label: 'Abomey-Calavi' },
            { value: 'djougou', label: 'Djougou' },
            { value: 'natitingou', label: 'Natitingou' },
            { value: 'ouidah', label: 'Ouidah' },
            { value: 'bohicon', label: 'Bohicon' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    burkina_faso: {
        countryName: 'Burkina Faso', flag: '🇧🇫',
        locations: [
            { value: 'ouagadougou', label: 'Ouagadougou' },
            { value: 'bobo-dioulasso', label: 'Bobo-Dioulasso' },
            { value: 'koudougou', label: 'Koudougou' },
            { value: 'ouahigouya', label: 'Ouahigouya' },
            { value: 'banfora', label: 'Banfora' },
            { value: 'kaya', label: 'Kaya' },
            { value: 'tenkodogo', label: 'Tenkodogo' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    nigeria: {
        countryName: 'Nigeria', flag: '🇳🇬',
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
            { value: 'remote', label: 'Remote' },
        ],
    },
    ivory_coast: {
        countryName: "Côte d'Ivoire", flag: '🇨🇮',
        aliases: ['ivory coast', 'cote d ivoire', 'cote divoire', 'cote-d-ivoire'],
        locations: [
            { value: 'abidjan', label: 'Abidjan' },
            { value: 'bouake', label: 'Bouaké' },
            { value: 'daloa', label: 'Daloa' },
            { value: 'korhogo', label: 'Korhogo' },
            { value: 'yamoussoukro', label: 'Yamoussoukro' },
            { value: 'san-pedro', label: 'San-Pédro' },
            { value: 'gagnoa', label: 'Gagnoa' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    senegal: {
        countryName: 'Sénégal', flag: '🇸🇳',
        aliases: ['senegal'],
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
    mali: {
        countryName: 'Mali', flag: '🇲🇱',
        locations: [
            { value: 'bamako', label: 'Bamako' },
            { value: 'sikasso', label: 'Sikasso' },
            { value: 'mopti', label: 'Mopti' },
            { value: 'segou', label: 'Ségou' },
            { value: 'gao', label: 'Gao' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    niger: {
        countryName: 'Niger', flag: '🇳🇪',
        locations: [
            { value: 'niamey', label: 'Niamey' },
            { value: 'zinder', label: 'Zinder' },
            { value: 'maradi', label: 'Maradi' },
            { value: 'tahoua', label: 'Tahoua' },
            { value: 'agadez', label: 'Agadez' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    guinea: {
        countryName: 'Guinée', flag: '🇬🇳',
        aliases: ['guinea', 'guinee'],
        locations: [
            { value: 'conakry', label: 'Conakry' },
            { value: 'nzerekore', label: 'Nzérékoré' },
            { value: 'kindia', label: 'Kindia' },
            { value: 'kankan', label: 'Kankan' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    sierra_leone: {
        countryName: 'Sierra Leone', flag: '🇸🇱',
        locations: [
            { value: 'freetown', label: 'Freetown' },
            { value: 'bo', label: 'Bo' },
            { value: 'kenema', label: 'Kenema' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    liberia: {
        countryName: 'Liberia', flag: '🇱🇷',
        locations: [
            { value: 'monrovia', label: 'Monrovia' },
            { value: 'gbarnga', label: 'Gbarnga' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    cameroon: {
        countryName: 'Cameroun', flag: '🇨🇲',
        aliases: ['cameroon', 'cameroun'],
        locations: [
            { value: 'douala', label: 'Douala' },
            { value: 'yaounde', label: 'Yaoundé' },
            { value: 'garoua', label: 'Garoua' },
            { value: 'bafoussam', label: 'Bafoussam' },
            { value: 'bamenda', label: 'Bamenda' },
            { value: 'maroua', label: 'Maroua' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    // ── CENTRAL AFRICA ───────────────────────────────────────────
    drc: {
        countryName: 'Congo (RDC)', flag: '🇨🇩',
        aliases: ['drc', 'democratic republic of congo', 'dr congo', 'congo kinshasa', 'rdc', 'rd congo'],
        locations: [
            { value: 'kinshasa', label: 'Kinshasa' },
            { value: 'lubumbashi', label: 'Lubumbashi' },
            { value: 'mbuji-mayi', label: 'Mbuji-Mayi' },
            { value: 'kisangani', label: 'Kisangani' },
            { value: 'goma', label: 'Goma' },
            { value: 'bukavu', label: 'Bukavu' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    congo: {
        countryName: 'Congo', flag: '🇨🇬',
        aliases: ['republic of congo', 'congo brazzaville'],
        locations: [
            { value: 'brazzaville', label: 'Brazzaville' },
            { value: 'pointe-noire', label: 'Pointe-Noire' },
            { value: 'dolisie', label: 'Dolisie' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    gabon: {
        countryName: 'Gabon', flag: '🇬🇦',
        locations: [
            { value: 'libreville', label: 'Libreville' },
            { value: 'port-gentil', label: 'Port-Gentil' },
            { value: 'franceville', label: 'Franceville' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    chad: {
        countryName: 'Tchad', flag: '🇹🇩',
        aliases: ['chad'],
        locations: [
            { value: "n'djamena", label: "N'Djamena" },
            { value: 'moundou', label: 'Moundou' },
            { value: 'sarh', label: 'Sarh' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    // ── EAST AFRICA ──────────────────────────────────────────────
    ethiopia: {
        countryName: 'Ethiopia', flag: '🇪🇹',
        aliases: ['ethiopie'],
        locations: [
            { value: 'addis-ababa', label: 'Addis Ababa' },
            { value: 'dire-dawa', label: 'Dire Dawa' },
            { value: 'mekele', label: 'Mekele' },
            { value: 'gondar', label: 'Gondar' },
            { value: 'hawassa', label: 'Hawassa' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    kenya: {
        countryName: 'Kenya', flag: '🇰🇪',
        locations: [
            { value: 'nairobi', label: 'Nairobi' },
            { value: 'mombasa', label: 'Mombasa' },
            { value: 'kisumu', label: 'Kisumu' },
            { value: 'nakuru', label: 'Nakuru' },
            { value: 'eldoret', label: 'Eldoret' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    tanzania: {
        countryName: 'Tanzania', flag: '🇹🇿',
        locations: [
            { value: 'dar-es-salaam', label: 'Dar es Salaam' },
            { value: 'dodoma', label: 'Dodoma' },
            { value: 'mwanza', label: 'Mwanza' },
            { value: 'arusha', label: 'Arusha' },
            { value: 'zanzibar', label: 'Zanzibar' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    uganda: {
        countryName: 'Uganda', flag: '🇺🇬',
        locations: [
            { value: 'kampala', label: 'Kampala' },
            { value: 'gulu', label: 'Gulu' },
            { value: 'jinja', label: 'Jinja' },
            { value: 'mbarara', label: 'Mbarara' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    rwanda: {
        countryName: 'Rwanda', flag: '🇷🇼',
        locations: [
            { value: 'kigali', label: 'Kigali' },
            { value: 'butare', label: 'Butare' },
            { value: 'gisenyi', label: 'Gisenyi' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── NORTH AFRICA ─────────────────────────────────────────────
    egypt: {
        countryName: 'Egypt', flag: '🇪🇬',
        aliases: ['egypte', 'misr'],
        locations: [
            { value: 'cairo', label: 'Cairo' },
            { value: 'alexandria', label: 'Alexandria' },
            { value: 'giza', label: 'Giza' },
            { value: 'luxor', label: 'Luxor' },
            { value: 'aswan', label: 'Aswan' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    morocco: {
        countryName: 'Maroc', flag: '🇲🇦',
        aliases: ['morocco', 'maroc'],
        locations: [
            { value: 'casablanca', label: 'Casablanca' },
            { value: 'rabat', label: 'Rabat' },
            { value: 'fes', label: 'Fès' },
            { value: 'marrakesh', label: 'Marrakech' },
            { value: 'tangier', label: 'Tanger' },
            { value: 'agadir', label: 'Agadir' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    algeria: {
        countryName: 'Algérie', flag: '🇩🇿',
        aliases: ['algeria', 'algerie'],
        locations: [
            { value: 'algiers', label: 'Alger' },
            { value: 'oran', label: 'Oran' },
            { value: 'constantine', label: 'Constantine' },
            { value: 'annaba', label: 'Annaba' },
            { value: 'batna', label: 'Batna' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    tunisia: {
        countryName: 'Tunisie', flag: '🇹🇳',
        aliases: ['tunisia', 'tunisie'],
        locations: [
            { value: 'tunis', label: 'Tunis' },
            { value: 'sfax', label: 'Sfax' },
            { value: 'sousse', label: 'Sousse' },
            { value: 'kairouan', label: 'Kairouan' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    libya: {
        countryName: 'Libya', flag: '🇱🇾',
        aliases: ['libye'],
        locations: [
            { value: 'tripoli', label: 'Tripoli' },
            { value: 'benghazi', label: 'Benghazi' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── SOUTHERN AFRICA ──────────────────────────────────────────
    south_africa: {
        countryName: 'South Africa', flag: '🇿🇦',
        aliases: ['afrique du sud'],
        locations: [
            { value: 'johannesburg', label: 'Johannesburg' },
            { value: 'cape-town', label: 'Cape Town' },
            { value: 'durban', label: 'Durban' },
            { value: 'pretoria', label: 'Pretoria' },
            { value: 'port-elizabeth', label: 'Port Elizabeth' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    angola: {
        countryName: 'Angola', flag: '🇦🇴',
        locations: [
            { value: 'luanda', label: 'Luanda' },
            { value: 'huambo', label: 'Huambo' },
            { value: 'lubango', label: 'Lubango' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    mozambique: {
        countryName: 'Mozambique', flag: '🇲🇿',
        locations: [
            { value: 'maputo', label: 'Maputo' },
            { value: 'beira', label: 'Beira' },
            { value: 'nampula', label: 'Nampula' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    zambia: {
        countryName: 'Zambia', flag: '🇿🇲',
        aliases: ['zambie'],
        locations: [
            { value: 'lusaka', label: 'Lusaka' },
            { value: 'ndola', label: 'Ndola' },
            { value: 'kitwe', label: 'Kitwe' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    zimbabwe: {
        countryName: 'Zimbabwe', flag: '🇿🇼',
        locations: [
            { value: 'harare', label: 'Harare' },
            { value: 'bulawayo', label: 'Bulawayo' },
            { value: 'mutare', label: 'Mutare' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    madagascar: {
        countryName: 'Madagascar', flag: '🇲🇬',
        locations: [
            { value: 'antananarivo', label: 'Antananarivo' },
            { value: 'toamasina', label: 'Toamasina' },
            { value: 'antsirabe', label: 'Antsirabe' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    // ── EUROPE ───────────────────────────────────────────────────
    france: {
        countryName: 'France', flag: '🇫🇷',
        locations: [
            { value: 'paris', label: 'Paris' },
            { value: 'marseille', label: 'Marseille' },
            { value: 'lyon', label: 'Lyon' },
            { value: 'toulouse', label: 'Toulouse' },
            { value: 'nice', label: 'Nice' },
            { value: 'nantes', label: 'Nantes' },
            { value: 'strasbourg', label: 'Strasbourg' },
            { value: 'bordeaux', label: 'Bordeaux' },
            { value: 'montpellier', label: 'Montpellier' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    uk: {
        countryName: 'United Kingdom', flag: '🇬🇧',
        aliases: ['uk', 'great britain', 'england', 'britain', 'scotland', 'wales', 'northern ireland'],
        locations: [
            { value: 'london', label: 'London' },
            { value: 'birmingham', label: 'Birmingham' },
            { value: 'manchester', label: 'Manchester' },
            { value: 'glasgow', label: 'Glasgow' },
            { value: 'liverpool', label: 'Liverpool' },
            { value: 'leeds', label: 'Leeds' },
            { value: 'edinburgh', label: 'Edinburgh' },
            { value: 'bristol', label: 'Bristol' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    germany: {
        countryName: 'Germany', flag: '🇩🇪',
        aliases: ['deutschland', 'allemagne'],
        locations: [
            { value: 'berlin', label: 'Berlin' },
            { value: 'hamburg', label: 'Hamburg' },
            { value: 'munich', label: 'Munich' },
            { value: 'cologne', label: 'Cologne' },
            { value: 'frankfurt', label: 'Frankfurt' },
            { value: 'stuttgart', label: 'Stuttgart' },
            { value: 'dusseldorf', label: 'Düsseldorf' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    spain: {
        countryName: 'Spain', flag: '🇪🇸',
        aliases: ['espagne', 'espana'],
        locations: [
            { value: 'madrid', label: 'Madrid' },
            { value: 'barcelona', label: 'Barcelona' },
            { value: 'seville', label: 'Seville' },
            { value: 'valencia', label: 'Valencia' },
            { value: 'bilbao', label: 'Bilbao' },
            { value: 'malaga', label: 'Málaga' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    italy: {
        countryName: 'Italy', flag: '🇮🇹',
        aliases: ['italie', 'italia'],
        locations: [
            { value: 'rome', label: 'Rome' },
            { value: 'milan', label: 'Milan' },
            { value: 'naples', label: 'Naples' },
            { value: 'turin', label: 'Turin' },
            { value: 'palermo', label: 'Palermo' },
            { value: 'florence', label: 'Florence' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    portugal: {
        countryName: 'Portugal', flag: '🇵🇹',
        locations: [
            { value: 'lisbon', label: 'Lisbon' },
            { value: 'porto', label: 'Porto' },
            { value: 'braga', label: 'Braga' },
            { value: 'coimbra', label: 'Coimbra' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    belgium: {
        countryName: 'Belgium', flag: '🇧🇪',
        aliases: ['belgique', 'belgie'],
        locations: [
            { value: 'brussels', label: 'Brussels' },
            { value: 'antwerp', label: 'Antwerp' },
            { value: 'ghent', label: 'Ghent' },
            { value: 'liege', label: 'Liège' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    netherlands: {
        countryName: 'Netherlands', flag: '🇳🇱',
        aliases: ['pays-bas', 'pays bas', 'holland'],
        locations: [
            { value: 'amsterdam', label: 'Amsterdam' },
            { value: 'rotterdam', label: 'Rotterdam' },
            { value: 'the-hague', label: 'The Hague' },
            { value: 'utrecht', label: 'Utrecht' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    switzerland: {
        countryName: 'Switzerland', flag: '🇨🇭',
        aliases: ['suisse', 'schweiz'],
        locations: [
            { value: 'zurich', label: 'Zürich' },
            { value: 'geneva', label: 'Geneva' },
            { value: 'bern', label: 'Bern' },
            { value: 'basel', label: 'Basel' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    sweden: {
        countryName: 'Sweden', flag: '🇸🇪',
        aliases: ['suede', 'sverige'],
        locations: [
            { value: 'stockholm', label: 'Stockholm' },
            { value: 'gothenburg', label: 'Gothenburg' },
            { value: 'malmo', label: 'Malmö' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    norway: {
        countryName: 'Norway', flag: '🇳🇴',
        aliases: ['norvege', 'norge'],
        locations: [
            { value: 'oslo', label: 'Oslo' },
            { value: 'bergen', label: 'Bergen' },
            { value: 'trondheim', label: 'Trondheim' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    denmark: {
        countryName: 'Denmark', flag: '🇩🇰',
        aliases: ['danemark', 'danmark'],
        locations: [
            { value: 'copenhagen', label: 'Copenhagen' },
            { value: 'aarhus', label: 'Aarhus' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    poland: {
        countryName: 'Poland', flag: '🇵🇱',
        aliases: ['pologne', 'polska'],
        locations: [
            { value: 'warsaw', label: 'Warsaw' },
            { value: 'krakow', label: 'Kraków' },
            { value: 'wroclaw', label: 'Wrocław' },
            { value: 'gdansk', label: 'Gdańsk' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    russia: {
        countryName: 'Russia', flag: '🇷🇺',
        aliases: ['russie', 'russland'],
        locations: [
            { value: 'moscow', label: 'Moscow' },
            { value: 'saint-petersburg', label: 'Saint Petersburg' },
            { value: 'novosibirsk', label: 'Novosibirsk' },
            { value: 'yekaterinburg', label: 'Yekaterinburg' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    ukraine: {
        countryName: 'Ukraine', flag: '🇺🇦',
        locations: [
            { value: 'kyiv', label: 'Kyiv' },
            { value: 'kharkiv', label: 'Kharkiv' },
            { value: 'odessa', label: 'Odessa' },
            { value: 'lviv', label: 'Lviv' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    greece: {
        countryName: 'Greece', flag: '🇬🇷',
        aliases: ['grece', 'grèce'],
        locations: [
            { value: 'athens', label: 'Athens' },
            { value: 'thessaloniki', label: 'Thessaloniki' },
            { value: 'patras', label: 'Patras' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    romania: {
        countryName: 'Romania', flag: '🇷🇴',
        aliases: ['roumanie'],
        locations: [
            { value: 'bucharest', label: 'Bucharest' },
            { value: 'cluj-napoca', label: 'Cluj-Napoca' },
            { value: 'timisoara', label: 'Timișoara' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── NORTH AMERICA ────────────────────────────────────────────
    usa: {
        countryName: 'United States', flag: '🇺🇸',
        aliases: ['usa', 'us', 'united states of america', 'america', 'etats-unis', 'états-unis'],
        locations: [
            { value: 'new-york', label: 'New York' },
            { value: 'los-angeles', label: 'Los Angeles' },
            { value: 'chicago', label: 'Chicago' },
            { value: 'houston', label: 'Houston' },
            { value: 'phoenix', label: 'Phoenix' },
            { value: 'philadelphia', label: 'Philadelphia' },
            { value: 'san-antonio', label: 'San Antonio' },
            { value: 'san-diego', label: 'San Diego' },
            { value: 'dallas', label: 'Dallas' },
            { value: 'san-francisco', label: 'San Francisco' },
            { value: 'miami', label: 'Miami' },
            { value: 'atlanta', label: 'Atlanta' },
            { value: 'boston', label: 'Boston' },
            { value: 'seattle', label: 'Seattle' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    canada: {
        countryName: 'Canada', flag: '🇨🇦',
        locations: [
            { value: 'toronto', label: 'Toronto' },
            { value: 'montreal', label: 'Montréal' },
            { value: 'vancouver', label: 'Vancouver' },
            { value: 'calgary', label: 'Calgary' },
            { value: 'ottawa', label: 'Ottawa' },
            { value: 'edmonton', label: 'Edmonton' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    mexico: {
        countryName: 'Mexico', flag: '🇲🇽',
        aliases: ['mexique', 'mexico'],
        locations: [
            { value: 'mexico-city', label: 'Mexico City' },
            { value: 'guadalajara', label: 'Guadalajara' },
            { value: 'monterrey', label: 'Monterrey' },
            { value: 'cancun', label: 'Cancún' },
            { value: 'tijuana', label: 'Tijuana' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── CARIBBEAN ────────────────────────────────────────────────
    haiti: {
        countryName: 'Haiti', flag: '🇭🇹',
        aliases: ['haïti'],
        locations: [
            { value: 'port-au-prince', label: 'Port-au-Prince' },
            { value: 'cap-haitien', label: 'Cap-Haïtien' },
            { value: 'gonaives', label: 'Gonaïves' },
            { value: 'remote', label: 'Remote / À Domicile' },
        ],
    },
    dominican_republic: {
        countryName: 'Dominican Republic', flag: '🇩🇴',
        aliases: ['republique dominicaine', 'rep dominicana'],
        locations: [
            { value: 'santo-domingo', label: 'Santo Domingo' },
            { value: 'santiago', label: 'Santiago' },
            { value: 'punta-cana', label: 'Punta Cana' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── SOUTH AMERICA ────────────────────────────────────────────
    brazil: {
        countryName: 'Brazil', flag: '🇧🇷',
        aliases: ['bresil', 'brasil'],
        locations: [
            { value: 'sao-paulo', label: 'São Paulo' },
            { value: 'rio-de-janeiro', label: 'Rio de Janeiro' },
            { value: 'brasilia', label: 'Brasília' },
            { value: 'salvador', label: 'Salvador' },
            { value: 'fortaleza', label: 'Fortaleza' },
            { value: 'manaus', label: 'Manaus' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    colombia: {
        countryName: 'Colombia', flag: '🇨🇴',
        aliases: ['colombie'],
        locations: [
            { value: 'bogota', label: 'Bogotá' },
            { value: 'medellin', label: 'Medellín' },
            { value: 'cali', label: 'Cali' },
            { value: 'barranquilla', label: 'Barranquilla' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    argentina: {
        countryName: 'Argentina', flag: '🇦🇷',
        aliases: ['argentine'],
        locations: [
            { value: 'buenos-aires', label: 'Buenos Aires' },
            { value: 'cordoba', label: 'Córdoba' },
            { value: 'rosario', label: 'Rosario' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    chile: {
        countryName: 'Chile', flag: '🇨🇱',
        locations: [
            { value: 'santiago', label: 'Santiago' },
            { value: 'valparaiso', label: 'Valparaíso' },
            { value: 'concepcion', label: 'Concepción' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    peru: {
        countryName: 'Peru', flag: '🇵🇪',
        aliases: ['pérou', 'perou'],
        locations: [
            { value: 'lima', label: 'Lima' },
            { value: 'arequipa', label: 'Arequipa' },
            { value: 'trujillo', label: 'Trujillo' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── MIDDLE EAST ──────────────────────────────────────────────
    uae: {
        countryName: 'United Arab Emirates', flag: '🇦🇪',
        aliases: ['uae', 'emirates', 'emirats', 'eau'],
        locations: [
            { value: 'dubai', label: 'Dubai' },
            { value: 'abu-dhabi', label: 'Abu Dhabi' },
            { value: 'sharjah', label: 'Sharjah' },
            { value: 'ajman', label: 'Ajman' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    saudi_arabia: {
        countryName: 'Saudi Arabia', flag: '🇸🇦',
        aliases: ['arabie saoudite', 'ksa', 'kingdom of saudi arabia'],
        locations: [
            { value: 'riyadh', label: 'Riyadh' },
            { value: 'jeddah', label: 'Jeddah' },
            { value: 'mecca', label: 'Mecca' },
            { value: 'medina', label: 'Medina' },
            { value: 'dammam', label: 'Dammam' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    qatar: {
        countryName: 'Qatar', flag: '🇶🇦',
        locations: [
            { value: 'doha', label: 'Doha' },
            { value: 'al-wakrah', label: 'Al Wakrah' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    turkey: {
        countryName: 'Turkey', flag: '🇹🇷',
        aliases: ['turquie', 'turkiye'],
        locations: [
            { value: 'istanbul', label: 'Istanbul' },
            { value: 'ankara', label: 'Ankara' },
            { value: 'izmir', label: 'İzmir' },
            { value: 'bursa', label: 'Bursa' },
            { value: 'antalya', label: 'Antalya' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    jordan: {
        countryName: 'Jordan', flag: '🇯🇴',
        aliases: ['jordanie'],
        locations: [
            { value: 'amman', label: 'Amman' },
            { value: 'zarqa', label: 'Zarqa' },
            { value: 'irbid', label: 'Irbid' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    lebanon: {
        countryName: 'Lebanon', flag: '🇱🇧',
        aliases: ['liban'],
        locations: [
            { value: 'beirut', label: 'Beirut' },
            { value: 'tripoli-lb', label: 'Tripoli' },
            { value: 'sidon', label: 'Sidon' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── ASIA ─────────────────────────────────────────────────────
    china: {
        countryName: 'China', flag: '🇨🇳',
        aliases: ['chine'],
        locations: [
            { value: 'beijing', label: 'Beijing' },
            { value: 'shanghai', label: 'Shanghai' },
            { value: 'guangzhou', label: 'Guangzhou' },
            { value: 'shenzhen', label: 'Shenzhen' },
            { value: 'chengdu', label: 'Chengdu' },
            { value: 'wuhan', label: 'Wuhan' },
            { value: 'chongqing', label: 'Chongqing' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    india: {
        countryName: 'India', flag: '🇮🇳',
        aliases: ['inde'],
        locations: [
            { value: 'mumbai', label: 'Mumbai' },
            { value: 'delhi', label: 'Delhi' },
            { value: 'bangalore', label: 'Bangalore' },
            { value: 'hyderabad', label: 'Hyderabad' },
            { value: 'chennai', label: 'Chennai' },
            { value: 'kolkata', label: 'Kolkata' },
            { value: 'pune', label: 'Pune' },
            { value: 'ahmedabad', label: 'Ahmedabad' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    japan: {
        countryName: 'Japan', flag: '🇯🇵',
        aliases: ['japon'],
        locations: [
            { value: 'tokyo', label: 'Tokyo' },
            { value: 'osaka', label: 'Osaka' },
            { value: 'yokohama', label: 'Yokohama' },
            { value: 'kyoto', label: 'Kyoto' },
            { value: 'nagoya', label: 'Nagoya' },
            { value: 'fukuoka', label: 'Fukuoka' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    south_korea: {
        countryName: 'South Korea', flag: '🇰🇷',
        aliases: ['coree du sud', 'korea', 'coree'],
        locations: [
            { value: 'seoul', label: 'Seoul' },
            { value: 'busan', label: 'Busan' },
            { value: 'incheon', label: 'Incheon' },
            { value: 'daegu', label: 'Daegu' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    indonesia: {
        countryName: 'Indonesia', flag: '🇮🇩',
        aliases: ['indonesie'],
        locations: [
            { value: 'jakarta', label: 'Jakarta' },
            { value: 'surabaya', label: 'Surabaya' },
            { value: 'bandung', label: 'Bandung' },
            { value: 'bali', label: 'Bali' },
            { value: 'medan', label: 'Medan' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    philippines: {
        countryName: 'Philippines', flag: '🇵🇭',
        locations: [
            { value: 'manila', label: 'Manila' },
            { value: 'cebu', label: 'Cebu' },
            { value: 'davao', label: 'Davao' },
            { value: 'quezon-city', label: 'Quezon City' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    vietnam: {
        countryName: 'Vietnam', flag: '🇻🇳',
        aliases: ['viet nam'],
        locations: [
            { value: 'ho-chi-minh', label: 'Ho Chi Minh City' },
            { value: 'hanoi', label: 'Hanoi' },
            { value: 'da-nang', label: 'Da Nang' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    thailand: {
        countryName: 'Thailand', flag: '🇹🇭',
        aliases: ['thailande'],
        locations: [
            { value: 'bangkok', label: 'Bangkok' },
            { value: 'chiang-mai', label: 'Chiang Mai' },
            { value: 'phuket', label: 'Phuket' },
            { value: 'pattaya', label: 'Pattaya' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    malaysia: {
        countryName: 'Malaysia', flag: '🇲🇾',
        aliases: ['malaisie'],
        locations: [
            { value: 'kuala-lumpur', label: 'Kuala Lumpur' },
            { value: 'george-town', label: 'George Town' },
            { value: 'johor-bahru', label: 'Johor Bahru' },
            { value: 'kota-kinabalu', label: 'Kota Kinabalu' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    singapore: {
        countryName: 'Singapore', flag: '🇸🇬',
        aliases: ['singapour'],
        locations: [
            { value: 'singapore', label: 'Singapore' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    pakistan: {
        countryName: 'Pakistan', flag: '🇵🇰',
        locations: [
            { value: 'karachi', label: 'Karachi' },
            { value: 'lahore', label: 'Lahore' },
            { value: 'islamabad', label: 'Islamabad' },
            { value: 'faisalabad', label: 'Faisalabad' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    bangladesh: {
        countryName: 'Bangladesh', flag: '🇧🇩',
        locations: [
            { value: 'dhaka', label: 'Dhaka' },
            { value: 'chittagong', label: 'Chittagong' },
            { value: 'sylhet', label: 'Sylhet' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    // ── OCEANIA ──────────────────────────────────────────────────
    australia: {
        countryName: 'Australia', flag: '🇦🇺',
        aliases: ['australie'],
        locations: [
            { value: 'sydney', label: 'Sydney' },
            { value: 'melbourne', label: 'Melbourne' },
            { value: 'brisbane', label: 'Brisbane' },
            { value: 'perth', label: 'Perth' },
            { value: 'adelaide', label: 'Adelaide' },
            { value: 'remote', label: 'Remote' },
        ],
    },
    new_zealand: {
        countryName: 'New Zealand', flag: '🇳🇿',
        aliases: ['nouvelle zelande', 'nouvelle-zelande'],
        locations: [
            { value: 'auckland', label: 'Auckland' },
            { value: 'wellington', label: 'Wellington' },
            { value: 'christchurch', label: 'Christchurch' },
            { value: 'remote', label: 'Remote' },
        ],
    },
}

// Keep togoLocations as alias for backward compatibility
export const togoLocations = locationsByCountry.togo.locations

/**
 * Detects which country's locations to show based on a free-text profile location string.
 * Returns the matched country's locations array, or null if no country is recognized
 * (caller should fall back to a free-text input).
 */
function norm(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function getLocationsForProfile(profileLocation) {
    if (!profileLocation) return null
    const n = norm(profileLocation)
    for (const [, data] of Object.entries(locationsByCountry)) {
        // Match country name
        if (n.includes(norm(data.countryName))) return data.locations
        // Match country aliases
        if (data.aliases?.some(alias => n.includes(norm(alias)))) return data.locations
        // Match any city label or value
        for (const loc of data.locations) {
            if (loc.label && n.includes(norm(loc.label))) return data.locations
            if (loc.value && n.includes(norm(loc.value))) return data.locations
        }
    }
    // Unknown country — return null so caller shows free-text input
    return null
}

