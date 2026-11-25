import mongoose from 'mongoose'

// Newsletter sign-ups from the site footer CTA
const subscriberSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, unique: true, lowercase: true, trim: true },
		source: { type: String, default: 'website' },
	},
	{ timestamps: true },
)

export default mongoose.model('Subscriber', subscriberSchema)
