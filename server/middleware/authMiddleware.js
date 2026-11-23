import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
	let token

	if (req.headers.authorization?.startsWith('Bearer ')) {
		token = req.headers.authorization.split(' ')[1]
	}

	if (!token) {
		return res.status(401).json({ message: 'Not authorized, token missing' })
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET)
		const user = await User.findById(decoded.id).select('-password')

		if (!user) {
			return res.status(401).json({ message: 'Not authorized, user not found' })
		}

		// A suspended account loses access immediately, even with a token issued before the ban
		if (user.isBanned) {
			return res.status(401).json({ message: 'This account has been suspended' })
		}

		req.user = user
		return next()
	} catch (error) {
		const message =
			error.name === 'TokenExpiredError'
				? 'Token expired'
				: 'Not authorized, token invalid'
		return res.status(401).json({ message })
	}
}

// Posting a listing or contacting a poster shares the phone number with the other side, so it has to be a number
// the account has proven by OTP. Use after `protect`.
export const requireVerifiedPhone = (req, res, next) => {
	if (req.user?.isPhoneVerified && req.user?.phoneNumber) {
		return next()
	}
	return res.status(403).json({
		code: 'PHONE_NOT_VERIFIED',
		message: 'Verify your phone number first. It is shared with the people you deal with here.',
	})
}
