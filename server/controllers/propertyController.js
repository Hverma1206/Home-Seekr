import Property from '../models/Property.js'
import Locality from '../models/Locality.js'
import Wishlist from '../models/Wishlist.js'
import Review from '../models/Review.js'
import User from '../models/User.js'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

const parseNumericValue = (value) => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null
	}

	if (typeof value !== 'string') {
		return null
	}

	const cleaned = value.replace(/[^0-9.]/g, '')
	const parsed = Number(cleaned)
	return Number.isFinite(parsed) ? parsed : null
}

const parseBhkNumeric = (value) => {
	if (!value) return null
	const match = String(value).match(/\d+/)
	return match ? Number(match[0]) : null
}

const normalizeLookingTo = (lookingTo, propertyCategory) => {
	const category = typeof propertyCategory === 'string'
		? propertyCategory.toLowerCase().trim()
		: ''
	const raw = typeof lookingTo === 'string' ? lookingTo.toLowerCase().trim() : ''

	if (category === 'commercial') {
		if (raw === 'rent' || raw === 'rent / lease' || raw === 'lease') {
			return 'rent'
		}
		return 'buy'
	}

	if (raw === 'sell') return 'buy'
	if (raw === 'rent / lease') return 'rent'
	if (raw === 'pg') return 'pg'
	if (raw === 'buy' || raw === 'rent' || raw === 'commercial') return raw
	return 'buy'
}

const normalizeAreaSqFt = (plotAreaNumeric, plotAreaUnit) => {
	if (!Number.isFinite(plotAreaNumeric)) return null
	const unit = typeof plotAreaUnit === 'string' ? plotAreaUnit.toLowerCase() : ''

	if (unit.includes('sq.ft')) return plotAreaNumeric
	if (unit.includes('sq.yd') || unit.includes('sq.yard') || unit.includes('sq.yards')) {
		return plotAreaNumeric * 9
	}
	if (unit.includes('sq.m')) return plotAreaNumeric * 10.7639
	if (unit.includes('acre')) return plotAreaNumeric * 43560

	return plotAreaNumeric
}

const mapPostedByType = (role) => {
	if (role === 'owner' || role === 'broker' || role === 'builder') {
		return role
	}
	return 'owner'
}

const buildSortOption = (sortBy) => {
	const normalized = typeof sortBy === 'string' ? sortBy.toLowerCase() : ''
	if (normalized === 'price_asc') {
		return { priceNumeric: 1, createdAt: -1 }
	}
	if (normalized === 'price_desc') {
		return { priceNumeric: -1, createdAt: -1 }
	}
	if (normalized === 'newest') {
		return { createdAt: -1 }
	}
	return null
}

// Advanced filter builder with 99acres features
const buildFilters = (query) => {
	const filters = { status: 'active' }

	if (query.city) {
		filters.city = new RegExp(`^${escapeRegExp(query.city)}$`, 'i')
	}
	if (query.locality) {
		filters.locality = new RegExp(escapeRegExp(query.locality), 'i')
	}
	if (query.lookingTo) {
		filters.lookingTo = query.lookingTo
	}
	if (query.propertyCategory) {
		if (query.propertyCategory === 'residential') {
			filters.$or = [
				{ propertyCategory: 'residential' },
				{ propertyCategory: { $exists: false } },
				{ propertyCategory: null },
				{ propertyCategory: '' },
			]
		} else {
			filters.propertyCategory = query.propertyCategory
		}
	}
	if (query.selectedType) {
		filters.selectedType = new RegExp(escapeRegExp(query.selectedType), 'i')
	}
	if (query.bhk || query.bhkNumeric) {
		const bhk = parseNumber(query.bhk || query.bhkNumeric)
		// The largest option in the filter is "4+ BHK"
		filters.bhkNumeric = bhk >= 4 ? { $gte: 4 } : bhk
	}

	// Price filters
	const minPrice = parseNumber(query.minPrice)
	const maxPrice = parseNumber(query.maxPrice)
	if (minPrice !== null || maxPrice !== null) {
		filters.priceNumeric = {}
		if (minPrice !== null) {
			filters.priceNumeric.$gte = minPrice
		}
		if (maxPrice !== null) {
			filters.priceNumeric.$lte = maxPrice
		}
	}

	// Area filters
	const minArea = parseNumber(query.minArea)
	const maxArea = parseNumber(query.maxArea)
	if (minArea !== null || maxArea !== null) {
		filters.areaSqFt = {}
		if (minArea !== null) filters.areaSqFt.$gte = minArea
		if (maxArea !== null) filters.areaSqFt.$lte = maxArea
	}

	// Amenities filter
	if (query.amenities) {
		const amenitiesArray = Array.isArray(query.amenities)
			? query.amenities
			: [query.amenities]
		filters.amenities = { $in: amenitiesArray }
	}

	// Furnishing filter
	if (query.furnishing) {
		filters.furnishingType = query.furnishing
	}

	// Posted by filter
	if (query.postedBy) {
		filters.postedByType = query.postedBy
	}

	// Verified listings
	if (query.verifiedOnly === 'true') {
		filters.isVerified = true
	}

	return filters
}

