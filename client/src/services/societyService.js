import apiClient from './authService'

export const societyService = {
  // Every society with listings or a project in the city, grouped by the server for the 3D map
  async getSocieties(city = 'Gurugram') {
    const response = await apiClient.get('/societies', { params: { city } })
    return Array.isArray(response.data?.societies) ? response.data.societies : []
  },
}
