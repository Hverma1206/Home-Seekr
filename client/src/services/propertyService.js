import apiClient from './authService'

const normalizeProperty = (property) => {
  const areaFallback = property.plotArea
    ? `${property.plotArea}${property.plotAreaUnit ? ` ${property.plotAreaUnit}` : ''}`
    : ''

  return {
    id: property._id || property.id,
    title: property.title || property.selectedType || 'Property',
    price: property.price || property.displayPrice || '',
    bhk: property.bhk || property.bedrooms || 'N/A',
    area: property.area || areaFallback,
    location: property.locationLabel || `${property.locality || ''}${property.city ? `, ${property.city}` : ''}`,
    dealer: property.dealer || property.role || 'Verified Agent',
    tags: Array.isArray(property.tags) ? property.tags : [],
    image: property.image || (property.images && property.images[0]) || '',
    type: property.type || property.selectedType || 'Property',
    status: property.status || property.availabilityStatus || 'Ready',
    raw: property,
  }
}

export const propertyService = {
  async getProperties(params = {}) {
    const response = await apiClient.get('/properties', { params })
    const data = response.data || {}
    const properties = Array.isArray(data.properties)
      ? data.properties.map(normalizeProperty)
      : []

    return { properties, meta: data.meta || {} }
  },
}