// Fields only the server may set; a poster must not be able to self-verify, self-feature or fake stats
const PROTECTED_FIELDS = [
	'_id', 'postedBy', 'postedByType', 'role', 'dealer', 'brokerAssociated', 'status',
	'isVerified', 'verificationNotes', 'documentVerified', 'titleClear',
	'isFeatured', 'isHighlight', 'isPromoted', 'lastBoostedAt', 'boostCount', 'renewedAt',
	'views', 'enquiries', 'contactsMade', 'savedCount', 'averageRating', 'reviewCount',
	'createdAt', 'updatedAt', 'sourceName', 'sourceUrl',
]

const OWNER_STATUSES = ['active', 'sold', 'rented', 'inactive']

const isValidPoint = (geo) =>
	geo?.type === 'Point'
	&& Array.isArray(geo.coordinates)
	&& geo.coordinates.length === 2
	&& geo.coordinates.every(Number.isFinite)

// Cleans a client payload and fills the numeric/search fields derived from what the poster typed.
// Works for partial payloads (edits): a field is only derived when its source is present.
export const prepareListingData = (body = {}) => {
	const data = { ...body }
	for (const field of PROTECTED_FIELDS) delete data[field]
	if (!isValidPoint(data.geo)) delete data.geo

	if (typeof data.propertyCategory === 'string') {
		data.propertyCategory = data.propertyCategory.toLowerCase().trim()
	}
	if (data.lookingTo !== undefined) {
		data.lookingTo = normalizeLookingTo(data.lookingTo, data.propertyCategory)
	}
	if (data.price !== undefined && (data.priceNumeric === null || data.priceNumeric === undefined)) {
		data.priceNumeric = parseNumericValue(data.price)
	}
	if (data.plotArea !== undefined) {
		if (data.plotAreaNumeric === null || data.plotAreaNumeric === undefined) {
			data.plotAreaNumeric = parseNumericValue(data.plotArea)
		}
		if (data.areaSqFt === null || data.areaSqFt === undefined) {
			data.areaSqFt = normalizeAreaSqFt(data.plotAreaNumeric, data.plotAreaUnit)
		}
	}
	if (data.bhk || data.bedrooms) {
		if (data.bhkNumeric === null || data.bhkNumeric === undefined) {
			data.bhkNumeric = parseBhkNumeric(data.bhk || data.bedrooms)
		}
		if (!data.bhk && data.bhkNumeric) data.bhk = `${data.bhkNumeric} BHK`
	}
	if (!data.locationLabel && data.locality && data.city) {
		data.locationLabel = `${data.locality}, ${data.city}`
	}
	if (!data.title && data.selectedType && data.locality) {
		data.title = `${data.bhk ? `${data.bhk} ` : ''}${data.selectedType} in ${data.locality}`
	}
	// Optional enum fields arrive as '' when the poster skipped them; let the schema default apply instead
	if (data.furnishingType === '' || data.furnishingType === null) delete data.furnishingType
	if (data.security === '' || data.security === null) delete data.security
	if (Array.isArray(data.images)) {
		data.images = data.images.filter((url) => typeof url === 'string' && url).slice(0, 20)
		data.image = data.images[0] || ''
	}

	return data
}

export const createProperty = async (req, res, next) => {
  try {
	// The post flow asks "owner or broker" once; persist it so listings and leads carry the right role
	if (req.user.role === 'buyer' && ['owner', 'broker'].includes(req.body.role)) {
		await User.updateOne({ _id: req.user._id }, { role: req.body.role })
		req.user.role = req.body.role
	}

	const postedByType = mapPostedByType(req.user.role)
	const posterName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ')

	const property = await Property.create({
		...prepareListingData(req.body),
		postedBy: req.user._id,
		postedByType,
		role: postedByType,
		dealer: req.user.companyName || posterName,
	})
    res.status(201).json({ message: 'Property saved successfully', property })
  } catch (error) {
    next(error)
  }
}

