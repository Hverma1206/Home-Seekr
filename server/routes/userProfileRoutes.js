import express from 'express'
import {
	getPersonalizedFeed,
	getUserPreferences,
	recordRecentSearch,
	updateProfile,
	updateUserPreferences,
} from '../controllers/userController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, updateProfile)

router.get('/preferences', protect, getUserPreferences)
router.put('/preferences', protect, updateUserPreferences)
router.post('/recent-searches', protect, recordRecentSearch)
router.get('/feed', protect, getPersonalizedFeed)

export default router
