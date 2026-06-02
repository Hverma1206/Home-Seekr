import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			set: (value) => {
				if (typeof value !== 'string') {
					return undefined
				}

				const normalizedEmail = value.trim().toLowerCase()
				return normalizedEmail || undefined
			},
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
		profileImage: {
			type: String,
			default: '',
		},
		bio: {
			type: String,
			default: '',
		},
		// Role and verification
		role: {
			type: String,
			enum: ['buyer', 'owner', 'broker', 'builder', 'admin'],
			default: 'buyer',
		},
		isBrokerVerified: {
			type: Boolean,
			default: false,
		},
		isBuilderVerified: {
			type: Boolean,
			default: false,
		},
		brokerLicense: {
			type: String,
			default: '',
		},
		// Location & Preferences
		currentLocation: {
			city: { type: String, default: '' },
			state: { type: String, default: '' },
			latitude: { type: Number, default: null },
			longitude: { type: Number, default: null },
			updatedAt: { type: Date, default: Date.now },
		},
		preferredCities: {
			type: [String],
			default: [],
		},
		preferredLocalities: {
			type: [String],
			default: [],
		},
		searchPreferences: {
			propertyType: { type: [String], default: [] }, // buy, rent, pg, commercial, projects
			budget: {
				min: { type: Number, default: null },
				max: { type: Number, default: null },
			},
			bhkRange: { type: [String], default: [] },
			furnishing: { type: [String], default: [] },
		},
		// For Brokers/Builders
		companyName: { type: String, default: '' },
		companyLogo: { type: String, default: '' },
		companyWebsite: { type: String, default: '' },
		teamMembers: { type: [String], default: [] },
		brokerTeamSize: { type: Number, default: 0 },
		// Subscription (for premium features)
		subscriptionPlan: {
			type: String,
			enum: ['free', 'basic', 'pro', 'enterprise'],
			default: 'free',
		},
		subscriptionExpiresAt: {
			type: Date,
			default: null,
		},
		// Admin fields
		isAdmin: {
			type: Boolean,
			default: false,
		},
		adminPrivileges: {
			canModerateListings: Boolean,
			canBanUsers: Boolean,
			canManageAdmins: Boolean,
			canViewAnalytics: Boolean,
		},
		// Account status
		isActive: {
			type: Boolean,
			default: false,
		},
		isBanned: {
			type: Boolean,
			default: false,
		},
		banReason: {
			type: String,
			default: '',
		},
		// Notification preferences
		notificationSettings: {
			emailNotifications: { type: Boolean, default: true },
			smsNotifications: { type: Boolean, default: true },
			pushNotifications: { type: Boolean, default: true },
			alertNotifications: { type: Boolean, default: true },
		},
		// Stats
		totalListings: { type: Number, default: 0 },
		totalLeads: { type: Number, default: 0 },
		savedPropertiesCount: { type: Number, default: 0 },
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

userSchema.index(
	{ email: 1 },
	{
		unique: true,
		partialFilterExpression: {
			email: { $type: 'string' },
		},
	},
)

userSchema.index({ role: 1 })
userSchema.index({ 'currentLocation.city': 1, role: 1 })
userSchema.index({ isBanned: 1 })
userSchema.index({ preferredCities: 1 })

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
