import express from 'express'
import rateLimit from 'express-rate-limit'
import {
	sendOTP,
	verifyOTP,
	resendOTP,
	getCurrentUser,
	registerWithEmail,
	loginWithEmail,
} from '../controllers/userController.js'
import {
	sendEmailOtp,
	verifyEmailOtp,
	sendPhoneOtp,
	verifyPhoneOtp,
} from '../controllers/verificationController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// Rate limiting for OTP endpoints
const otpLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 requests per windowMs
	message: { success: false, message: 'Too many OTP requests. Please try again in a few minutes.' },
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
router.post('/phone/send-otp', protect, verificationSendLimiter, sendPhoneOtp)
router.post('/phone/verify-otp', protect, verifyLimiter, verifyPhoneOtp)

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', protect, getCurrentUser)

export default router
