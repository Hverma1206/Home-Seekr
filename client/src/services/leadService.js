import apiClient from './authService'

export const leadService = {
  async createLead(propertyId, data = {}) {
    const response = await apiClient.post('/leads', {
      property: propertyId,
      ...data,
    })
    return response.data
  },

  async getMyLeads(params = {}) {
    const response = await apiClient.get('/leads/buyer/my-leads', { params })
    const data = response.data || {}
    
    return {
      leads: data.leads || [],
      total: data.total || 0,
    }
  },

  async getLeads(params = {}) {
    const response = await apiClient.get('/leads', { params })
    const data = response.data || {}
    
    return {
      leads: data.leads || [],
      total: data.total || 0,
    }
  },

  async getLeadDetails(leadId) {
    const response = await apiClient.get(`/leads/${leadId}`)
    return response.data
  },

  async updateLeadStatus(leadId, status) {
    const response = await apiClient.put(`/leads/${leadId}/status`, { status })
    return response.data
  },

  async scheduleVisit(leadId, visitData) {
    const response = await apiClient.post(`/leads/${leadId}/visit`, visitData)
    return response.data
  },

  async addFollowupNote(leadId, note) {
    const response = await apiClient.post(`/leads/${leadId}/followup-note`, { note })
    return response.data
  },

  async getAnalytics() {
    const response = await apiClient.get('/leads/analytics')
    return response.data
  },

  async getFollowupReminders() {
    const response = await apiClient.get('/leads/reminders/followup')
    const data = response.data || {}
    
    return {
      reminders: data.reminders || [],
      total: data.total || 0,
    }
  },

  async qualifyLead(leadId) {
    const response = await apiClient.put(`/leads/${leadId}/qualify`)
    return response.data
  },
}
