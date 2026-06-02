import Locality from '../models/Locality.js'
import Property from '../models/Property.js'
import Review from '../models/Review.js'

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

// Get locality details with comprehensive insights
export const getLocalityInsights = async (req, res, next) => {
	try {
		const { city, localityName } = req.query

		if (!city || !localityName) {
			return res
				.status(400)
				.json({ message: 'City and Locality name are required' })
		}

		let locality = await Locality.findOne({
			city: new RegExp(`^${city}$`, 'i'),
			name: new RegExp(`^${localityName}$`, 'i'),
		})

		if (!locality) {
			return res.status(404).json({ message: 'Locality insights not found' })
		}

		// Get property stats
		const propertyStats = await Property.aggregate([
			{
				$match: {
					city: locality.city,
					locality: locality.name,
					status: 'active',
				},
			},
			{
				$group: {
					_id: null,
					totalProperties: { $sum: 1 },
					avgPrice: { $avg: '$priceNumeric' },
					minPrice: { $min: '$priceNumeric' },
					maxPrice: { $max: '$priceNumeric' },
				},
			},
		])

		// Get recent reviews
		const reviews = await Review.find({
			locality: locality._id,
			status: 'published',
		})
			.populate('user', 'firstName lastName profileImage')
			.sort({ isFeatured: -1, createdAt: -1 })
			.limit(5)

		// Increment search count
		await Locality.updateOne(
			{ _id: locality._id },
			{ $inc: { searchCount: 1 } }
		)

		res.status(200).json({
			locality,
			propertyStats: propertyStats[0] || {},
			reviews,
		})
	} catch (error) {
		next(error)
	}
}

// Get localities by city
export const getLocalitiesByCity = async (req, res, next) => {
	try {
		const { city } = req.params
		const { limit = 50, sort = 'popular' } = req.query

		const filters = { city: new RegExp(`^${city}$`, 'i'), isActive: true }

		let sortOption = { searchCount: -1 }
		if (sort === 'price_low') sortOption = { avgPricePerSqFt: 1 }
		if (sort === 'price_high') sortOption = { avgPricePerSqFt: -1 }
		if (sort === 'growth') sortOption = { sixMonthGrowth: -1 }
		if (sort === 'ratings') sortOption = { averageRating: -1 }

		const localities = await Locality.find(filters)
			.select(
				'name avgPricePerSqFt growthPercentage ratings amenities averageRating reviewCount image'
			)
			.sort(sortOption)
			.limit(Math.min(parseNumber(limit) || 50, 200))

		const total = await Locality.countDocuments(filters)

		res.status(200).json({
			city,
			localities,
			total,
		})
	} catch (error) {
		next(error)
	}
}

// Get similar/nearby localities
export const getSimilarLocalities = async (req, res, next) => {
	try {
		const { city, localityName } = req.query

		const locality = await Locality.findOne({
			city: new RegExp(`^${city}$`, 'i'),
			name: new RegExp(`^${localityName}$`, 'i'),
		})

		if (!locality || !locality.neighboringLocalities || locality.neighboringLocalities.length === 0) {
			// Fallback: find localities in the same city with similar price range
			const fallbackLocalities = await Locality.find({
				city: new RegExp(`^${city}$`, 'i'),
				name: { $ne: localityName },
				avgPricePerSqFt: {
					$gte: (locality?.avgPricePerSqFt || 0) * 0.8,
					$lte: (locality?.avgPricePerSqFt || 0) * 1.2,
				},
			}).limit(10)
			return res.status(200).json(fallbackLocalities)
		}

		const neighbors = await Locality.find({
			city: new RegExp(`^${city}$`, 'i'),
			name: { $in: locality.neighboringLocalities },
		})

		res.status(200).json(neighbors)
	} catch (error) {
		next(error)
	}
}

