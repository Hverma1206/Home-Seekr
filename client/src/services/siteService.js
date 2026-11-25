import apiClient from './authService'

export const siteService = {
	subscribe: (email) => apiClient.post('/site/subscribe', { email }),
	sendContactMessage: (payload) => apiClient.post('/site/contact', payload),
}
