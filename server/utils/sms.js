import axios from 'axios'
import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'

// SMS OTP via 2Factor.in (https://2factor.in). Set TWOFACTOR_API_KEY in .env.
// Without a key outside production, OTPs are printed to the server console so the app can run locally.

export const normalizeIndianMobileNumber = (phoneNumber) => {
	const cleaned = String(phoneNumber || '').replace(/\D/g, '')
	let nationalNumber = cleaned

	if (cleaned.startsWith('91') && cleaned.length >= 12) {
		nationalNumber = cleaned.slice(-10)
	}

	const isValid = /^[6-9]\d{9}$/.test(nationalNumber)

	return {
		cleaned,
		nationalNumber,
		isValid,
		internationalNumber: `91${nationalNumber}`,
	}
}

const get2FactorKey = () =>
	process.env.TWOFACTOR_API_KEY || process.env.TWO_FACTOR_API_KEY

const DEV_OTP_PREFIX = 'dev:'
export const isDevOtpMode = () => !get2FactorKey() && process.env.NODE_ENV !== 'production'

const call2FactorAPI = async (endpoint) => {
	try {
		const apiKey = get2FactorKey()
		if (!apiKey) {
			throw new Error('2Factor API key not configured')
		}

		const response = await axios.get(
			`https://2factor.in/API/V1/${apiKey}${endpoint}`,
			{ timeout: 10000 },
		)
		return response.data
	} catch (error) {
		console.error('2Factor API Error:', error.message)
		// 2Factor answers a wrong OTP with HTTP 400; surface its body so callers treat it as a failed match
		if (error.response?.data) {
			return error.response.data
		}
		throw new Error(`2Factor API Error: ${error.message}`)
	}
}

// Sends an OTP and returns the session id to store on the user, or null when sending failed
export const dispatchOTP = async (phoneDetails) => {
	if (isDevOtpMode()) {
		const code = String(randomInt(100000, 1000000))
		console.log(`[dev OTP] +91 ${phoneDetails.nationalNumber}: ${code}`)
		return `${DEV_OTP_PREFIX}${await bcrypt.hash(code, 8)}`
	}

	const apiResponse = await call2FactorAPI(
		`/SMS/${phoneDetails.internationalNumber}/AUTOGEN/Homeseekrotp`,
	)
	if (apiResponse.Status !== 'Success' || !apiResponse.Details) {
		console.error('2Factor API Response:', apiResponse)
		return null
	}
	return apiResponse.Details
}

export const isOTPValid = async (sessionId, otp) => {
	if (sessionId.startsWith(DEV_OTP_PREFIX)) {
		return bcrypt.compare(otp, sessionId.slice(DEV_OTP_PREFIX.length))
	}
	const apiResponse = await call2FactorAPI(`/SMS/VERIFY/${sessionId}/${otp}`)
	return apiResponse.Status === 'Success'
}
