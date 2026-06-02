import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
	{
		// User who posted review
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'User is required'],
		},

		// What is being reviewed
		reviewType: {
			type: String,
			enum: ['locality', 'society', 'builder', 'property'],
			required: [true, 'Review type is required'],
		},

		// References
		locality: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Locality',
			default: null,
		},
		property: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Property',
			default: null,
		},
		builder: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},

		// Review content
		title: String,
		description: {
			type: String,
			required: [true, 'Review description is required'],
		},

		// Ratings
		overallRating: {
			type: Number,
			required: [true, 'Overall rating is required'],
			min: 1,
			max: 5,
		},
		categoryRatings: {
			safety: { type: Number, min: 1, max: 5, default: null },
			connectivity: { type: Number, min: 1, max: 5, default: null },
			waterSupply: { type: Number, min: 1, max: 5, default: null },
			powerBackup: { type: Number, min: 1, max: 5, default: null },
			marketAccess: { type: Number, min: 1, max: 5, default: null },
			quality: { type: Number, min: 1, max: 5, default: null },
			constructionQuality: { type: Number, min: 1, max: 5, default: null },
		},

		// Review tags
		tags: [String], // e.g., ['peaceful', 'family-friendly', 'expensive']

		// Media
		images: [String],
		videos: [String],

		// Experience
		yearsOfExperience: Number, // How long user has lived/worked there

		// Engagement
		helpfulCount: {
			type: Number,
			default: 0,
		},
		unhelpfulCount: {
			type: Number,
			default: 0,
		},
		commentCount: {
			type: Number,
			default: 0,
		},

		// Comments on this review
		comments: [
			{
				user: mongoose.Schema.Types.ObjectId,
				comment: String,
				createdAt: { type: Date, default: Date.now },
			},
		],

		// Moderation
		isVerified: {
			type: Boolean,
			default: false,
		},
		isFeatured: {
			type: Boolean,
			default: false,
		},
		isApproved: {
			type: Boolean,
			default: true,
		},
		isReported: {
			type: Boolean,
			default: false,
		},
		reportReason: String,

		// Status
		status: {
			type: String,
			enum: ['draft', 'published', 'archived'],
			default: 'published',
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
reviewSchema.index({ user: 1, createdAt: -1 })
reviewSchema.index({ reviewType: 1, locality: 1 })
reviewSchema.index({ reviewType: 1, builder: 1 })
reviewSchema.index({ overallRating: 1 })
reviewSchema.index({ helpfulCount: -1 })
reviewSchema.index({ isFeatured: 1, createdAt: -1 })

export default mongoose.model('Review', reviewSchema)
