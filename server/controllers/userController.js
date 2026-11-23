import axios from 'axios'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Property from '../models/Property.js'
import Project from '../models/Project.js'

const OTP_EXPIRY_MINUTES = 10
const OTP_RESEND_DELAY_SECONDS = 30
const MAX_OTP_ATTEMPTS = 5

const buildUserResponse = (user) => ({
	id: user._id,
	phoneNumber: user.phoneNumber,
	firstName: user.firstName || '',
	lastName: user.lastName || '',
	email: user.email || undefined,
	profileImage: user.profileImage || '',
	bio: user.bio || '',
	role: user.role || 'buyer',
	companyName: user.companyName || '',
	isPhoneVerified: user.isPhoneVerified,
	isActive: user.isActive,
})

const normalizeEmail = (email) => {
	if (typeof email !== 'string') {
		return undefined
	}

	const normalizedEmail = email.trim().toLowerCase()
	return normalizedEmail || undefined
}

const hasOwnProperty = (obj, key) =>
	Object.prototype.hasOwnProperty.call(obj || {}, key)

const sanitizeStringArray = (value) => {
	if (!Array.isArray(value)) {
		return []
	}

	const cleaned = value
		.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
		.filter(Boolean)

	return [...new Set(cleaned)]
}

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : undefined
}

const cleanString = (value) =>
	(typeof value === 'string' && value.trim() ? value.trim() : undefined)

const sanitizeSearchPreferences = (preferences = {}) => {
	const budgetMin = parseNumber(preferences?.budget?.min)
	const budgetMax = parseNumber(preferences?.budget?.max)

	return {
		propertyType: sanitizeStringArray(preferences.propertyType),
		budget: {
			min: budgetMin,
			max: budgetMax,
		},
		bhkRange: sanitizeStringArray(preferences.bhkRange),
		furnishing: sanitizeStringArray(preferences.furnishing),
	}
}

const sanitizeNotificationSettings = (settings = {}) => ({
	emailNotifications: Boolean(settings?.emailNotifications),
	smsNotifications: Boolean(settings?.smsNotifications),
	pushNotifications: Boolean(settings?.pushNotifications),
	alertNotifications: Boolean(settings?.alertNotifications),
})

const normalizeSearchFilters = (filters = {}) => {
	const normalized = {
		city: cleanString(filters.city),
		locality: cleanString(filters.locality),
		lookingTo: cleanString(filters.lookingTo),
		propertyCategory: cleanString(filters.propertyCategory),
		selectedType: cleanString(filters.selectedType),
		minPrice: parseNumber(filters.minPrice),
		maxPrice: parseNumber(filters.maxPrice),
		bhk: cleanString(filters.bhk),
		sortBy: cleanString(filters.sortBy),
	}

	return Object.entries(normalized).reduce((acc, [key, value]) => {
		if (value !== undefined) {
			acc[key] = value
		}
		return acc
	}, {})
}

const buildSearchLabel = (filters = {}) => {
	const locationParts = []
	if (filters.locality) {
		locationParts.push(filters.locality)
	}
	if (filters.city) {
		locationParts.push(filters.city)
	}

	const locationLabel = locationParts.join(', ')
	const intent = filters.lookingTo || filters.propertyCategory
	if (intent && locationLabel) {
		return `${intent} in ${locationLabel}`
	}
	if (locationLabel) {
		return locationLabel
	}
	return 'Your search'
}

const escapeRegExp = (value) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toRegexList = (values = []) =>
	values.map((entry) => new RegExp(`^${escapeRegExp(entry)}$`, 'i'))

