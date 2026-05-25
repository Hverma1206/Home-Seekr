import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true,
			trim: true,
			match: [
				/^[^\s@]+@[^\s@]+\.[^\s@]+$/,
				'Please provide a valid email address',
			],
		},
		password: {
			type: String,
			minlength: 6,
			select: false,
		},
		phoneNumber: {
			type: String,
			required: [true, 'Phone number is required'],
			unique: true,
			match: [
				/^[6-9]\d{9}$/,
				'Please provide a valid Indian mobile number',
			],
		},
		isPhoneVerified: {
			type: Boolean,
			default: false,
		},
		otpSessionId: {
			type: String,
			default: null,
		},
		otpSentAt: {
			type: Date,
			default: null,
		},
		otpAttempts: {
			type: Number,
			default: 0,
		},
		otpLastAttemptAt: {
			type: Date,
			default: null,
		},
		firstName: String,
		lastName: String,
		isActive: {
			type: Boolean,
			default: false,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
)

// Hash password before saving
userSchema.pre('save', async function () {
	if (!this.isModified('password') || !this.password) {
		return
	}

	const salt = await bcrypt.genSalt(10)
	this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password)
}

export default mongoose.model('User', userSchema)
