import Property from '../models/Property.js'
import PropertyAlert from '../models/PropertyAlert.js'

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

const escapeRegExp = (value) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toRegexList = (values = []) =>
	values.map((entry) => new RegExp(`^${escapeRegExp(entry)}$`, 'i'))

const buildPropertyFiltersFromAlert = (alert) => {
	const filters = { status: 'active' }

	if (alert?.cities?.length) {
		filters.city = { $in: toRegexList(alert.cities) }
	}
	if (alert?.localities?.length) {
		filters.locality = { $in: toRegexList(alert.localities) }
	}

	if (alert?.alertType === 'commercial') {
		filters.propertyCategory = 'commercial'
	} else if (alert?.alertType === 'project') {
		filters.propertyCategory = 'project'
	} else if (alert?.alertType) {
		filters.lookingTo = alert.alertType
	}

	if (alert?.propertyTypes?.length) {
		filters.propertyType = { $in: alert.propertyTypes }
	}

	if (alert?.bhk?.length) {
		const bhkNumbers = alert.bhk
			.map((entry) => parseNumber(entry))
			.filter((entry) => entry !== undefined)
		if (bhkNumbers.length) {
			filters.bhkNumeric = { $in: bhkNumbers }
		}
	}

	if (alert?.furnishingType?.length) {
		filters.furnishingType = { $in: alert.furnishingType }
	}

	if (alert?.budget?.min !== undefined || alert?.budget?.max !== undefined) {
		filters.priceNumeric = {}
		if (alert?.budget?.min !== undefined) {
			filters.priceNumeric.$gte = alert.budget.min
		}
		if (alert?.budget?.max !== undefined) {
			filters.priceNumeric.$lte = alert.budget.max
		}
	}

	return filters
}

export const getAlerts = async (req, res) => {
	try {
		const alerts = await PropertyAlert.find({ user: req.user._id })
			.sort({ createdAt: -1 })
			.lean()

		const alertsWithMatches = await Promise.all(
			alerts.map(async (alert) => {
				const matchCount = await Property.countDocuments(
					buildPropertyFiltersFromAlert(alert),
				)
				return { ...alert, matchCount }
			}),
		)

		return res.status(200).json({
			success: true,
			data: { alerts: alertsWithMatches },
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to load alerts',
		})
	}
}

export const createAlert = async (req, res) => {
	try {
		const {
			alertType,
			cities,
			localities,
			budget,
			propertyTypes,
			bhk,
			furnishingType,
			frequency,
			notificationChannels,
		} = req.body || {}

		const normalizedCities = sanitizeStringArray(cities)
		if (!normalizedCities.length) {
			return res.status(400).json({
				success: false,
				message: 'At least one city is required to create an alert',
			})
		}

		const allowedAlertTypes = ['buy', 'rent', 'pg', 'commercial', 'project']
		const normalizedAlertType = allowedAlertTypes.includes(alertType)
			? alertType
			: 'buy'

		const alert = await PropertyAlert.create({
			user: req.user._id,
			alertType: normalizedAlertType,
			cities: normalizedCities,
			localities: sanitizeStringArray(localities),
			budget: {
				min: parseNumber(budget?.min),
				max: parseNumber(budget?.max),
			},
			propertyTypes: sanitizeStringArray(propertyTypes),
			bhk: sanitizeStringArray(bhk),
			furnishingType: sanitizeStringArray(furnishingType),
			frequency: frequency || 'instant',
			notificationChannels: {
				email: notificationChannels?.email ?? true,
				sms: notificationChannels?.sms ?? false,
				push: notificationChannels?.push ?? true,
				whatsapp: notificationChannels?.whatsapp ?? false,
			},
		})

		const matchCount = await Property.countDocuments(
			buildPropertyFiltersFromAlert(alert),
		)

		return res.status(201).json({
			success: true,
			message: 'Alert created successfully',
			data: {
				alert: { ...alert.toObject(), matchCount },
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to create alert',
		})
	}
}

export const updateAlertStatus = async (req, res) => {
	try {
		const { alertId } = req.params
		const { status } = req.body || {}

		if (!['active', 'paused'].includes(status)) {
			return res.status(400).json({
				success: false,
				message: 'Status must be active or paused',
			})
		}

		const alert = await PropertyAlert.findOneAndUpdate(
			{ _id: alertId, user: req.user._id },
			{ isActive: status === 'active', isPaused: status === 'paused' },
			{ new: true },
		)

		if (!alert) {
			return res.status(404).json({
				success: false,
				message: 'Alert not found',
			})
		}

		const matchCount = await Property.countDocuments(
			buildPropertyFiltersFromAlert(alert),
		)

		return res.status(200).json({
			success: true,
			message: 'Alert updated successfully',
			data: {
				alert: { ...alert.toObject(), matchCount },
			},
		})
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to update alert',
		})
	}
}
