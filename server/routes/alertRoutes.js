import express from 'express'
import {
	createAlert,
	getAlerts,
	updateAlertStatus,
} from '../controllers/alertController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getAlerts)
router.post('/', protect, createAlert)
router.put('/:alertId/status', protect, updateAlertStatus)

export default router
