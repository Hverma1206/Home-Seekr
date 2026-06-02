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
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
import { seedSampleProperties } from './utils/seedSampleData.js'
import { seedLocalities } from './utils/seedLocalities.js'


dotenv.config()

const app = express()
const PORT = process.env.PORT

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/properties', propertyRoutes)
app.use('/api/auth', userRoutes)
app.use('/api/user', userProfileRoutes)
app.use('/api/locality', localityRoutes)
app.use('/api/leads', leadRoutes)

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

	app.listen(PORT, () => {
		console.log(`running on ${PORT}`)
	})
}

startServer().catch((error) => {
	console.error('Failed to start server:', error.message)
	process.exit(1)
})
