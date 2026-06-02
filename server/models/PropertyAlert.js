import mongoose from 'mongoose'

const alertSchema = new mongoose.Schema(
	{
		// User who created the alert
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'User is required'],
		},

		// Alert criteria
		alertType: {
			type: String,
			enum: ['buy', 'rent', 'pg', 'commercial', 'project'],
			default: 'buy',
		},

		// Location
		cities: {
			type: [String],
			required: [true, 'At least one city is required'],
		},
		localities: [String],

		// Price filters
		budget: {
			min: Number,
			max: Number,
		},

		// Property type filters
		propertyTypes: [String],
		bhk: [String],
		furnishingType: [String],

		// Additional filters
		amenities: [String],
		minArea: Number,
		maxArea: Number,
		minAge: Number,
		maxAge: Number,

		// Possession status
		possessionStatus: [String],

		// Posted by
		listedBy: {
			type: [String],
			enum: ['owner', 'broker', 'builder'],
			default: ['owner', 'broker', 'builder'],
		},

		// Notification settings
		notificationChannels: {
			email: { type: Boolean, default: true },
			sms: { type: Boolean, default: false },
			push: { type: Boolean, default: true },
			whatsapp: { type: Boolean, default: false },
		},

		// Frequency
		frequency: {
			type: String,
			enum: ['instant', 'daily', 'weekly'],
			default: 'instant',
		},

		// Matching properties
		matchedProperties: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: 'Property',
			default: [],
		},
		totalMatches: {
			type: Number,
			default: 0,
		},

		// Engagement
		notificationsSent: {
			type: Number,
			default: 0,
		},
		propertiesViewed: {
			type: Number,
			default: 0,
		},
		propertiesSaved: {
			type: Number,
			default: 0,
		},
		contactsMade: {
			type: Number,
			default: 0,
		},

		// Status
		isActive: {
			type: Boolean,
			default: true,
		},
		isPaused: {
			type: Boolean,
			default: false,
		},

		// Last notification sent
		lastNotificationAt: Date,
		lastMatches: [
			{
				propertyId: mongoose.Schema.Types.ObjectId,
				matchedAt: Date,
				notifiedAt: Date,
			},
		],

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
alertSchema.index({ user: 1, isActive: 1 })
alertSchema.index({ cities: 1, alertType: 1 })
alertSchema.index({ lastNotificationAt: 1 })

export default mongoose.model('PropertyAlert', alertSchema)
