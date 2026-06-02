import mongoose from 'mongoose'

const wishlistSchema = new mongoose.Schema(
	{
		// User who owns the wishlist
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'User is required'],
		},

		// Property being saved
		property: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Property',
			required: [true, 'Property is required'],
		},

		// Collection/List
		listName: {
			type: String,
			default: 'Default',
		},
		listDescription: String,

		// Status
		status: {
			type: String,
			enum: ['active', 'removed', 'archived'],
			default: 'active',
		},

		// Notes from user
		notes: String,

		// Personal rating
		userRating: {
			type: Number,
			min: 1,
			max: 5,
			default: null,
		},

		// Price at time of saving
		savedPrice: Number,

		// Comparison
		isInComparison: {
			type: Boolean,
			default: false,
		},
		comparisonGroup: String,

		// Timestamps
		savedAt: {
			type: Date,
			default: Date.now,
		},
		removedAt: Date,
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

// Compound unique index
wishlistSchema.index({ user: 1, property: 1 }, { unique: true })
wishlistSchema.index({ user: 1, status: 1 })
wishlistSchema.index({ user: 1, listName: 1 })
wishlistSchema.index({ isInComparison: 1, comparisonGroup: 1 })

export default mongoose.model('Wishlist', wishlistSchema)
