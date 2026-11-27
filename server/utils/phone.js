import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Phone numbers are proven with Firebase Phone Auth: the browser does the SMS + OTP, we only check the ID token.
// No service-account key is needed: verifyIdToken() just checks the signature against Google's public keys.
// Created on first use: index.js loads .env only after its imports have run.
const firebaseAuth = () =>
	getAuth(getApps()[0] || initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'home-seekr-otp' }))

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

// The 10-digit Indian mobile number a Firebase phone-auth ID token proves, or null for a missing, invalid or
// expired token, or a number that is not +91
export const verifyFirebasePhoneToken = async (idToken) => {
	if (!idToken || typeof idToken !== 'string') return null
	try {
		const { phone_number: phoneNumber } = await firebaseAuth().verifyIdToken(idToken)
		return /^\+91([6-9]\d{9})$/.exec(phoneNumber || '')?.[1] || null
	} catch {
		return null
	}
}
