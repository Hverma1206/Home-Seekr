import mongoose from 'mongoose'

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
	console.log('db connected')
})

mongoose.connection.on('error', (err) => {
	console.error('db error', err.message)
})

mongoose.connection.on('disconnected', () => {
	console.log('db disconnected')
})

export const connectDB = async () => {
	const MONGO_URI = process.env.MONGO_URI

	if (!MONGO_URI) {
		throw new Error('missing URI')
	}

	try {
		await mongoose.connect(MONGO_URI, {
			serverSelectionTimeoutMS: 10000,
			socketTimeoutMS: 45000,
			maxPoolSize: 10,
			minPoolSize: 2,
			retryWrites: true,
			w: 'majority',
		})
		console.log('MongoDB connected successfully')
	} catch (error) {
		console.error(' MongoDB connection failed:', error.message)
		throw error
	}
}

export const disconnectDB = async () => {
	try {
		await mongoose.disconnect()
		console.log('✓ MongoDB disconnected')
	} catch (error) {
		console.error('✗ Error disconnecting MongoDB:', error.message)
		throw error
	}
}

export default mongoose