const buildPropertyFiltersFromSearch = (filters = {}) => {
	const propertyFilters = { status: 'active' }

	if (filters.city) {
		propertyFilters.city = { $in: toRegexList([filters.city]) }
	}
	if (filters.locality) {
		propertyFilters.locality = { $in: toRegexList([filters.locality]) }
	}
	if (filters.lookingTo) {
		propertyFilters.lookingTo = filters.lookingTo
	}
	if (filters.propertyCategory) {
		propertyFilters.propertyCategory = filters.propertyCategory
	}
	if (filters.selectedType) {
		propertyFilters.propertyType = filters.selectedType
	}
	if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
		propertyFilters.priceNumeric = {}
		if (filters.minPrice !== undefined) {
			propertyFilters.priceNumeric.$gte = filters.minPrice
		}
		if (filters.maxPrice !== undefined) {
			propertyFilters.priceNumeric.$lte = filters.maxPrice
		}
	}
	if (filters.bhk) {
		const bhkNumber = parseNumber(filters.bhk)
		if (bhkNumber !== undefined) {
			propertyFilters.bhkNumeric = bhkNumber
		}
	}

	return propertyFilters
}

// Helper: Generate JWT token
const generateToken = (id) => {
	const jwtSecret = process.env.JWT_SECRET
	if (!jwtSecret) {
		throw new Error('JWT secret not configured')
	}
	return jwt.sign({ id }, jwtSecret, { expiresIn: '7d' })
}

// Helper: Normalize Indian mobile number
const normalizeIndianMobileNumber = (phoneNumber) => {
	const cleaned = phoneNumber.replace(/\D/g, '')
	let nationalNumber = cleaned

	if (cleaned.startsWith('91') && cleaned.length >= 12) {
		nationalNumber = cleaned.slice(-10)
	}

	const isValid = /^[6-9]\d{9}$/.test(nationalNumber)

	return {
		cleaned,
		nationalNumber,
		isValid,
		internationalNumber: `91${nationalNumber}`,
	}
}

// Helper: Call 2Factor API
const call2FactorAPI = async (endpoint) => {
	try {
		const apiKey =
			process.env.TWOFACTOR_API_KEY || process.env.TWO_FACTOR_API_KEY
		if (!apiKey) {
			throw new Error('2Factor API key not configured')
		}

		const response = await axios.get(
			`https://2factor.in/API/V1/${apiKey}${endpoint}`,
			{
				timeout: 10000,
			},
		)
		console.log(response.data)
		return response.data
	} catch (error) {
		console.error('2Factor API Error:', error.message)
		throw new Error(`2Factor API Error: ${error.message}`)
	}
}

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to phone number during signup
 * @access  Public
 */
export const sendOTP = async (req, res) => {
	try {
		const { phoneNumber, email, firstName, lastName } = req.body

		// Validation
		if (!phoneNumber) {
			return res.status(400).json({
				success: false,
				message: 'Phone number is required',
			})
		}

		const phoneDetails = normalizeIndianMobileNumber(phoneNumber)
		if (!phoneDetails.isValid) {
			return res.status(400).json({
				success: false,
				message: 'Invalid Indian mobile number format',
			})
		}

		// Find existing user by phone
		const existingUser = await User.findOne({
			phoneNumber: phoneDetails.nationalNumber,
		})

		// Check if OTP was recently sent (rate limiting)
		if (existingUser && existingUser.otpSentAt) {
			const timeSinceLastOTP = (Date.now() - existingUser.otpSentAt) / 1000
			if (timeSinceLastOTP < OTP_RESEND_DELAY_SECONDS) {
				const remainingTime = Math.ceil(
					OTP_RESEND_DELAY_SECONDS - timeSinceLastOTP,
				)
				return res.status(429).json({
					success: false,
					message: `Please wait ${remainingTime} seconds before requesting a new OTP`,
				})
			}
		}

		// Call 2Factor API to send OTP
		const apiResponse = await call2FactorAPI(
			`/SMS/${phoneDetails.internationalNumber}/AUTOGEN/Homeseekrotp`,
		)

		if (apiResponse.Status !== 'Success' || !apiResponse.Details) {
			console.error('2Factor API Response:', apiResponse)
			return res.status(500).json({
				success: false,
				message: 'Failed to send OTP. Please try again.',
			})
		}

		const sessionId = apiResponse.Details

		// Update or create user with OTP session
		const updateData = {
			phoneNumber: phoneDetails.nationalNumber,
			otpSessionId: sessionId,
			otpSentAt: new Date(),
			otpAttempts: 0,
		}

		const normalizedEmail = normalizeEmail(email)
		if (normalizedEmail) {
			updateData.email = normalizedEmail
		}
		if (firstName) {
			updateData.firstName = firstName
		}
		if (lastName) {
			updateData.lastName = lastName
		}

		const updatedUser = await User.findOneAndUpdate(
			{ phoneNumber: phoneDetails.nationalNumber },
			updateData,
			{
				upsert: true,
				returnDocument: 'after',
				setDefaultsOnInsert: true,
			},
		)

		res.status(200).json({
			success: true,
			message: 'OTP sent successfully',
			data: {
				phoneNumber: phoneDetails.nationalNumber,
				email: updatedUser.email || undefined,
				expiresIn: OTP_EXPIRY_MINUTES,
			},
		})
	} catch (error) {
		console.error('Send OTP Error:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Failed to send OTP',
		})
	}
}

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and activate account
 * @access  Public
 */
