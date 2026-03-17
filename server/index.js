import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './dbconnect.js'
import healthRoutes from './routes/healthRoutes.js'
import propertyRoutes from './routes/propertyRoutes.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/properties', propertyRoutes)

app.use(notFound)
app.use(errorHandler)

const startServer = async () => {
	await connectDB()

	app.listen(PORT, () => {
		console.log(`running on ${PORT}`)
	})
}

startServer().catch((error) => {
	console.error('Failed to start server:', error.message)
	process.exit(1)
})
