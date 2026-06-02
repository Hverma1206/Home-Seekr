import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema(
	{
		// Basic Info
		name: {
			type: String,
			required: [true, 'Project name is required'],
			trim: true,
		},
		description: String,
		overview: String,

		// Builder/Developer
		builder: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Builder is required'],
		},
		developerName: String,
		developerLogo: String,

		// Location
		city: {
			type: String,
			required: [true, 'City is required'],
			trim: true,
		},
		state: {
			type: String,
			required: [true, 'State is required'],
			trim: true,
		},
		locality: {
			type: String,
			required: [true, 'Locality is required'],
			trim: true,
		},
		address: String,
		pincode: String,

		// Geolocation
		geo: {
			type: {
				type: String,
				enum: ['Point'],
				default: 'Point',
			},
			coordinates: { type: [Number], default: undefined },
		},

		// Project Details
		projectType: {
			type: String,
			enum: ['residential', 'commercial', 'mixed_use'],
			default: 'residential',
		},
		propertyType: {
			type: [String],
			enum: ['apartment', 'villa', 'plot', 'builder_floor'],
			default: ['apartment'],
		},

		// Inventory & Status
		totalUnits: Number,
		availableUnits: Number,
		soldUnits: Number,
		status: {
			type: String,
			enum: ['pre_launch', 'ongoing', 'completed', 'delayed'],
			default: 'ongoing',
		},

		// Timeline
		launchDate: Date,
		possessionDate: Date,
		completionDate: Date,
		expectedCompletionDate: Date,
		constructionStartedAt: Date,

		// Pricing
		priceRange: {
			min: Number,
			max: Number,
		},
		pricePerSqft: {
			min: Number,
			max: Number,
		},
		avgPrice: Number,

		// Configurations/Floor Plans
		configurations: [
			{
				type: String, // e.g., "1 BHK", "2 BHK"
				minArea: Number,
				maxArea: Number,
				priceMin: Number,
				priceMax: Number,
				unitCount: Number,
			},
		],
		floorPlans: [
			{
				name: String,
				type: String,
				image: String,
				area: Number,
				price: Number,
			},
		],

		// Amenities
		amenities: [String],
		highlights: [String],

		// Images & Media
		images: [String],
		thumbnail: String,
		brochure: String,
		virtualTour: String,

		// Towers/Phases
		towers: [
			{
				name: String,
				floors: Number,
				unitsPerFloor: Number,
				status: String,
				possessionDate: Date,
			},
		],
		phases: [
			{
				name: String,
				startDate: Date,
				completionDate: Date,
				unitsCount: Number,
			},
		],

		// Specifications
		specifications: {
			superBuiltupArea: String,
			carpetArea: String,
			totalLandArea: String,
			greenbeltArea: String,
			parkingRatio: String,
			floorsInTower: Number,
		},

		// Certifications & Approvals
		approvals: [String],
		certifications: [String],
		rera: String,

		// Contact & Team
		contactPerson: String,
		contactEmail: String,
		contactPhone: String,
		salesTeamSize: Number,

		// Booking & Payment
		registrationAmount: Number,
		bookingAmount: Number,
		paymentPlan: String,
		paymentSchedule: [
			{
				milestone: String,
				percentage: Number,
				dueDate: Date,
			},
		],

		// Engagement
		views: { type: Number, default: 0 },
		enquiries: { type: Number, default: 0 },
		bookings: { type: Number, default: 0 },
		averageRating: { type: Number, min: 0, max: 5, default: 0 },
		reviewCount: { type: Number, default: 0 },

		// Similar projects
		similarProjects: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Project',
			},
		],

		// SEO
		slug: String,
		keywords: [String],

		// Status
		isActive: {
			type: Boolean,
			default: true,
		},
		isFeatured: {
			type: Boolean,
			default: false,
		},

		// Timestamps
		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true }
)

// Indexes
projectSchema.index({ geo: '2dsphere' })
projectSchema.index({ builder: 1 })
projectSchema.index({ city: 1, locality: 1 })
projectSchema.index({ status: 1, isActive: 1 })
projectSchema.index({ isFeatured: 1, createdAt: -1 })
projectSchema.index({ 'priceRange.min': 1, 'priceRange.max': 1 })

export default mongoose.model('Project', projectSchema)