export const verifyOTP = async (req, res) => {
	try {
		const { phoneNumber, otp, email, password, firstName, lastName } = req.body

		// Validation
		if (!phoneNumber || !otp) {
			return res.status(400).json({
				success: false,
				message: 'Phone number and OTP are required',
			})
		}

		const phoneDetails = normalizeIndianMobileNumber(phoneNumber)
		if (!phoneDetails.isValid) {
			return res.status(400).json({
				success: false,
				message: 'Invalid Indian mobile number format',
			})
		}

		const cleanOTP = otp.toString().trim()
		if (!/^\d{6}$/.test(cleanOTP)) {
			return res.status(400).json({
				success: false,
				message: 'OTP must be a 6-digit number',
			})
		}

		if (password && password.length < 6) {
			return res.status(400).json({
				success: false,
				message: 'Password must be at least 6 characters',
			})
		}

		// Find user
		const user = await User.findOne({
			phoneNumber: phoneDetails.nationalNumber,
		}).select(
			'+password',
		)

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found. Please signup first.',
			})
		}

		// Check OTP attempts
		if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
			return res.status(429).json({
				success: false,
				message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
			})
		}

		// Check if OTP has expired
		if (!user.otpSentAt) {
			return res.status(400).json({
				success: false,
				message: 'No OTP found. Please request OTP first.',
			})
		}

		const otpAge = (Date.now() - user.otpSentAt) / 1000 / 60 // in minutes
		if (otpAge > OTP_EXPIRY_MINUTES) {
			return res.status(400).json({
				success: false,
				message: 'OTP has expired. Please request a new OTP.',
			})
		}

		// Get session ID
		const sessionId = user.otpSessionId
		if (!sessionId) {
			return res.status(400).json({
				success: false,
				message: 'Invalid OTP session. Please request OTP again.',
			})
		}

		// Verify OTP with 2Factor API
		const apiResponse = await call2FactorAPI(
			`/SMS/VERIFY/${sessionId}/${cleanOTP}`,
		)

		if (apiResponse.Status !== 'Success') {
			// Increment failed attempts
			user.otpAttempts += 1
			user.otpLastAttemptAt = new Date()
			await user.save()

			const remainingAttempts = MAX_OTP_ATTEMPTS - user.otpAttempts
			return res.status(400).json({
				success: false,
				message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
			})
		}

		// OTP verified successfully - update user
		user.isPhoneVerified = true
		user.otpSessionId = null
		user.otpSentAt = null
		user.otpAttempts = 0
		user.isActive = true
		user.firstName = firstName || user.firstName
		user.lastName = lastName || user.lastName
		const normalizedEmail = normalizeEmail(email)
		if (normalizedEmail) {
			user.email = normalizedEmail
		}
		if (password) {
			user.password = password
		}

		await user.save()

		// Generate JWT token
		const token = generateToken(user._id)
		const responseUser = buildUserResponse(user)

		res.status(200).json({
			success: true,
			message: 'Phone verified successfully',
			data: {
				token,
				user: responseUser,
			},
		})
	} catch (error) {
		console.error('Verify OTP Error:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Failed to verify OTP',
		})
	}
}

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
export const getCurrentUser = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			})
		}

		return res.status(200).json({
			success: true,
			data: {
				user: buildUserResponse(req.user),
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to fetch user',
		})
	}
}

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
	try {
		const { name, firstName, lastName, email, phoneNumber, profileImage, bio } =
			req.body

		const user = await User.findById(req.user._id)
		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			})
		}

		if (name && typeof name === 'string') {
			const parts = name.trim().split(/\s+/)
			user.firstName = parts.shift() || ''
			user.lastName = parts.join(' ')
		} else {
			if (typeof firstName === 'string') {
				user.firstName = firstName.trim()
			}
			if (typeof lastName === 'string') {
				user.lastName = lastName.trim()
			}
		}

		const normalizedEmail = normalizeEmail(email)
		if (normalizedEmail) {
			const existingEmail = await User.findOne({
				email: normalizedEmail,
				_id: { $ne: user._id },
			})
			if (existingEmail) {
				return res.status(409).json({
					success: false,
					message: 'Email already in use',
				})
			}
			user.email = normalizedEmail
		}

		if (typeof phoneNumber === 'string' && phoneNumber.trim()) {
			const phoneDetails = normalizeIndianMobileNumber(phoneNumber)
			if (!phoneDetails.isValid) {
				return res.status(400).json({
					success: false,
					message: 'Invalid Indian mobile number format',
				})
			}
			if (phoneDetails.nationalNumber !== user.phoneNumber) {
				const existingPhone = await User.findOne({
					phoneNumber: phoneDetails.nationalNumber,
					_id: { $ne: user._id },
				})
				if (existingPhone) {
					return res.status(409).json({
						success: false,
						message: 'Phone number already in use',
					})
				}
				user.phoneNumber = phoneDetails.nationalNumber
			}
		}

		if (typeof profileImage === 'string') {
			user.profileImage = profileImage.trim()
		}

		if (typeof bio === 'string') {
			user.bio = bio.trim()
		}

		await user.save()

		return res.status(200).json({
			success: true,
			message: 'Profile updated successfully',
			data: {
				user: buildUserResponse(user),
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to update profile',
		})
	}
}

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to phone number
 * @access  Public
 */
