import Property from '../models/Property.js'
import Locality from '../models/Locality.js'
import Wishlist from '../models/Wishlist.js'
import Lead from '../models/Lead.js'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
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
		filters.propertyCategory = query.propertyCategory
	}
	if (query.selectedType) {
		filters.selectedType = query.selectedType
	}
	if (query.bhk || query.bhkNumeric) {
		filters.bhkNumeric = parseNumber(query.bhk || query.bhkNumeric)
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

export const createProperty = async (req, res, next) => {
  try {
    const property = await Property.create(req.body)
    res.status(201).json({ message: 'Property saved successfully', property })
  } catch (error) {
    next(error)
  }
}

export const getProperties = async (req, res, next) => {
  try {
    const { lat, lng, radiusKm, limit, page } = req.query
    const filters = buildFilters(req.query)
    const parsedRadius = parseNumber(radiusKm)
    const radiusMeters = parsedRadius !== null ? parsedRadius * 1000 : 25000
    const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
    const parsedPage = Math.max(parseNumber(page) || 1, 1)
    const skip = (parsedPage - 1) * parsedLimit

    const hasCoords = lat !== undefined && lng !== undefined
      && parseNumber(lat) !== null && parseNumber(lng) !== null

    let properties = []
    let usedGeo = false

    if (hasCoords) {
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
        .limit(parsedLimit)
        .lean()
    }

    if (!hasCoords || properties.length < parsedLimit) {
      const remaining = parsedLimit - properties.length
      const excludeIds = properties.map((property) => property._id)
      const fallbackQuery = { ...filters }

      if (excludeIds.length) {
        fallbackQuery._id = { $nin: excludeIds }
      }

      const fallback = await Property.find(fallbackQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(remaining)
        .lean()

      properties = [...properties, ...fallback]
    }

    const total = await Property.countDocuments(filters)
    const locationSource = properties[0]

    res.status(200).json({
      properties,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
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
		const { city, limit = 50, lookingTo } = req.query

		const filters = { status: 'active', city: new RegExp(`^${city}$`, 'i') }
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
		if (city) filters.city = new RegExp(`^${city}$`, 'i')

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
			.populate('postedBy', 'firstName lastName phoneNumber profileImage')
			.populate('brokerAssociated', 'companyName phoneNumber')

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

		res.status(200).json({
			property,
			similarProperties: similar,
			localityInsights: locality,
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

// Contact property owner (create lead)
export const contactPropertyOwner = async (req, res, next) => {
	try {
		const { propertyId } = req.params
		const { message, contactType } = req.body
		const buyerId = req.user._id

		const property = await Property.findById(propertyId)
		if (!property) {
			return res.status(404).json({ message: 'Property not found' })
		}

		// Create lead
		const lead = await Lead.create({
			property: propertyId,
			buyer: buyerId,
			owner: property.postedBy,
			broker: property.brokerAssociated,
			buyerName: req.user.firstName,
			buyerPhone: req.user.phoneNumber,
			buyerEmail: req.user.email,
			contactRequests: [
				{
					type: contactType || 'phone_request',
					requestedAt: new Date(),
				},
			],
			notes: message,
		})

		// Update property contact count
		await Property.updateOne(
			{ _id: propertyId },
			{ $inc: { contactsMade: 1 } }
		)

		res.status(201).json({
			message: 'Your inquiry has been sent to the owner',
			lead,
		})
	} catch (error) {
		next(error)
	}
}
