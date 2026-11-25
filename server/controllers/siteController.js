import Subscriber from '../models/Subscriber.js'
import ContactMessage from '../models/ContactMessage.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const cleanEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')
const cleanText = (value) => (typeof value === 'string' ? value.trim() : '')

/**
 * @route   POST /api/site/subscribe
 * @desc    Add an email to the newsletter list
 * @access  Public
 */
export const subscribe = async (req, res) => {
	try {
		const email = cleanEmail(req.body?.email)
		if (!EMAIL_PATTERN.test(email) || email.length > 254) {
			return res.status(400).json({ success: false, message: 'Please enter a valid email address' })
		}

		// Upsert so signing up twice is fine, and the reply doesn't reveal whether an email was already on the list
		await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true })
		return res.status(200).json({ success: true, message: "You're subscribed! We'll email you about new listings and updates." })
	} catch (error) {
		console.error('Subscribe error:', error)
		return res.status(500).json({ success: false, message: 'Could not subscribe right now. Please try again.' })
	}
}

/**
 * @route   POST /api/site/contact
 * @desc    Store a message from the contact page
 * @access  Public
 */
export const sendContactMessage = async (req, res) => {
	try {
		const name = cleanText(req.body?.name)
		const email = cleanEmail(req.body?.email)
		const message = cleanText(req.body?.message)

		if (!name || name.length > 100) {
			return res.status(400).json({ success: false, message: 'Please enter your name' })
		}
		if (!EMAIL_PATTERN.test(email) || email.length > 254) {
			return res.status(400).json({ success: false, message: 'Please enter a valid email address' })
		}
		if (message.length < 10 || message.length > 2000) {
			return res.status(400).json({ success: false, message: 'Message should be between 10 and 2000 characters' })
		}

		await ContactMessage.create({ name, email, message })
		return res.status(201).json({ success: true, message: "Thanks! We've got your message and will reply by email." })
	} catch (error) {
		console.error('Contact message error:', error)
		return res.status(500).json({ success: false, message: 'Could not send your message. Please try again.' })
	}
}