// Listings posted by the logged-in user, in every status
export const getMyProperties = async (req, res, next) => {
	try {
		// shortcut: capped at 200 listings, add pagination when a broker outgrows that
		const properties = await Property.find({ postedBy: req.user._id })
			.sort({ createdAt: -1 })
			.limit(200)
			.lean()

		res.status(200).json({ properties })
	} catch (error) {
		next(error)
	}
}

// Edit a listing or change its status; only the poster can
export const updateProperty = async (req, res, next) => {
	try {
		const data = prepareListingData(req.body)

		if (req.body.status !== undefined) {
			if (!OWNER_STATUSES.includes(req.body.status)) {
				return res.status(400).json({ message: 'Invalid status' })
			}
			data.status = req.body.status
		}

		const property = await Property.findOneAndUpdate(
			{ _id: req.params.propertyId, postedBy: req.user._id },
			data,
			{ returnDocument: 'after', runValidators: true },
		)

		if (!property) {
			return res.status(404).json({ message: 'Listing not found' })
		}

		res.status(200).json({ message: 'Listing updated', property })
	} catch (error) {
		next(error)
	}
}

// Remove a listing for good; only the poster can. Its saved entries go with it, enquiries are kept for the poster's records
export const deleteProperty = async (req, res, next) => {
	try {
		const property = await Property.findOneAndDelete({
			_id: req.params.propertyId,
			postedBy: req.user._id,
		})

		if (!property) {
			return res.status(404).json({ message: 'Listing not found' })
		}

		await Wishlist.deleteMany({ property: property._id })
		res.status(200).json({ message: 'Listing deleted' })
	} catch (error) {
		next(error)
	}
}

