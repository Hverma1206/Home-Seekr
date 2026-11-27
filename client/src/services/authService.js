import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
	baseURL: `${API_BASE_URL}/api`,
	headers: {
		'Content-Type': 'application/json',
	},
})

// Add auth token to requests
apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token')
		// A request that sets its own header (phone-login sends the Firebase ID token) keeps it
		if (token && !config.headers.Authorization) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	(error) => Promise.reject(error),
)

// Handle responses
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem('token')
			localStorage.removeItem('user')
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('auth:logout', {
						detail: { reason: 'unauthorized' },
					}),
				)
			}
		}
		return Promise.reject(error)
	},
)

export const authService = {
	/**
	 * Log in with the Firebase ID token from phone OTP; returns data.data { token, user, isNewUser }.
	 * @param {object} [details] - { firstName, lastName?, role?, companyName? } fills in a profile with no name yet
	 */
	phoneLogin: (idToken, details = {}) =>
		apiClient.post('/auth/phone-login', details, { headers: { Authorization: `Bearer ${idToken}` } }),

	// TEMPORARY email + password auth (until SMS OTP is integrated)
	/** @param {object} data - { email, password, phoneNumber, firstName, lastName?, role?, companyName? } */
	registerWithEmail: (data) => apiClient.post('/auth/register', data),

	loginWithEmail: (email, password) => apiClient.post('/auth/login', { email, password }),

	// Verifying the logged-in account's email and phone number. Each verify call returns data.data.user.
	sendEmailOtp: () => apiClient.post('/auth/email/send-otp'),
	verifyEmailOtp: (otp) => apiClient.post('/auth/email/verify-otp', { otp }),
	/** Make the number proven by a Firebase phone OTP (its ID token) the account's verified phone */
	verifyPhone: (idToken) => apiClient.post('/auth/phone/verify', { idToken }),

	/** Get current authenticated user */
	getMe: () => apiClient.get('/auth/me'),

	/** Update authenticated user profile */
	updateProfile: (payload) => apiClient.put('/user/profile', payload),
}

export default apiClient