export const resendOTP = async (req, res) => {
	try {
		const { phoneNumber, email } = req.body

		// Validation
		if (!phoneNumber) {
			return res.status(400).json({
				success: false,
				message: 'Phone number is required',
			})
		}

		const phoneDetails = normalizeIndianMobileNumber(phoneNumber)
		if (!phoneDetails.isValid) {
			return res.status(400).json({
				success: false,
				message: 'Invalid Indian mobile number format',
			})
		}

		// Find user
		const user = await User.findOne({
			phoneNumber: phoneDetails.nationalNumber,
		})

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			})
		}

		// Check if user is already verified
		if (user.isPhoneVerified) {
			return res.status(400).json({
				success: false,
				message: 'Phone number is already verified',
			})
		}

		// Check resend delay
		if (user.otpSentAt) {
			const timeSinceLastOTP = (Date.now() - user.otpSentAt) / 1000
			if (timeSinceLastOTP < OTP_RESEND_DELAY_SECONDS) {
				const remainingTime = Math.ceil(
					OTP_RESEND_DELAY_SECONDS - timeSinceLastOTP,
				)
				return res.status(429).json({
					success: false,
					message: `Please wait ${remainingTime} seconds before requesting a new OTP`,
				})
			}
		}

		// Call 2Factor API to send OTP
		const apiResponse = await call2FactorAPI(
			`/SMS/${phoneDetails.internationalNumber}/AUTOGEN/Homeseekrotp`,
		)

		if (apiResponse.Status !== 'Success' || !apiResponse.Details) {
			console.error('2Factor API Response:', apiResponse)
			return res.status(500).json({
				success: false,
				message: 'Failed to send OTP. Please try again.',
			})
		}

		const sessionId = apiResponse.Details

		// Update user with new OTP session
		user.otpSessionId = sessionId
		user.otpSentAt = new Date()
		user.otpAttempts = 0 // Reset attempts on resend
		await user.save()

		res.status(200).json({
			success: true,
			message: 'OTP resent successfully',
			data: {
				phoneNumber: phoneDetails.nationalNumber,
				expiresIn: OTP_EXPIRY_MINUTES,
			},
		})
	} catch (error) {
		console.error('Resend OTP Error:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Failed to resend OTP',
		})
	}
}

