import Property from '../models/Property.js'
import User from '../models/User.js'
import { buildSampleProperties } from '../data/sampleProperties.js'

let hasSeeded = false  // Track if we've already seeded this process

export const seedSampleProperties = async () => {
	try {
		// Only seed once per process to avoid repeated deletes
		if (hasSeeded) {
			console.log('✓ Properties already seeded in this process')
			return { inserted: 0, skipped: true }
		}

		const existingCount = await Property.countDocuments()
		
		// Always reseed on server start in development for fresh data
		if (existingCount > 0) {
			console.log(`🔄 Clearing ${existingCount} old properties for fresh seed...`)
			await Property.deleteMany({})
		}

		// Create or get a default user to post properties
		let defaultUser = await User.findOne({ phoneNumber: '9800000001' })
		if (!defaultUser) {
			console.log('👤 Creating default user for property posting...')
			defaultUser = await User.create({
				phoneNumber: '9800000001',
				firstName: 'Sample',
				lastName: 'Owner',
				role: 'owner',
				isPhoneVerified: true,
				isActive: true,
			})
		}

		console.log('🌱 Generating sample properties...')
		const samples = buildSampleProperties(defaultUser._id)
		
		if (!samples || samples.length === 0) {
			console.error('❌ No sample properties generated')
			return { inserted: 0, skipped: true }
		}

		console.log(`📝 Inserting ${samples.length} properties into database...`)
		const result = await Property.insertMany(samples)
		hasSeeded = true
		console.log(`✓ Successfully seeded ${result.length} sample properties`)
		return { inserted: result.length, skipped: false }
	} catch (error) {
		console.error('❌ Error seeding properties:', error.message)
		return { inserted: 0, error: error.message }
	}
}
