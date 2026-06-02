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
		if (token) {
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
	 * Send OTP to phone number
	 * @param {string} phoneNumber - Phone number
	 * @param {string} email - Email address
	 */
	sendOTP: (phoneNumber, email) => {
		const payload = { phoneNumber }
		if (email) {
			payload.email = email
		}
		return apiClient.post('/auth/send-otp', payload)
	},

	/**
	 * Verify OTP
	 * @param {object} data - { phoneNumber, otp, email, password, firstName, lastName }
	 */
	verifyOTP: (data) => apiClient.post('/auth/verify-otp', data),

	/**
	 * Resend OTP
	 * @param {string} phoneNumber - Phone number
	 * @param {string} email - Email address
	 */
	resendOTP: (phoneNumber, email) => {
		const payload = { phoneNumber }
		if (email) {
			payload.email = email
		}
		return apiClient.post('/auth/resend-otp', payload)
	},

	/**
	 * Get current authenticated user
	 */
	getMe: () => apiClient.get('/auth/me'),

	/**
	 * Update authenticated user profile
	 */
	updateProfile: (payload) => apiClient.put('/user/profile', payload),
}

export default apiClient
