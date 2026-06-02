import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema(
	{
		// Core relationships
		property: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Property',
			required: [true, 'Property is required'],
		},
		buyer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Buyer is required'],
		},
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Owner is required'],
		},
		broker: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		builder: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},

		// Lead Status
		status: {
			type: String,
			enum: [
				'new',
				'contacted',
				'interested',
				'scheduled_visit',
				'visited',
				'negotiating',
				'offered',
				'closed_won',
				'closed_lost',
			],
			default: 'new',
		},

		// Contact details from buyer
		buyerName: String,
		buyerPhone: String,
		buyerEmail: String,

		// Lead source
		source: {
			type: String,
			enum: ['website', 'mobile_app', 'broker_direct', 'builder_direct', 'referral'],
			default: 'website',
		},

		// Lead actions/interactions
		contactRequests: [
			{
				type: {
					type: String,
					enum: ['phone_request', 'callback_request', 'email_inquiry'],
				},
				requestedAt: Date,
				respondedAt: Date,
				responseTime: Number, // in minutes
			},
		],

		visitSchedules: [
			{
				requestedAt: Date,
				scheduledFor: Date,
				status: {
					type: String,
					enum: ['pending', 'confirmed', 'visited', 'cancelled'],
					default: 'pending',
				},
				notes: String,
				visitedAt: Date,
			},
		],

		// Communication
		notes: String,
		tags: [String],
		followupNotes: [
			{
				note: String,
				createdBy: mongoose.Schema.Types.ObjectId,
				createdAt: { type: Date, default: Date.now },
			},
		],

		// Lead quality
		isQualified: {
			type: Boolean,
			default: false,
		},
		qualifiedReason: String,

		// Engagement metrics
		views: {
			type: Number,
			default: 0,
		},
		lastContactedAt: Date,
		nextFollowupAt: Date,

		// Conversion info
		closedAt: Date,
		closedReason: String,
		dealAmount: Number,

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

// Indexes for efficient querying
leadSchema.index({ property: 1, buyer: 1 }, { unique: true })
leadSchema.index({ owner: 1, status: 1 })
leadSchema.index({ broker: 1, status: 1 })
leadSchema.index({ buyer: 1, status: 1 })
leadSchema.index({ status: 1, createdAt: -1 })
leadSchema.index({ nextFollowupAt: 1 })

export default mongoose.model('Lead', leadSchema)