// Get price trends
export const getPriceTrends = async (req, res, next) => {
	try {
		const { city, localityName } = req.params

		const locality = await Locality.findOne({
			city: new RegExp(`^${city}$`, 'i'),
			name: new RegExp(`^${localityName}$`, 'i'),
		})

		if (!locality) {
			return res.status(404).json({ message: 'Locality not found' })
		}

		const priceHistory = locality.priceTrend || []

		res.status(200).json({
			locality: locality.name,
			city: locality.city,
			currentAvgPrice: locality.avgPricePerSqFt,
			priceHistory,
			growthMetrics: {
				sixMonthGrowth: locality.sixMonthGrowth,
				yearGrowth: locality.yearGrowth,
			},
		})
	} catch (error) {
		next(error)
	}
}

// Get locality reviews
export const getLocalityReviews = async (req, res, next) => {
	try {
		const { city, localityName } = req.params
		const { limit = 20, page = 1 } = req.query

		const locality = await Locality.findOne({
			city: new RegExp(`^${city}$`, 'i'),
			name: new RegExp(`^${localityName}$`, 'i'),
		})

		if (!locality) {
			return res.status(404).json({ message: 'Locality not found' })
		}

		const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
		const parsedPage = Math.max(parseNumber(page) || 1, 1)
		const skip = (parsedPage - 1) * parsedLimit

		const reviews = await Review.find({
			locality: locality._id,
			status: 'published',
		})
			.populate('user', 'firstName lastName profileImage')
			.skip(skip)
			.limit(parsedLimit)
			.sort({ isFeatured: -1, createdAt: -1 })

		const total = await Review.countDocuments({
			locality: locality._id,
			status: 'published',
		})

		res.status(200).json({
			locality: locality.name,
			reviews,
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

// Get popular localities
export const getPopularLocalities = async (req, res, next) => {
	try {
		const { city, limit = 10 } = req.query

		const filters = { isActive: true }
		if (city) filters.city = new RegExp(`^${city}$`, 'i')

		const popular = await Locality.find(filters)
			.select(
				'name city avgPricePerSqFt averageRating reviewCount searchCount image'
			)
			.sort({ searchCount: -1, averageRating: -1 })
			.limit(Math.min(parseNumber(limit) || 10, 50))

		res.status(200).json({
			popularLocalities: popular,
		})
	} catch (error) {
		next(error)
	}
}

// Search localities
export const searchLocalities = async (req, res, next) => {
	try {
		const { q, city } = req.query

		if (!q || q.length < 2) {
			return res
				.status(400)
				.json({ message: 'Search query must be at least 2 characters' })
		}

		const filters = {
			isActive: true,
			name: new RegExp(q, 'i'),
		}
		if (city) filters.city = new RegExp(`^${city}$`, 'i')

		const localities = await Locality.find(filters)
			.select('name city avgPricePerSqFt averageRating')
			.limit(20)

		res.status(200).json({
			results: localities,
		})
	} catch (error) {
		next(error)
	}
}

// Get recommendations based on user preferences
export const getRecommendations = async (req, res, next) => {
	try {
		const { city, locality, propertyId } = req.query

		// 1. Similar Properties in same locality or price range
		let query = { status: 'active' }
		if (city) query.city = new RegExp(`^${city}$`, 'i')

		if (propertyId) {
			const currentProp = await Property.findById(propertyId)
			if (currentProp) {
				query._id = { $ne: propertyId }
				// Same locality or similar price (+/- 20%)
				query.$or = [
					{ locality: currentProp.locality },
					{
						priceNumeric: {
							$gte: currentProp.priceNumeric * 0.8,
							$lte: currentProp.priceNumeric * 1.2,
						},
					},
				]
			}
		} else if (locality) {
			query.locality = new RegExp(`^${locality}$`, 'i')
		}

		const recommendedProperties = await Property.find(query)
			.sort({ views: -1 })
			.limit(10)

		res.status(200).json({
			properties: recommendedProperties,
			trending: recommendedProperties.slice(0, 3),
		})
	} catch (error) {
		next(error)
	}
}
