/**
 * Maps location value strings (from togoData.js) to { lat, lng } coordinates.
 * Used by the 3D world map on the all-users page.
 */
export const LOCATION_COORDS = {
  // === Togo ===
  lome:        { lat: 6.1375,  lng: 1.2123 },
  sokode:      { lat: 8.9831,  lng: 1.1378 },
  kara:        { lat: 9.5511,  lng: 1.1856 },
  atakpame:    { lat: 7.5311,  lng: 1.1236 },
  anecho:      { lat: 6.2264,  lng: 1.5965 },
  kpalime:     { lat: 6.9007,  lng: 0.6336 },
  dapaong:     { lat: 10.8619, lng: 0.2063 },
  notse:       { lat: 6.9527,  lng: 1.1667 },
  kande:       { lat: 9.9586,  lng: 1.0419 },
  bafilo:      { lat: 9.3451,  lng: 1.2668 },
  tchamba:     { lat: 9.0333,  lng: 1.4167 },
  sotouboua:   { lat: 8.5649,  lng: 0.9840 },
  bassar:      { lat: 9.2500,  lng: 0.7833 },
  agou:        { lat: 6.8167,  lng: 0.7500 },

  // === Ghana ===
  accra:       { lat: 5.6037,  lng: -0.1870 },
  kumasi:      { lat: 6.6884,  lng: -1.6244 },
  tamale:      { lat: 9.4008,  lng: -0.8393 },
  takoradi:    { lat: 4.8960,  lng: -1.7557 },
  'cape-coast':{ lat: 5.1053,  lng: -1.2466 },
  ho:          { lat: 6.6011,  lng: 0.4712 },
  koforidua:   { lat: 6.0946,  lng: -0.2600 },
  tema:        { lat: 5.6698,  lng: -0.0166 },
  sunyani:     { lat: 7.3349,  lng: -2.3123 },
  bolgatanga:  { lat: 10.7856, lng: -0.8514 },

  // === Bénin ===
  cotonou:     { lat: 6.3654,  lng: 2.4183 },
  'porto-novo':{ lat: 6.3676,  lng: 2.6852 },
  parakou:     { lat: 9.3375,  lng: 2.6280 },
  'abomey-calavi': { lat: 6.4479, lng: 2.3559 },
  djougou:     { lat: 9.7089,  lng: 1.6659 },
  natitingou:  { lat: 10.3068, lng: 1.3784 },
  ouidah:      { lat: 6.3602,  lng: 2.0847 },
  bohicon:     { lat: 7.1792,  lng: 2.0669 },

  // === Burkina Faso ===
  ouagadougou: { lat: 12.3647, lng: -1.5333 },
  'bobo-dioulasso': { lat: 11.1771, lng: -4.2979 },
  koudougou:   { lat: 12.2531, lng: -2.3636 },
  ouahigouya:  { lat: 13.5731, lng: -2.4204 },
  banfora:     { lat: 10.6335, lng: -4.7599 },
  kaya:        { lat: 13.0885, lng: -1.0919 },
  tenkodogo:   { lat: 11.7799, lng: -0.3723 },

  // === Nigeria ===
  lagos:       { lat: 6.5244,  lng: 3.3792 },
  abuja:       { lat: 9.0579,  lng: 7.4951 },
  kano:        { lat: 12.0022, lng: 8.5920 },
  ibadan:      { lat: 7.3776,  lng: 3.9470 },
  'port-harcourt': { lat: 4.8156, lng: 7.0498 },
  'benin-city':{ lat: 6.3350,  lng: 5.6037 },
  kaduna:      { lat: 10.5264, lng: 7.4386 },
  enugu:       { lat: 6.4584,  lng: 7.5464 },
  aba:         { lat: 5.1078,  lng: 7.3674 },

  // === Côte d'Ivoire ===
  abidjan:     { lat: 5.3599,  lng: -4.0083 },
  bouake:      { lat: 7.6881,  lng: -5.0307 },
  daloa:       { lat: 6.8779,  lng: -6.4502 },
  korhogo:     { lat: 9.4578,  lng: -5.6296 },
  yamoussoukro:{ lat: 6.8276,  lng: -5.2893 },
  'san-pedro': { lat: 4.7481,  lng: -6.6363 },
  gagnoa:      { lat: 6.1311,  lng: -5.9508 },

  // === Sénégal ===
  dakar:       { lat: 14.6928, lng: -17.4467 },
  thies:       { lat: 14.7886, lng: -16.9256 },
  'saint-louis':{ lat: 16.0326, lng: -16.4818 },
  touba:       { lat: 14.8333, lng: -15.8833 },
  kaolack:     { lat: 14.1652, lng: -16.0756 },
  ziguinchor:  { lat: 12.5681, lng: -16.2719 },
  mbour:       { lat: 14.4055, lng: -16.9595 },

  // === Mali ===
  bamako:      { lat: 12.6392, lng: -8.0029 },
  sikasso:     { lat: 11.3175, lng: -5.6668 },
  mopti:       { lat: 14.4963, lng: -4.1965 },
  segou:       { lat: 13.4396, lng: -6.2699 },
  gao:         { lat: 16.2666, lng: -0.0500 },

  // === Niger ===
  niamey:      { lat: 13.5137, lng: 2.1098 },
  zinder:      { lat: 13.8053, lng: 8.9883 },
  maradi:      { lat: 13.4942, lng: 7.1013 },
  tahoua:      { lat: 14.8886, lng: 5.2681 },
  agadez:      { lat: 16.9742, lng: 7.9944 },

  // === Guinée ===
  conakry:     { lat: 9.5370,  lng: -13.6773 },
  nzerekore:   { lat: 7.7564,  lng: -8.8196 },
  kindia:      { lat: 10.0519, lng: -12.8600 },
  kankan:      { lat: 10.3858, lng: -9.3059 },

  // === Sierra Leone ===
  freetown:    { lat: 8.4878,  lng: -13.2317 },
  bo:          { lat: 7.9643,  lng: -11.7382 },
  kenema:      { lat: 7.8761,  lng: -11.1888 },
}

/**
 * Looks up coordinates for a location string (case-insensitive, handles spaces).
 * Returns { lat, lng } or null if not found.
 */
export function getCoords(locationValue) {
  if (!locationValue) return null
  const key = locationValue.toLowerCase().trim().replace(/\s+/g, '-')
  // Try direct key first
  if (LOCATION_COORDS[key]) return LOCATION_COORDS[key]
  // Try without hyphens
  const noHyphen = key.replace(/-/g, '')
  const found = Object.entries(LOCATION_COORDS).find(([k]) => k.replace(/-/g, '') === noHyphen)
  return found ? found[1] : null
}