/**
 * @route   GET /api/user/preferences
 * @desc    Get user preferences and recent searches
 * @access  Private
 */
export const getUserPreferences = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			})
		}

		return res.status(200).json({
			success: true,
			data: {
				preferences: {
					preferredCities: user.preferredCities || [],
					preferredLocalities: user.preferredLocalities || [],
					searchPreferences: user.searchPreferences || {},
					notificationSettings: user.notificationSettings || {},
				},
				recentSearches: user.recentSearches || [],
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to load preferences',
		})
	}
}

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
export const updateUserPreferences = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			})
		}

		const { preferredCities, preferredLocalities, searchPreferences, notificationSettings } =
			req.body || {}

		if (hasOwnProperty(req.body, 'preferredCities')) {
			user.preferredCities = sanitizeStringArray(preferredCities)
		}
		if (hasOwnProperty(req.body, 'preferredLocalities')) {
			user.preferredLocalities = sanitizeStringArray(preferredLocalities)
		}
		if (hasOwnProperty(req.body, 'searchPreferences')) {
			user.searchPreferences = sanitizeSearchPreferences(searchPreferences)
		}
		if (hasOwnProperty(req.body, 'notificationSettings')) {
			user.notificationSettings = sanitizeNotificationSettings(notificationSettings)
		}

		await user.save()

		return res.status(200).json({
			success: true,
			message: 'Preferences updated successfully',
			data: {
				preferences: {
					preferredCities: user.preferredCities || [],
					preferredLocalities: user.preferredLocalities || [],
					searchPreferences: user.searchPreferences || {},
					notificationSettings: user.notificationSettings || {},
				},
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to update preferences',
		})
	}
}

/**
 * @route   POST /api/user/recent-searches
 * @desc    Record a recent search for personalization
 * @access  Private
 */
export const recordRecentSearch = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			})
		}

		const { filters, label } = req.body || {}
		if (!filters || typeof filters !== 'object') {
			return res.status(400).json({
				success: false,
				message: 'Search filters are required',
			})
		}

		const normalizedFilters = normalizeSearchFilters(filters)
		const computedLabel =
			typeof label === 'string' && label.trim()
				? label.trim()
				: buildSearchLabel(normalizedFilters)

		const nextEntry = {
			label: computedLabel,
			filters: normalizedFilters,
			createdAt: new Date(),
		}

		const existingSearches = Array.isArray(user.recentSearches)
			? user.recentSearches
			: []
		const deduped = [
			nextEntry,
			...existingSearches.filter((entry) => entry.label !== computedLabel),
		]

		user.recentSearches = deduped.slice(0, 6)
		await user.save()

		return res.status(200).json({
			success: true,
			data: {
				recentSearches: user.recentSearches,
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to record search',
		})
	}
}

/**
 * @route   GET /api/user/feed
 * @desc    Personalized feed for dashboard
 * @access  Private
 */
