/**
 * detectLocation.js
 * Detects the user's location via the browser Geolocation API,
 * reverse-geocodes with OSM Nominatim (no API key needed),
 * then matches to the nearest known city in our app's city list.
 */

import { LOCATION_COORDS, getCoords } from './locationCoords'
import { locationsByCountry } from './togoData'

/** Flat list of all { value, label } city options (no "remote") */
function getAllCityOptions() {
    const options = []
    Object.values(locationsByCountry).forEach(country => {
        country.locations.forEach(loc => {
            if (loc.value !== 'remote') options.push(loc)
        })
    })
    return options
}

/** Haversine distance between two lat/lng points in km */
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371
    const toRad = x => (x * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Strip diacritics and lowercase a string for fuzzy matching */
function normalizeStr(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

/**
 * Given GPS coordinates, returns the nearest known city from our list.
 * Returns { value, label, distanceKm } or null.
 */
export function getNearestCity(lat, lng) {
    const options = getAllCityOptions()
    let best = null
    let bestDist = Infinity

    options.forEach(opt => {
        const coords = getCoords(opt.value)
        if (!coords) return
        const d = haversine(lat, lng, coords.lat, coords.lng)
        if (d < bestDist) {
            bestDist = d
            best = { value: opt.value, label: opt.label, distanceKm: Math.round(d) }
        }
    })
    return best
}

/**
 * Main entry point.
 * Requests browser geolocation, tries to reverse geocode to a known city,
 * falls back to the nearest city by distance.
 *
 * Returns: { value: 'lome', label: 'Lomé', distanceKm: 0, method: 'geocode'|'nearest' }
 * Throws on permission denied / timeout.
 */
export async function detectUserLocation() {
    // 1. Get GPS coords
    const pos = await new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser.'))
            return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 60000,
        })
    })

    const { latitude: lat, longitude: lng } = pos.coords

    // 2. Try Nominatim reverse geocode (rate-limit: 1 req/s — fine for user-triggered action)
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`,
            {
                headers: {
                    'User-Agent': 'GoArtisans/1.0 (https://goartisans.online)',
                },
            }
        )
        if (res.ok) {
            const data = await res.json()
            const addr = data.address || {}
            // Try city, town, village, county in order
            const candidates = [
                addr.city, addr.town, addr.village, addr.county, addr.state_district
            ].filter(Boolean)

            const options = getAllCityOptions()
            for (const candidate of candidates) {
                const normalCandidate = normalizeStr(candidate)
                const match = options.find(
                    o =>
                        normalizeStr(o.label) === normalCandidate ||
                        normalizeStr(o.value) === normalCandidate ||
                        normalizeStr(o.value).replace(/-/g, '') === normalCandidate.replace(/-/g, ' ').replace(/\s/g, '')
                )
                if (match) {
                    return { value: match.value, label: match.label, distanceKm: 0, method: 'geocode' }
                }
            }
        }
    } catch (_) {
        // Nominatim failed — fall through to distance-based fallback
    }

    // 3. Fallback: nearest city in our list by Haversine distance
    const nearest = getNearestCity(lat, lng)
    if (!nearest) throw new Error('Could not determine your location.')
    return { ...nearest, method: 'nearest' }
}
