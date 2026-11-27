import jwt from 'jsonwebtoken'
import { normalizeIndianMobileNumber, verifyFirebasePhoneToken } from '../utils/phone.js'
import User from '../models/User.js'
import Property from '../models/Property.js'
import Project from '../models/Project.js'

export const buildUserResponse = (user) => ({
	id: user._id,
	phoneNumber: user.phoneNumber,
	pendingPhoneNumber: user.pendingPhoneNumber || undefined,
	isEmailVerified: Boolean(user.isEmailVerified),
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

const SIGNUP_ROLES = ['buyer', 'owner', 'broker', 'builder']

/**
 * @route   POST /api/auth/phone-login
 * @desc    Log in or sign up with a Firebase phone-auth ID token sent as "Authorization: Bearer <idToken>".
 *          Optional body { firstName, lastName, role, companyName } fills in a profile that has no name yet,
 *          so a new number can finish signup by calling this again with the same ID token.
 * @access  Public
 */
export const phoneLogin = async (req, res) => {
	try {
		const authHeader = req.headers.authorization || ''
		const phoneNumber = await verifyFirebasePhoneToken(
			authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '',
		)
		if (!phoneNumber) {
			return res.status(401).json({
				success: false,
				message: 'Phone verification failed or expired. Please request a new OTP.',
			})
		}

		let user = await User.findOne({ phoneNumber })
		if (user?.isBanned) {
			return res.status(403).json({
				success: false,
				message: 'This account has been suspended. Contact support.',
			})
		}

		// A number that never finished verification is still a signup
		const isNewUser = !user?.isPhoneVerified
		user ||= new User({ phoneNumber })
		user.isPhoneVerified = true
		user.isActive = true

		// Signup details are taken once; a returning user logging in keeps their saved profile
		const { firstName, lastName, role, companyName } = req.body || {}
		if (!user.firstName && cleanString(firstName)) {
			user.firstName = cleanString(firstName)
			user.lastName = cleanString(lastName) || ''
			if (SIGNUP_ROLES.includes(role)) user.role = role
		}
		if (cleanString(companyName) && !user.companyName) {
			user.companyName = cleanString(companyName).slice(0, 120)
		}

		await user.save()

		res.status(200).json({
			success: true,
			message: 'Logged in',
			data: {
				token: generateToken(user._id),
				user: buildUserResponse(user),
				isNewUser,
			},
		})
	} catch (error) {
		// Two first logins for the same number at once: the other request created the account
		if (error.code === 11000) {
			return res.status(409).json({ success: false, message: 'Please try logging in again.' })
		}
		console.error('Phone login error:', error)
		res.status(500).json({
			success: false,
			message: 'Failed to log in. Please try again.',
		})
	}
}

// TEMPORARY: email + password auth, used until phone OTP (SMS provider) is integrated for real.
// The phone number collected here is NOT verified (isPhoneVerified stays false).

/**
 * @route   POST /api/auth/register
 * @desc    Sign up with email + password (phone number stored unverified)
 * @access  Public
 */
export const registerWithEmail = async (req, res) => {
	try {
		const { email, password, phoneNumber, firstName, lastName, role, companyName } = req.body || {}

		const normalizedEmail = normalizeEmail(email)
		if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			return res.status(400).json({ success: false, message: 'Please enter a valid email address' })
		}
		if (typeof password !== 'string' || password.length < 6) {
			return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
		}
		if (!cleanString(firstName)) {
			return res.status(400).json({ success: false, message: 'Please enter your name' })
		}
		if (!phoneNumber) {
			return res.status(400).json({ success: false, message: 'Phone number is required' })
		}
		const phoneDetails = normalizeIndianMobileNumber(String(phoneNumber))
		if (!phoneDetails.isValid) {
			return res.status(400).json({ success: false, message: 'Invalid Indian mobile number format' })
		}

		if (await User.exists({ email: normalizedEmail })) {
			return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' })
		}

		if (await User.exists({ phoneNumber: phoneDetails.nationalNumber, isPhoneVerified: true })) {
			return res.status(409).json({
				success: false,
				message: 'This mobile number is already registered. Log in with it using OTP instead.',
			})
		}

		// The number is only claimed once it is verified by OTP (see verificationController)
		const user = new User({ pendingPhoneNumber: phoneDetails.nationalNumber })
		user.email = normalizedEmail
		user.password = password
		user.firstName = cleanString(firstName)
		user.lastName = cleanString(lastName) || ''
		user.role = SIGNUP_ROLES.includes(role) ? role : 'buyer'
		if (cleanString(companyName)) {
			user.companyName = cleanString(companyName).slice(0, 120)
		}
		user.isActive = true
		await user.save()

		return res.status(201).json({
			success: true,
			message: 'Account created successfully',
			data: {
				token: generateToken(user._id),
				user: buildUserResponse(user),
				isNewUser: true,
			},
		})
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ success: false, message: 'Email or phone number already registered' })
		}
		if (error.name === 'ValidationError') {
			return res.status(400).json({
				success: false,
				message: Object.values(error.errors).map((item) => item.message).join(', '),
			})
		}
		console.error('Register Error:', error)
		return res.status(500).json({ success: false, message: error.message || 'Failed to create account' })
	}
}

/**
 * @route   POST /api/auth/login
 * @desc    Log in with email + password
 * @access  Public
 */
export const loginWithEmail = async (req, res) => {
	try {
		const { email, password } = req.body || {}
		const normalizedEmail = normalizeEmail(email)

		if (!normalizedEmail || typeof password !== 'string' || !password) {
			return res.status(400).json({ success: false, message: 'Email and password are required' })
		}

		const user = await User.findOne({ email: normalizedEmail }).select('+password')
		// Same message for unknown email and wrong password, so emails can't be probed
		if (!user || !user.password || !(await user.matchPassword(password))) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' })
		}

		if (user.isBanned) {
			return res.status(403).json({ success: false, message: 'This account has been suspended. Contact support.' })
		}

		if (!user.isActive) {
			user.isActive = true
			await user.save()
		}

		return res.status(200).json({
			success: true,
			message: 'Logged in successfully',
			data: {
				token: generateToken(user._id),
				user: buildUserResponse(user),
				isNewUser: false,
			},
		})
	} catch (error) {
		console.error('Login Error:', error)
		return res.status(500).json({ success: false, message: error.message || 'Failed to log in' })
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
		const { name, firstName, lastName, email, phoneNumber, profileImage, bio, companyName } =
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
			// A new address has to be verified again
			if (normalizedEmail !== user.email) {
				user.isEmailVerified = false
				user.emailOtpHash = null
				user.emailOtpSentAt = null
				user.emailOtpAttempts = 0
			}
			user.email = normalizedEmail
		}

		// The phone number is the login and is handed to buyers on enquiries, so it only changes through OTP verification
		if (typeof phoneNumber === 'string' && phoneNumber.trim()) {
			const phoneDetails = normalizeIndianMobileNumber(phoneNumber)
			if (phoneDetails.nationalNumber !== user.phoneNumber) {
				return res.status(400).json({
					success: false,
					message: 'Phone number cannot be changed here. Log in with the new number instead.',
				})
			}
		}

		if (typeof companyName === 'string') {
			user.companyName = companyName.trim().slice(0, 120)
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
		const isValidation = error.name === 'ValidationError'
		return res.status(isValidation ? 400 : 500).json({
			success: false,
			message: isValidation
				? Object.values(error.errors).map((item) => item.message).join(', ')
				: error.message || 'Failed to update profile',
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
