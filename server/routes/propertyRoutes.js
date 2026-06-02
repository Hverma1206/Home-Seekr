import express from 'express'
import {
	createProperty,
	getProperties,
	getPropertiesByCity,
	getTrendingProperties,
	getPropertyDetails,
	toggleSaveProperty,
	getSavedProperties,
	contactPropertyOwner,
} from '../controllers/propertyController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.get('/', getProperties)
router.get('/trending', getTrendingProperties)
router.get('/city/:city', getPropertiesByCity)
router.get('/details/:propertyId', getPropertyDetails)

// Protected routes
router.post('/', protect, createProperty)
router.post('/:propertyId/save', protect, toggleSaveProperty)
router.get('/saved', protect, getSavedProperties)
router.post('/:propertyId/contact', protect, contactPropertyOwner)

export default router
