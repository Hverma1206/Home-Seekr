import express from 'express'
import rateLimit from 'express-rate-limit'
import {
	phoneLogin,
	getCurrentUser,
	registerWithEmail,
	loginWithEmail,
} from '../controllers/userController.js'
import {
	sendEmailOtp,
	verifyEmailOtp,
	verifyPhone,
} from '../controllers/verificationController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// Firebase already limits SMS sends; this caps the token exchange (a new number calls it twice: login, then signup details)
const phoneLoginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: { success: false, message: 'Too many login attempts. Please try again in a few minutes.' },
	standardHeaders: true,
	legacyHeaders: false,
})

const verifyLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10, // Limit each IP to 10 verification attempts per minute
	message: { success: false, message: 'Too many verification attempts. Please wait a minute.' },
	standardHeaders: true,
	legacyHeaders: false,
})

/**
 * @route   POST /api/auth/phone-login
 * @desc    Exchange a Firebase phone-auth ID token (Authorization: Bearer) for our 7-day JWT
 * @access  Public
 */
router.post('/phone-login', phoneLoginLimiter, phoneLogin)

// TEMPORARY email + password auth (until SMS OTP is integrated)
const passwordLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
	standardHeaders: true,
	legacyHeaders: false,
})

/**
 * @route   POST /api/auth/register
 * @desc    Sign up with email + password
 * @access  Public
 */
router.post('/register', passwordLimiter, registerWithEmail)

/**
 * @route   POST /api/auth/login
 * @desc    Log in with email + password
 * @access  Public
 */
router.post('/login', passwordLimiter, loginWithEmail)

// Verifying the logged-in account's email and phone (codes are also limited per account inside the controller)
const verificationSendLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: { success: false, message: 'Too many codes requested. Please try again in a few minutes.' },
	standardHeaders: true,
	legacyHeaders: false,
})

router.post('/email/send-otp', protect, verificationSendLimiter, sendEmailOtp)
router.post('/email/verify-otp', protect, verifyLimiter, verifyEmailOtp)
router.post('/phone/verify', protect, verifyLimiter, verifyPhone)

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', protect, getCurrentUser)

export default router
