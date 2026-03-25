const API_KEY = import.meta.env.VITE_GEOAPIFY_KEY

// ── GEOCODING: address → lat/lng ──
export const geocodeAddress = async (address) => {
  if (!address || !API_KEY) return null

  try {
    const url =
      `https://api.geoapify.com/v1/geocode/search` +
      `?text=${encodeURIComponent(address)}` +
      `&lang=en` +
      `&limit=1` +
      `&apiKey=${API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    if (!data.features?.length) return null

    const [lng, lat] =
      data.features[0].geometry.coordinates

    return {
      lat,
      lng,
      formatted: data.features[0].properties
        .formatted
    }
  } catch (err) {
    console.error('Geocoding error:', err)
    return null
  }
}

// ── REVERSE GEOCODING: lat/lng → address ──
export const reverseGeocode = async (lat, lng) => {
  if (!API_KEY) return null

  try {
    const url =
      `https://api.geoapify.com/v1/geocode/reverse` +
      `?lat=${lat}` +
      `&lon=${lng}` +
      `&apiKey=${API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    if (!data.features?.length) return null

    return data.features[0].properties.formatted
  } catch (err) {
    console.error('Reverse geocoding error:', err)
    return null
  }
}

// ── PLACES: find nearby parking/EV ──
export const findNearbyPlaces = async (
  lat, lng, radiusMeters = 5000
) => {
  if (!API_KEY) return []

  try {
    const url =
      `https://api.geoapify.com/v2/places` +
      `?categories=parking,vehicle.charging_station` +
      `&filter=circle:${lng},${lat},${radiusMeters}` +
      `&limit=20` +
      `&apiKey=${API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    return data.features || []
  } catch (err) {
    console.error('Places error:', err)
    return []
  }
}

// ── HAVERSINE: distance between two coords ──
export const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── GEOAPIFY TILE URL ──
export const getTileUrl = () =>
  `https://maps.geoapify.com/v1/tile/osm-bright` +
  `/{z}/{x}/{y}.png?apiKey=${API_KEY}`

// ── TILE ATTRIBUTION ──
export const getTileAttribution = () =>
  'Powered by <a href="https://geoapify.com" ' +
  'target="_blank">Geoapify</a> | ' +
  '&copy; <a href="https://www.openstreetmap.org' +
  '/copyright">OpenStreetMap</a>'
