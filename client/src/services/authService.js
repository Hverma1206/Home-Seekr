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
	/** Send an OTP; the response says whether this number is a new signup (data.data.isNewUser) */
	sendOTP: (phoneNumber) => apiClient.post('/auth/send-otp', { phoneNumber }),

	/**
	 * Verify OTP and log in
	 * @param {object} data - { phoneNumber, otp, firstName?, lastName?, role?, companyName?, email? }
	 */
	verifyOTP: (data) => apiClient.post('/auth/verify-otp', data),

	resendOTP: (phoneNumber) => apiClient.post('/auth/resend-otp', { phoneNumber }),

	// TEMPORARY email + password auth (until SMS OTP is integrated)
	/** @param {object} data - { email, password, phoneNumber, firstName, lastName?, role?, companyName? } */
	registerWithEmail: (data) => apiClient.post('/auth/register', data),

	loginWithEmail: (email, password) => apiClient.post('/auth/login', { email, password }),

	// Verifying the logged-in account's email and phone number. Each verify call returns data.data.user.
	sendEmailOtp: () => apiClient.post('/auth/email/send-otp'),
	verifyEmailOtp: (otp) => apiClient.post('/auth/email/verify-otp', { otp }),
	/** @param {string} [phoneNumber] - verify this number instead of the one given at signup */
	sendPhoneOtp: (phoneNumber) => apiClient.post('/auth/phone/send-otp', phoneNumber ? { phoneNumber } : {}),
	verifyPhoneOtp: (otp) => apiClient.post('/auth/phone/verify-otp', { otp }),

	/** Get current authenticated user */
	getMe: () => apiClient.get('/auth/me'),

	/** Update authenticated user profile */
	updateProfile: (payload) => apiClient.put('/user/profile', payload),
}

export default apiClient
