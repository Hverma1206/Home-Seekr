/**
 * Map of Indian cities with their approximate coordinates
 * Used as fallback when reverse geocoding isn't available
 */
const CITIES_WITH_COORDS = {
  'Delhi': { lat: 28.6139, lng: 77.2090, range: 0.3 },
  'Gurugram': { lat: 28.4595, lng: 77.0592, range: 0.2 },
  'Noida': { lat: 28.5355, lng: 77.3910, range: 0.25 },
  'Bengaluru': { lat: 12.9716, lng: 77.5946, range: 0.3 },
  'Mumbai': { lat: 19.0760, lng: 72.8777, range: 0.3 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867, range: 0.25 },
  'Pune': { lat: 18.5204, lng: 73.8567, range: 0.25 },
  'Kolkata': { lat: 22.5726, lng: 88.3639, range: 0.25 },
}

/**
 * Calculate distance between two coordinates in km
 * Using Haversine formula
 */
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Find the nearest city based on coordinates
 * Uses Haversine distance formula
 */
export const getCityFromCoordinates = (latitude, longitude) => {
  let nearestCity = 'Bengaluru' // Default fallback
  let minDistance = Infinity

  for (const [city, coord] of Object.entries(CITIES_WITH_COORDS)) {
    const distance = getDistance(latitude, longitude, coord.lat, coord.lng)
    if (distance < minDistance) {
      minDistance = distance
      nearestCity = city
    }
  }

  // If very far from any city, return null
  if (minDistance > 50) {
    return null
  }

  return nearestCity
}

/**
 * Get city and locality context from coordinates
 * Returns { city, locality, confidence }
 */
export const getLocationContext = (latitude, longitude) => {
  const city = getCityFromCoordinates(latitude, longitude)
  
  if (!city) {
    return {
      city: 'Bengaluru', // Default
      locality: 'Whitefield',
      confidence: 'low',
    }
  }

  // Map cities to default localities
  const defaultLocalities = {
    'Delhi': 'Sector 57',
    'Gurugram': 'Sector 57',
    'Noida': 'Sector 18',
    'Bengaluru': 'Indiranagar',
    'Mumbai': 'Bandra',
    'Hyderabad': 'Banjara Hills',
    'Pune': 'Wakad',
    'Kolkata': 'Salt Lake',
  }

  return {
    city,
    locality: defaultLocalities[city] || 'Central',
    confidence: 'medium',
    coordinates: { latitude, longitude },
  }
}

/**
 * Format coordinates for API calls
 */
export const formatCoordinates = (latitude, longitude) => {
  return {
    latitude: parseFloat(latitude.toFixed(6)),
    longitude: parseFloat(longitude.toFixed(6)),
  }
}
