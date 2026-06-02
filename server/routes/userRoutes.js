import express from 'express'
import rateLimit from 'express-rate-limit'
import {
	sendOTP,
	verifyOTP,
	resendOTP,
	getCurrentUser,
} from '../controllers/userController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// Rate limiting for OTP endpoints
const otpLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 requests per windowMs
	message: 'Too many OTP requests from this IP, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
})

const verifyLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // Limit each IP to 10 verification attempts per minute
	message: 'Too many verification attempts, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
})

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/send-otp', otpLimiter, sendOTP)

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and activate account
 * @access  Public
 */
router.post('/verify-otp', verifyLimiter, verifyOTP)

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/resend-otp', otpLimiter, resendOTP)

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', protect, getCurrentUser)

export default router
