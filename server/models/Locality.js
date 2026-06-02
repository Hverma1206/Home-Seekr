import mongoose from 'mongoose'

const priceTrendSchema = new mongoose.Schema({
	month: { type: String, required: true }, // e.g., "Jan 2023"
	averagePrice: { type: Number, required: true },
})

const reviewSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		rating: { type: Number, min: 1, max: 5 },
		comment: { type: String },
		category: {
			type: String,
			enum: ['Safety', 'Connectivity', 'Water Supply', 'Power Backup', 'Market Access'],
		},
	},
	{ timestamps: true }
)

const localitySchema = new mongoose.Schema(
	{
		// Basic info
		name: { type: String, required: true, trim: true, index: true },
		city: { type: String, required: true, trim: true },
		state: { type: String, required: true, trim: true },
		pincode: { type: String, default: '' },

		// Geolocation
		geo: {
			type: {
				type: String,
				enum: ['Point'],
				default: 'Point',
			},
			coordinates: { type: [Number], required: true },
		},
		coordinates: {
			lat: { type: Number },
			lng: { type: Number },
		},

		// Price Intelligence
		avgPricePerSqFt: { type: Number, required: true },
		priceRange: {
			min: Number,
			max: Number,
		},
		pricePerSqYard: Number,
		rentalPrice: Number,
		priceTrend: [priceTrendSchema],
		growthPercentage: { type: Number, default: 0 },
		sixMonthGrowth: { type: Number, default: 0 },
		yearGrowth: { type: Number, default: 0 },

		// Ratings
		ratings: {
			safety: { type: Number, default: 0 },
			connectivity: { type: Number, default: 0 },
			lifestyle: { type: Number, default: 0 },
			overall: { type: Number, default: 0 },
		},

		// Amenities
		amenities: {
			schools: { type: Number, default: 0 },
			hospitals: { type: Number, default: 0 },
			metro: { type: Boolean, default: false },
			markets: { type: Number, default: 0 },
			parks: { type: Number, default: 0 },
			malls: { type: Number, default: 0 },
			banks: { type: Number, default: 0 },
		},

		// Nearby Infrastructure (detailed)
		nearbyMetros: [
			{
				name: String,
				distance: Number,
			},
		],
		nearbyRailways: [
			{
				name: String,
				distance: Number,
			},
		],
		nearbySchools: [
			{
				name: String,
				type: String,
				distance: Number,
			},
		],
		nearbyHospitals: [
			{
				name: String,
				distance: Number,
			},
		],

		// Pros and Cons
		pros: [{ type: String }],
		cons: [{ type: String }],

		// Reviews
		reviews: [reviewSchema],

		// Description
		description: { type: String },
		overview: String,

		// Image
		image: { type: String, default: '' },

		// Property stats
		propertyStats: {
			totalProperties: { type: Number, default: 0 },
			residentialCount: { type: Number, default: 0 },
			commercialCount: { type: Number, default: 0 },
			forSaleCount: { type: Number, default: 0 },
			forRentCount: { type: Number, default: 0 },
		},

		// Similar localities
		neighboringLocalities: [{ type: String }],
		similarLocalities: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Locality',
			},
		],

		// Social proof
		reviewCount: { type: Number, default: 0 },
		averageRating: { type: Number, min: 0, max: 5, default: 0 },
		searchCount: { type: Number, default: 0 },
		isPopular: { type: Boolean, default: false },

		// Development status
		developmentStatus: {
			type: String,
			enum: ['developing', 'developed', 'mature', 'new'],
			default: 'developed',
		},

		// Popular societies
		popularSocieties: [String],

		// Status
		isActive: { type: Boolean, default: true },

		// Timestamps
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
)

// Indexes
localitySchema.index({ geo: '2dsphere' })
localitySchema.index({ city: 1, name: 1 }, { unique: true })
localitySchema.index({ city: 1, state: 1 })
localitySchema.index({ isPopular: 1, searchCount: -1 })
localitySchema.index({ 'avgPricePerSqFt': 1 })

const Locality = mongoose.model('Locality', localitySchema)

export default Locality
