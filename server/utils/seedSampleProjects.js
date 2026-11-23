import Project from '../models/Project.js'
import User from '../models/User.js'
import { buildSampleProjects } from '../data/sampleProjects.js'

let hasSeeded = false

export const seedSampleProjects = async () => {
  try {
    if (hasSeeded) {
      console.log('Projects already seeded in this process')
      return { inserted: 0, skipped: true }
    }

    const existingCount = await Project.countDocuments()
    if (existingCount > 0) {
      console.log(`Clearing ${existingCount} old projects for fresh seed...`)
      await Project.deleteMany({})
    }

    let builder = await User.findOne({ phoneNumber: '9800000002' })
    if (!builder) {
      console.log('Creating default builder for projects...')
      builder = await User.create({
        phoneNumber: '9800000002',
        firstName: 'Sample',
        lastName: 'Builder',
        role: 'builder',
        companyName: 'NextGen Builders',
        isBuilderVerified: true,
        isPhoneVerified: true,
        isActive: true,
      })
    }

    const samples = buildSampleProjects(builder._id)
    if (!samples || samples.length === 0) {
      console.error('No sample projects generated')
      return { inserted: 0, skipped: true }
    }

    const result = await Project.insertMany(samples)
    hasSeeded = true
    console.log(`Successfully seeded ${result.length} sample projects`)
    return { inserted: result.length, skipped: false }
  } catch (error) {
    console.error('Error seeding projects:', error.message)
    return { inserted: 0, error: error.message }
  }
}
