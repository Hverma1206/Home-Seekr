import express from 'express'
import {
	createProperty,
	getProperties,
	getPropertiesByCity,
	getTrendingProperties,
	getPropertyDetails,
	toggleSaveProperty,
	getSavedProperties,
	getMyProperties,
	updateProperty,
	deleteProperty,
} from '../controllers/propertyController.js'
import { protect, requireVerifiedPhone } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.get('/', getProperties)
router.get('/trending', getTrendingProperties)
router.get('/city/:city', getPropertiesByCity)
router.get('/details/:propertyId', getPropertyDetails)

// Protected routes
router.post('/', protect, requireVerifiedPhone, createProperty)
router.get('/mine', protect, getMyProperties)
router.put('/:propertyId', protect, updateProperty)
router.delete('/:propertyId', protect, deleteProperty)
router.post('/:propertyId/save', protect, toggleSaveProperty)
router.get('/saved', protect, getSavedProperties)

export default router
