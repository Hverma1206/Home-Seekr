import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import User from '../models/User.js'
import { buildUserResponse } from './userController.js'
import { normalizeIndianMobileNumber, isDevOtpMode, dispatchOTP, isOTPValid } from '../utils/sms.js'
import { isDevEmailMode, isEmailConfigured, sendVerificationCodeEmail } from '../utils/email.js'

// Verifying the email address and the phone number of a logged-in account.
// (Phone OTP *login* lives in userController: logging in that way verifies the number by itself.)

const CODE_EXPIRY_MINUTES = 10
const RESEND_DELAY_SECONDS = 30
const MAX_ATTEMPTS = 5

const fail = (res, status, message, extra = {}) =>
	res.status(status).json({ success: false, message, ...extra })

const secondsSince = (date) => (date ? (Date.now() - new Date(date).getTime()) / 1000 : Infinity)

const resendWait = (sentAt) => Math.ceil(RESEND_DELAY_SECONDS - secondsSince(sentAt))

const isSixDigits = (otp) => /^\d{6}$/.test(String(otp ?? '').trim())

/**
 * @route   POST /api/auth/email/send-otp
 * @desc    Email a 6-digit code to the account's address
 * @access  Private
 */
export const sendEmailOtp = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
		if (!user.email) {
			return fail(res, 400, 'Add an email address to your profile first')
		}
		if (user.isEmailVerified) {
			return fail(res, 400, 'Your email is already verified')
		}
		if (resendWait(user.emailOtpSentAt) > 0) {
			return fail(res, 429, `Please wait ${resendWait(user.emailOtpSentAt)} seconds before requesting a new code`)
		}
		if (!isEmailConfigured()) {
			return fail(res, 503, 'Email verification is not available right now. Please try again later.')
		}

		const code = String(randomInt(100000, 1000000))
		const sent = await sendVerificationCodeEmail(user.email, code, CODE_EXPIRY_MINUTES)
		if (!sent) {
			return fail(res, 502, 'Could not send the email. Please try again.')
		}

		user.emailOtpHash = await bcrypt.hash(code, 8)
		user.emailOtpSentAt = new Date()
		user.emailOtpAttempts = 0
		await user.save()

		return res.status(200).json({
			success: true,
			message: `Code sent to ${user.email}`,
			data: { email: user.email, expiresIn: CODE_EXPIRY_MINUTES, devMode: isDevEmailMode() },
		})
	} catch (error) {
		console.error('Send email OTP error:', error)
		return fail(res, 500, 'Failed to send the code')
	}
}

/**
 * @route   POST /api/auth/email/verify-otp
 * @desc    Check the emailed code and mark the email verified
 * @access  Private
 */
