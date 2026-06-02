import apiClient from './authService'

export const userService = {
	getPreferences: () => apiClient.get('/user/preferences'),
	updatePreferences: (payload) => apiClient.put('/user/preferences', payload),
	recordRecentSearch: (payload) => apiClient.post('/user/recent-searches', payload),
	getFeed: () => apiClient.get('/user/feed'),
}
