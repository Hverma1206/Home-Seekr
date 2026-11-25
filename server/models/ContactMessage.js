import mongoose from 'mongoose'

// Messages sent from the /contact page
const contactMessageSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, maxlength: 100 },
		email: { type: String, required: true, lowercase: true, trim: true },
		message: { type: String, required: true, trim: true, maxlength: 2000 },
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
		status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new' },
	},
	{ timestamps: true },
)

export default mongoose.model('ContactMessage', contactMessageSchema)
