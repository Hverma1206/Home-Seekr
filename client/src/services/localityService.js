import apiClient from './authService'

export const localityService = {
  async getPopularLocalities(params = {}) {
    const response = await apiClient.get('/locality/popular', { params })
    const data = response.data || {}
    
    return {
      localities: data.popularLocalities || [],
      total: data.popularLocalities?.length || 0,
    }
  },

  async getLocalitiesByCity(city, params = {}) {
    const response = await apiClient.get(`/locality/city/${city}`, { params })
    const data = response.data || {}
    
    return {
      city: data.city || city,
      localities: data.localities || [],
      total: data.total || 0,
    }
  },

  async searchLocalities(query, params = {}) {
    const response = await apiClient.get('/locality/search', { 
      params: { q: query, ...params } 
    })
    const data = response.data || {}
    
    return {
      results: data.results || [],
      total: data.results?.length || 0,
    }
  },

  async getLocalityInsights(city, localityName) {
    const response = await apiClient.get('/locality/insights', {
      params: { city, localityName },
    })
    const data = response.data || {}
    
    return {
      locality: data.locality || {},
      propertyStats: data.propertyStats || {},
      reviews: data.reviews || [],
    }
  },

  async getPriceTrends(locality, params = {}) {
    const response = await apiClient.get(`/locality/trends/${locality}`, { params })
    const data = response.data || {}
    
    return {
      locality: data.locality || {},
      city: data.city || '',
      currentAvgPrice: data.currentAvgPrice || 0,
      growthMetrics: data.growthMetrics || {},
      priceTrend: data.priceTrend || data.priceHistory || [],
    }
  },

  async getLocalityReviews(locality, params = {}) {
    const response = await apiClient.get(`/locality/reviews/${locality}`, { params })
    const data = response.data || {}
    
    return {
      reviews: data.reviews || [],
      total: data.total || 0,
      averageRating: data.averageRating || 0,
    }
  },

  async getSimilarLocalities(params = {}) {
    const response = await apiClient.get('/locality/similar', { params })
    const data = response.data || {}
    
    return {
      localities: data.localities || [],
      total: data.total || 0,
    }
  },

  async getRecommendations(params = {}) {
    const response = await apiClient.get('/locality/recommendations', { params })
    const data = response.data || {}
    
    return {
      recommendations: data.recommendations || [],
      total: data.total || 0,
    }
  },
}
