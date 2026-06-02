import apiClient from './authService'

export const alertService = {
	getAlerts: () => apiClient.get('/alerts'),
	createAlert: (payload) => apiClient.post('/alerts', payload),
	updateAlertStatus: (alertId, status) =>
		apiClient.put(`/alerts/${alertId}/status`, { status }),
}
