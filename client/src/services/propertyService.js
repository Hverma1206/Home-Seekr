import apiClient from './authService'

// Posters type the price as plain rupees; show it the way buyers read it
const formatPrice = (price) => {
  if (!/^\d+$/.test(String(price))) return price || ''
  const value = Number(price)
  if (value >= 10000000) return `₹${+(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${+(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export const normalizeProperty = (property) => {
  const areaFallback = property.plotArea
    ? `${property.plotArea}${property.plotAreaUnit ? ` ${property.plotAreaUnit}` : ''}`
    : ''

  return {
    id: property._id || property.id,
    title: property.title || property.selectedType || 'Property',
    price: formatPrice(property.price || property.displayPrice),
    bhk: property.bhk || property.bedrooms || 'N/A',
    area: property.area || areaFallback,
    location: property.locationLabel || `${property.locality || ''}${property.city ? `, ${property.city}` : ''}`,
    locality: property.locality || '',
    city: property.city || '',
    dealer: property.dealer || property.role || 'Verified Agent',
    tags: Array.isArray(property.tags) ? property.tags : [],
    image: property.image || (property.images && property.images[0]) || '',
    type: property.type || property.selectedType || 'Property',
    status: property.status || property.availabilityStatus || 'Ready',
    raw: property,
  }
}

export const propertyService = {
  async createProperty(payload) {
    const response = await apiClient.post('/properties', payload)
    return response.data
  },

  async getMyProperties() {
    const response = await apiClient.get('/properties/mine')
    return (response.data?.properties || []).map(normalizeProperty)
  },

  async updateProperty(propertyId, payload) {
    const response = await apiClient.put(`/properties/${propertyId}`, payload)
    return response.data
  },

  // Sends one JPEG blob, returns the hosted photo URL
  async uploadPhoto(blob) {
    const response = await apiClient.post('/uploads', blob, {
      headers: { 'Content-Type': 'image/jpeg' },
    })
    return response.data.url
  },

  async getProperties(params = {}) {
    const response = await apiClient.get('/properties', { params })
    const data = response.data || {}
    const properties = Array.isArray(data.properties)
      ? data.properties.map(normalizeProperty)
      : []

    const total = data.total || data.meta?.total || properties.length
    return { properties, meta: data.meta || {}, total }
  },

  async getPropertiesByCity(city, params = {}) {
    const response = await apiClient.get(`/properties/city/${city}`, { params })
    const data = response.data || {}
    const properties = Array.isArray(data.properties)
      ? data.properties.map(normalizeProperty)
      : []
    
    return { 
      properties, 
      city: data.city || city,
      total: data.total || data.count || properties.length,
      meta: data.meta || {} 
    }
  },

  async getTrendingProperties(params = {}) {
    const response = await apiClient.get('/properties/trending', { params })
    const data = response.data || {}
    const trending = Array.isArray(data.properties)
      ? data.properties
      : Array.isArray(data.trending)
        ? data.trending
        : []
    const properties = trending.map(normalizeProperty)
    
    return { properties, total: data.total || properties.length }
  },

  async getPropertyDetails(propertyId) {
    const response = await apiClient.get(`/properties/details/${propertyId}`)
    const data = response.data || {}
    
    return {
      property: data.property ? normalizeProperty(data.property) : null,
      similarProperties: Array.isArray(data.similarProperties)
        ? data.similarProperties.map(normalizeProperty)
        : [],
      localityInsights: data.localityInsights || data.locality || null,
      reviews: data.reviews || [],
    }
  },

  async saveProperty(propertyId) {
    const response = await apiClient.post(`/properties/${propertyId}/save`)
    return response.data
  },

  async getSavedProperties(params = {}) {
    const response = await apiClient.get('/properties/saved', { params })
    const data = response.data || {}
    const properties = Array.isArray(data.properties)
      ? data.properties.map(normalizeProperty)
      : []
    
    return { properties, total: data.total || properties.length }
  },

  async contactPropertyOwner(propertyId, message) {
    const response = await apiClient.post(`/properties/${propertyId}/contact`, { message })
    return response.data
  },
}