export const getPersonalizedFeed = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'User not found',
			})
		}

		const recentSearches = Array.isArray(user.recentSearches)
			? user.recentSearches
			: []
		const preferredCities = Array.isArray(user.preferredCities)
			? user.preferredCities
			: []
		const preferredLocalities = Array.isArray(user.preferredLocalities)
			? user.preferredLocalities
			: []
		const searchPreferences = user.searchPreferences || {}

		const recentCities = recentSearches
			.map((entry) => entry?.filters?.city)
			.filter(Boolean)
		const cityPool = [...new Set([...preferredCities, ...recentCities].filter(Boolean))]

		const propertyFilters = { status: 'active' }
		if (cityPool.length) {
			propertyFilters.city = { $in: toRegexList(cityPool) }
		}
		if (preferredLocalities.length) {
			propertyFilters.locality = { $in: toRegexList(preferredLocalities) }
		}

		const intentPreferences = sanitizeStringArray(searchPreferences?.propertyType)
		const lookingTo = intentPreferences.filter((entry) =>
			['buy', 'rent', 'pg'].includes(entry),
		)
		if (lookingTo.length) {
			propertyFilters.lookingTo = { $in: lookingTo }
		}
		if (intentPreferences.includes('commercial')) {
			propertyFilters.propertyCategory = 'commercial'
		}

		if (
			searchPreferences?.budget?.min !== undefined ||
			searchPreferences?.budget?.max !== undefined
		) {
			propertyFilters.priceNumeric = {}
			if (searchPreferences?.budget?.min !== undefined) {
				propertyFilters.priceNumeric.$gte = searchPreferences.budget.min
			}
			if (searchPreferences?.budget?.max !== undefined) {
				propertyFilters.priceNumeric.$lte = searchPreferences.budget.max
			}
		}

		const bhkValues = sanitizeStringArray(searchPreferences?.bhkRange)
		const bhkNumbers = bhkValues
			.map((entry) => parseNumber(entry))
			.filter((entry) => entry !== undefined)
		if (bhkNumbers.length) {
			const hasPlus = bhkValues.some((entry) => entry.includes('+'))
			if (hasPlus) {
				propertyFilters.bhkNumeric = { $gte: Math.min(...bhkNumbers) }
			} else {
				propertyFilters.bhkNumeric = { $in: bhkNumbers }
			}
		}

		const furnishing = sanitizeStringArray(searchPreferences?.furnishing)
		if (furnishing.length) {
			propertyFilters.furnishingType = { $in: furnishing }
		}

		const propertyLimit = parseNumber(req.query?.limit) || 8
		const projectLimit = parseNumber(req.query?.projectLimit) || 6

		const [properties, projects] = await Promise.all([
			Property.find(propertyFilters)
				.sort({ isFeatured: -1, views: -1, createdAt: -1 })
				.limit(propertyLimit)
				.lean(),
			Project.find(
				cityPool.length
					? { status: 'active', city: { $in: toRegexList(cityPool) } }
					: { status: 'active' },
			)
				.sort({ isFeatured: -1, createdAt: -1 })
				.limit(projectLimit)
				.lean(),
		])

		const suggestionSeeds = recentSearches.length
			? recentSearches.slice(0, 3)
			: cityPool.slice(0, 3).map((city) => ({
					label: `Homes in ${city}`,
					filters: { city },
				}))

		const alertSuggestions = await Promise.all(
			suggestionSeeds.map(async (entry) => {
				const filters = normalizeSearchFilters(entry.filters || {})
				const label = entry.label || buildSearchLabel(filters)
				const matchCount = await Property.countDocuments(
					buildPropertyFiltersFromSearch(filters),
				)
				return { label, filters, matchCount }
			}),
		)

		return res.status(200).json({
			success: true,
			data: {
				properties,
				projects,
				recentSearches,
				alertSuggestions,
				preferences: {
					preferredCities,
					preferredLocalities,
					searchPreferences,
				},
				role: user.role || 'buyer',
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to build feed',
		})
	}
}
