import express from 'express'
import rateLimit from 'express-rate-limit'
import { subscribe, sendContactMessage } from '../controllers/siteController.js'

const router = express.Router()

// Public forms: limit per IP so they can't be used to flood the database
const formLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: { success: false, message: 'Too many requests. Please try again in a few minutes.' },
	standardHeaders: true,
	legacyHeaders: false,
})

router.post('/subscribe', formLimiter, subscribe)
router.post('/contact', formLimiter, sendContactMessage)

export default router