export const getProperties = async (req, res, next) => {
  try {
		const { lat, lng, radiusKm, limit, page, sortBy } = req.query
    const filters = buildFilters(req.query)
		const sortOption = buildSortOption(sortBy)
    const parsedRadius = parseNumber(radiusKm)
    const radiusMeters = parsedRadius !== null ? parsedRadius * 1000 : 25000
    const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
    const parsedPage = Math.max(parseNumber(page) || 1, 1)
    const skip = (parsedPage - 1) * parsedLimit

    const hasCoords = lat !== undefined && lng !== undefined
      && parseNumber(lat) !== null && parseNumber(lng) !== null
		const hasLocationFilter = Boolean(req.query.city || req.query.locality)

    let properties = []
    let usedGeo = false

		if (hasCoords && !sortOption) {
      usedGeo = true
      const coords = [parseNumber(lng), parseNumber(lat)]
      const geoQuery = {
        ...filters,
        geo: {
          $near: {
            $geometry: { type: 'Point', coordinates: coords },
            $maxDistance: radiusMeters,
          },
        },
      }

      properties = await Property.find(geoQuery)
				.skip(skip)
				.limit(parsedLimit)
        .lean()
    }

		if (!usedGeo) {
			properties = await Property.find(filters)
				.sort(sortOption || { createdAt: -1 })
				.skip(skip)
				.limit(parsedLimit)
				.lean()
		} else if (!hasLocationFilter && properties.length < parsedLimit) {
			const remaining = parsedLimit - properties.length
			const excludeIds = properties.map((property) => property._id)
			const fallbackQuery = { ...filters }

			if (excludeIds.length) {
				fallbackQuery._id = { $nin: excludeIds }
			}

			const fallback = await Property.find(fallbackQuery)
				.sort(sortOption || { createdAt: -1 })
				.limit(remaining)
				.lean()

			properties = [...properties, ...fallback]
    }

    const total = await Property.countDocuments(filters)
    const locationSource = properties[0]
		const pages = Math.max(1, Math.ceil(total / parsedLimit))

    res.status(200).json({
      properties,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
				pages,
        usedGeo,
        location: locationSource
          ? {
              city: locationSource.city,
              locality: locationSource.locality,
              state: locationSource.state || '',
            }
          : null,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get properties by city (for location-aware dashboard)
export const getPropertiesByCity = async (req, res, next) => {
	try {
		const { city } = req.params
		const { limit = 50, lookingTo } = req.query

		const filters = { status: 'active', city: new RegExp(`^${escapeRegExp(String(city))}$`, 'i') }
		if (lookingTo) filters.lookingTo = lookingTo

		const properties = await Property.find(filters)
			.limit(Math.min(parseNumber(limit) || 50, 200))
			.sort({ isFeatured: -1, views: -1 })
			.lean()

		const count = await Property.countDocuments(filters)

		res.status(200).json({
			city,
			count,
			properties,
		})
	} catch (error) {
		next(error)
	}
}

// Get trending properties
export const getTrendingProperties = async (req, res, next) => {
	try {
		const { city, limit = 10 } = req.query

		const filters = { status: 'active' }
		if (city) filters.city = new RegExp(`^${escapeRegExp(String(city))}$`, 'i')

		const trendingProperties = await Property.find(filters)
			.sort({ views: -1, savedCount: -1 })
			.limit(Math.min(parseNumber(limit) || 10, 50))
			.lean()

		res.status(200).json({
			trending: trendingProperties,
		})
	} catch (error) {
		next(error)
	}
}

// Get single property with full details
export const getPropertyDetails = async (req, res, next) => {
	try {
		const { propertyId } = req.params

		const property = await Property.findByIdAndUpdate(
			propertyId,
			{ $inc: { views: 1 } },
			{ new: true }
		)
			// Phone numbers stay off this public endpoint; they are shared when a buyer sends an enquiry
			.populate('postedBy', 'firstName lastName profileImage companyName role')
			.populate('brokerAssociated', 'companyName')

		if (!property) {
			return res.status(404).json({ message: 'Property not found' })
		}

		// Get similar properties
		const similar = await Property.find({
			status: 'active',
			city: property.city,
			lookingTo: property.lookingTo,
			selectedType: property.selectedType,
			_id: { $ne: propertyId },
		})
			.limit(5)
			.lean()

		// Get locality insights
		const locality = await Locality.findOne({
			city: property.city,
			name: property.locality,
		})

		const reviews = await Review.find({
			reviewType: 'property',
			property: propertyId,
			status: 'published',
		})
			.populate('user', 'firstName lastName profileImage')
			.sort({ isFeatured: -1, createdAt: -1 })
			.limit(5)

		res.status(200).json({
			property,
			similarProperties: similar,
			localityInsights: locality,
			reviews,
		})
	} catch (error) {
		next(error)
	}
}

// Save/unsave property (wishlist)
export const toggleSaveProperty = async (req, res, next) => {
	try {
		const { propertyId } = req.params
		const userId = req.user._id

		let isSaved = false
		const existingWishlist = await Wishlist.findOne({
			user: userId,
			property: propertyId,
		})

		if (existingWishlist) {
			if (existingWishlist.status === 'active') {
				await Wishlist.updateOne(
					{ _id: existingWishlist._id },
					{ status: 'removed', removedAt: new Date() }
				)
				isSaved = false
			} else {
				await Wishlist.updateOne(
					{ _id: existingWishlist._id },
					{ status: 'active', removedAt: null }
				)
				isSaved = true
			}
		} else {
			await Wishlist.create({
				user: userId,
				property: propertyId,
			})
			isSaved = true
		}

		// Update property saved count
		const savedCount = await Wishlist.countDocuments({
			property: propertyId,
			status: 'active',
		})
		await Property.updateOne(
			{ _id: propertyId },
			{ savedCount }
		)

		res.status(200).json({
			message: isSaved ? 'Property saved' : 'Property removed from wishlist',
			isSaved,
		})
	} catch (error) {
		next(error)
	}
}

// Get user's saved properties
export const getSavedProperties = async (req, res, next) => {
	try {
		const userId = req.user._id
		const { limit = 20, page = 1 } = req.query

		const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
		const parsedPage = Math.max(parseNumber(page) || 1, 1)
		const skip = (parsedPage - 1) * parsedLimit

		const wishlist = await Wishlist.find({
			user: userId,
			status: 'active',
		})
			.populate('property')
			.skip(skip)
			.limit(parsedLimit)
			.sort({ savedAt: -1 })

		const total = await Wishlist.countDocuments({
			user: userId,
			status: 'active',
		})

		const properties = wishlist.map((w) => w.property).filter(Boolean)

		res.status(200).json({
			properties,
			meta: {
				total,
				page: parsedPage,
				limit: parsedLimit,
				pages: Math.ceil(total / parsedLimit),
			},
		})
	} catch (error) {
		next(error)
	}
}