export const verifyEmailOtp = async (req, res) => {
	try {
		const { otp } = req.body || {}
		if (!isSixDigits(otp)) {
			return fail(res, 400, 'Enter the 6-digit code')
		}

		const user = await User.findById(req.user._id).select('+emailOtpHash')
		if (user.isEmailVerified) {
			return res.status(200).json({ success: true, message: 'Email already verified', data: { user: buildUserResponse(user) } })
		}
		if (!user.emailOtpHash || !user.emailOtpSentAt) {
			return fail(res, 400, 'Request a code first')
		}
		if (user.emailOtpAttempts >= MAX_ATTEMPTS) {
			return fail(res, 429, 'Too many wrong attempts. Request a new code.')
		}
		if (secondsSince(user.emailOtpSentAt) > CODE_EXPIRY_MINUTES * 60) {
			return fail(res, 400, 'This code has expired. Request a new one.')
		}

		if (!(await bcrypt.compare(String(otp).trim(), user.emailOtpHash))) {
			user.emailOtpAttempts += 1
			await user.save()
			const left = MAX_ATTEMPTS - user.emailOtpAttempts
			return fail(res, 400, left > 0 ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Request a new code.')
		}

		user.isEmailVerified = true
		user.emailOtpHash = null
		user.emailOtpSentAt = null
		user.emailOtpAttempts = 0
		await user.save()

		return res.status(200).json({ success: true, message: 'Email verified', data: { user: buildUserResponse(user) } })
	} catch (error) {
		console.error('Verify email OTP error:', error)
		return fail(res, 500, 'Failed to verify the code')
	}
}

/**
 * @route   POST /api/auth/phone/send-otp
 * @desc    SMS a code to the account's unverified number. Body may carry a new phoneNumber to verify instead
 *          (e.g. to fix a typo made at signup).
 * @access  Private
 */
export const sendPhoneOtp = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
		if (user.isPhoneVerified && user.phoneNumber) {
			return fail(res, 400, 'Your phone number is already verified')
		}

		if (req.body?.phoneNumber) {
			const details = normalizeIndianMobileNumber(req.body.phoneNumber)
			if (!details.isValid) {
				return fail(res, 400, 'Enter a valid 10-digit Indian mobile number')
			}
			user.pendingPhoneNumber = details.nationalNumber
		}

		const target = user.pendingPhoneNumber || user.phoneNumber
		if (!target) {
			return fail(res, 400, 'Add a mobile number first')
		}

		const owner = await User.exists({ phoneNumber: target, isPhoneVerified: true, _id: { $ne: user._id } })
		if (owner) {
			return fail(res, 409, 'This number is already verified on another account. Use a different number.')
		}

		if (resendWait(user.otpSentAt) > 0) {
			return fail(res, 429, `Please wait ${resendWait(user.otpSentAt)} seconds before requesting a new code`)
		}

		const sessionId = await dispatchOTP(normalizeIndianMobileNumber(target))
		if (!sessionId) {
			return fail(res, 502, 'Could not send the SMS. Please try again.')
		}

		user.otpSessionId = sessionId
		user.otpSentAt = new Date()
		user.otpAttempts = 0
		await user.save()

		return res.status(200).json({
			success: true,
			message: `Code sent to +91 ${target}`,
			data: { phoneNumber: target, expiresIn: CODE_EXPIRY_MINUTES, devMode: isDevOtpMode() },
		})
	} catch (error) {
		if (error.name === 'ValidationError') {
			return fail(res, 400, 'Enter a valid 10-digit Indian mobile number')
		}
		console.error('Send phone OTP error:', error)
		return fail(res, 500, 'Failed to send the code')
	}
}

/**
 * @route   POST /api/auth/phone/verify-otp
 * @desc    Check the SMS code and make the number the account's verified phone
 * @access  Private
 */
export const verifyPhoneOtp = async (req, res) => {
	try {
		const { otp } = req.body || {}
		if (!isSixDigits(otp)) {
			return fail(res, 400, 'Enter the 6-digit code')
		}

		const user = await User.findById(req.user._id)
		if (user.isPhoneVerified && user.phoneNumber) {
			return res.status(200).json({ success: true, message: 'Phone already verified', data: { user: buildUserResponse(user) } })
		}
		const target = user.pendingPhoneNumber || user.phoneNumber
		if (!target || !user.otpSessionId || !user.otpSentAt) {
			return fail(res, 400, 'Request a code first')
		}
		if (user.otpAttempts >= MAX_ATTEMPTS) {
			return fail(res, 429, 'Too many wrong attempts. Request a new code.')
		}
		if (secondsSince(user.otpSentAt) > CODE_EXPIRY_MINUTES * 60) {
			return fail(res, 400, 'This code has expired. Request a new one.')
		}

		if (!(await isOTPValid(user.otpSessionId, String(otp).trim()))) {
			user.otpAttempts += 1
			user.otpLastAttemptAt = new Date()
			await user.save()
			const left = MAX_ATTEMPTS - user.otpAttempts
			return fail(res, 400, left > 0 ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Request a new code.')
		}

		// Someone may have verified the number on another account since the code was sent
		if (await User.exists({ phoneNumber: target, isPhoneVerified: true, _id: { $ne: user._id } })) {
			return fail(res, 409, 'This number is already verified on another account. Use a different number.')
		}
		// A bare record left by an unfinished OTP login for this number (never verified, no email/password) is
		// not an account; the person who just proved the number takes it over
		await User.deleteOne({
			_id: { $ne: user._id },
			phoneNumber: target,
			isPhoneVerified: { $ne: true },
			email: { $exists: false },
			password: { $exists: false },
		})

		user.phoneNumber = target
		user.pendingPhoneNumber = null
		user.isPhoneVerified = true
		user.otpSessionId = null
		user.otpSentAt = null
		user.otpAttempts = 0
		await user.save()

		return res.status(200).json({ success: true, message: 'Phone number verified', data: { user: buildUserResponse(user) } })
	} catch (error) {
		if (error.code === 11000) {
			return fail(res, 409, 'This number is already used by another account. Use a different number.')
		}
		console.error('Verify phone OTP error:', error)
		return fail(res, 500, 'Failed to verify the code')
	}
}
