import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './dbconnect.js'
import User from './models/User.js'
import Property from './models/Property.js'
import healthRoutes from './routes/healthRoutes.js'
import propertyRoutes from './routes/propertyRoutes.js'
import userRoutes from './routes/userRoutes.js'
import userProfileRoutes from './routes/userProfileRoutes.js'
import localityRoutes from './routes/localityRoutes.js'
import leadRoutes from './routes/leadRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import alertRoutes from './routes/alertRoutes.js'
import siteRoutes from './routes/siteRoutes.js'
import societyRoutes from './routes/societyRoutes.js'
import uploadRoutes, { UPLOAD_DIR } from './routes/uploadRoutes.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
import { seedSampleProperties } from './utils/seedSampleData.js'
import { seedLocalities } from './utils/seedLocalities.js'
import { seedSampleProjects } from './utils/seedSampleProjects.js'


dotenv.config()

const app = express()
const PORT = process.env.PORT

// Only our own frontend may call the API from a browser. CLIENT_ORIGIN can list several, comma-separated.
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()) }))
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/auth', userRoutes)
app.use('/api/user', userProfileRoutes)
app.use('/api/locality', localityRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/site', siteRoutes)
app.use('/api/societies', societyRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/uploads', express.static(UPLOAD_DIR))

app.use(notFound)
app.use(errorHandler)

const startServer = async () => {
	await connectDB()
	await User.updateMany(
		{
			$or: [{ email: null }, { email: '' }],
		},
		{
			$unset: { email: '' },
		},
	)
	await User.syncIndexes()
	await Property.syncIndexes()
	const seedResult = await seedSampleProperties()
	if (seedResult.inserted) {
		console.log(`Seeded ${seedResult.inserted} sample properties`)
	} else if (seedResult.error) {
		console.error('Property seeding error:', seedResult.error)
	}

	const localitySeedResult = await seedLocalities()
	if (localitySeedResult.inserted) {
		console.log(`Seeded ${localitySeedResult.inserted} sample localities`)
	} else if (localitySeedResult.error) {
		console.error('Locality seeding error:', localitySeedResult.error)
	}

	const projectSeedResult = await seedSampleProjects()
	if (projectSeedResult.inserted) {
		console.log(`Seeded ${projectSeedResult.inserted} sample projects`)
	} else if (projectSeedResult.error) {
		console.error('Project seeding error:', projectSeedResult.error)
	}

	app.listen(PORT, () => {
		console.log(`running on ${PORT}`)
	})
}

startServer().catch((error) => {
	console.error('Failed to start server:', error.message)
	process.exit(1)
})
