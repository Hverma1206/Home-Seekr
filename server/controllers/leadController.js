import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

// Leads reach whoever posted the listing (stored as owner) or its associated broker
const receivedBy = (user) =>
	user.role === 'admin' ? {} : { $or: [{ owner: user._id }, { broker: user._id }] }

const involving = (user) =>
	user.role === 'admin'
		? {}
		: { $or: [{ buyer: user._id }, { owner: user._id }, { broker: user._id }] }

const CONTACT_TYPES = ['phone_request', 'callback_request', 'email_inquiry']

// Create a new lead (buyer contacts owner)
export const createLead = async (req, res, next) => {
	try {
		const { propertyId, contactType, notes } = req.body
		const buyerId = req.user._id

		const property = await Property.findById(propertyId).populate(
			'postedBy',
			'firstName lastName phoneNumber companyName',
		)
		if (!property || !property.postedBy || property.status !== 'active') {
			return res.status(404).json({ message: 'Property not found' })
		}

		const poster = property.postedBy
		if (poster._id.equals(buyerId)) {
			return res.status(400).json({ message: 'This is your own listing' })
		}

		// The poster's number is shared only with a logged-in buyer who has sent an enquiry
		const contact = {
			name:
				property.dealer
				|| poster.companyName
				|| [poster.firstName, poster.lastName].filter(Boolean).join(' ')
				|| 'Owner',
			phoneNumber: poster.phoneNumber,
		}

		const existingLead = await Lead.findOne({
			property: propertyId,
			buyer: buyerId,
		})

		if (existingLead) {
			return res.status(200).json({
				message: 'You have already contacted this property',
				lead: existingLead,
				contact,
			})
		}

		const lead = await Lead.create({
			property: propertyId,
			buyer: buyerId,
			owner: poster._id,
			broker: property.brokerAssociated,
			buyerName:
				[req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Anonymous',
			buyerPhone: req.user.phoneNumber,
			buyerEmail: req.user.email,
			contactRequests: [
				{
					type: CONTACT_TYPES.includes(contactType) ? contactType : 'phone_request',
					requestedAt: new Date(),
				},
			],
			notes: typeof notes === 'string' ? notes.slice(0, 1000) : undefined,
		})

		await Property.updateOne(
			{ _id: propertyId },
			{ $inc: { contactsMade: 1, enquiries: 1 } },
		)

		res.status(201).json({
			message: 'Lead created successfully',
			lead,
			contact,
		})
	} catch (error) {
		next(error)
	}
}

// Get leads for owner/broker/admin
export const getLeads = async (req, res, next) => {
	try {
		const { status, page = 1, limit = 20 } = req.query

		const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
		const parsedPage = Math.max(parseNumber(page) || 1, 1)
		const skip = (parsedPage - 1) * parsedLimit

		const filters = receivedBy(req.user)

		if (status) {
			filters.status = status
		}

		const leads = await Lead.find(filters)
			.populate('property', 'title selectedType city locality price')
			.populate('buyer', 'firstName lastName phoneNumber')
			.skip(skip)
			.limit(parsedLimit)
			.sort({ createdAt: -1 })

		const total = await Lead.countDocuments(filters)

		res.status(200).json({
			leads,
			meta: {
				total,
				page: parsedPage,
				limit: parsedLimit,
				pages: Math.ceil(total / parsedLimit),
			},
		})
	} catch (error) {
		next(error)
	}
}

// Get buyer's leads
export const getBuyerLeads = async (req, res, next) => {
	try {
		const buyerId = req.user._id
		const { page = 1, limit = 20 } = req.query

		const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
		const parsedPage = Math.max(parseNumber(page) || 1, 1)
		const skip = (parsedPage - 1) * parsedLimit

		const leads = await Lead.find({ buyer: buyerId })
			.populate('property', 'title city locality price images')
			.populate('owner', 'firstName lastName phoneNumber')
			.skip(skip)
			.limit(parsedLimit)
			.sort({ createdAt: -1 })

		const total = await Lead.countDocuments({ buyer: buyerId })

		res.status(200).json({
			leads,
			meta: {
				total,
				page: parsedPage,
				limit: parsedLimit,
				pages: Math.ceil(total / parsedLimit),
			},
		})
	} catch (error) {
		next(error)
	}
}

// Get single lead details
export const getLeadDetails = async (req, res, next) => {
	try {
		const { leadId } = req.params

		const person = 'firstName lastName phoneNumber email companyName'
		const lead = await Lead.findOne({ _id: leadId, ...involving(req.user) })
			.populate('property')
			.populate('buyer', person)
			.populate('owner', person)
			.populate('broker', person)

		if (!lead) {
			return res.status(404).json({ message: 'Lead not found' })
		}

		res.status(200).json({ lead })
	} catch (error) {
		next(error)
	}
}

// Update lead status
export const updateLeadStatus = async (req, res, next) => {
	try {
		const { leadId } = req.params
		const { status } = req.body

		if (
			![
				'new',
				'contacted',
				'interested',
				'scheduled_visit',
				'visited',
				'negotiating',
				'offered',
				'closed_won',
				'closed_lost',
			].includes(status)
		) {
			return res.status(400).json({ message: 'Invalid status' })
		}

		const lead = await Lead.findOneAndUpdate(
			{ _id: leadId, ...receivedBy(req.user) },
			{
				status,
				lastContactedAt:
					status === 'contacted' || status === 'interested'
						? new Date()
						: undefined,
			},
			{ returnDocument: 'after' }
		)

		if (!lead) {
			return res.status(404).json({ message: 'Lead not found' })
		}

		res.status(200).json({
			message: 'Lead status updated',
			lead,
		})
	} catch (error) {
		next(error)
	}
}

// Schedule visit
export const scheduleVisit = async (req, res, next) => {
	try {
		const { leadId } = req.params
		const { scheduledFor, notes } = req.body

		if (!scheduledFor) {
			return res.status(400).json({ message: 'Scheduled date is required' })
		}

		const lead = await Lead.findOneAndUpdate(
			{ _id: leadId, ...involving(req.user) },
			{
				$push: {
					visitSchedules: {
						requestedAt: new Date(),
						scheduledFor: new Date(scheduledFor),
						status: 'pending',
						notes,
					},
				},
				status: 'scheduled_visit',
			},
			{ returnDocument: 'after' }
		)

		if (!lead) {
			return res.status(404).json({ message: 'Lead not found' })
		}

		res.status(200).json({
			message: 'Visit scheduled successfully',
			lead,
		})
	} catch (error) {
		next(error)
	}
}

// Add followup note
export const addFollowupNote = async (req, res, next) => {
	try {
		const { leadId } = req.params
		const { note } = req.body

		if (!note) {
			return res.status(400).json({ message: 'Note is required' })
		}

		const lead = await Lead.findOneAndUpdate(
			{ _id: leadId, ...receivedBy(req.user) },
			{
				$push: {
					followupNotes: {
						note,
						createdBy: req.user._id,
						createdAt: new Date(),
					},
				},
			},
			{ returnDocument: 'after' }
		)

		if (!lead) {
			return res.status(404).json({ message: 'Lead not found' })
		}

		res.status(200).json({
			message: 'Note added successfully',
			lead,
		})
	} catch (error) {
		next(error)
	}
}

// Get lead analytics
export const getLeadAnalytics = async (req, res, next) => {
	try {

		const filters = receivedBy(req.user)

		const totalLeads = await Lead.countDocuments(filters)
		const newLeads = await Lead.countDocuments({ ...filters, status: 'new' })
		const qualifiedLeads = await Lead.countDocuments({
			...filters,
			isQualified: true,
		})
		const closedLeads = await Lead.countDocuments({
			...filters,
			status: { $in: ['closed_won', 'closed_lost'] },
		})

		const statusBreakdown = await Lead.aggregate([
			{ $match: filters },
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 },
				},
			},
		])

		const conversionRate =
			totalLeads > 0
				? Math.round((closedLeads / totalLeads) * 100)
				: 0

		res.status(200).json({
			analytics: {
				totalLeads,
				newLeads,
				qualifiedLeads,
				closedLeads,
				conversionRate,
				statusBreakdown,
			},
		})
	} catch (error) {
		next(error)
	}
}

// Mark lead as qualified
export const qualifyLead = async (req, res, next) => {
	try {
		const { leadId } = req.params
		const { reason } = req.body

		const lead = await Lead.findOneAndUpdate(
			{ _id: leadId, ...receivedBy(req.user) },
			{
				isQualified: true,
				qualifiedReason: reason,
			},
			{ returnDocument: 'after' }
		)

		if (!lead) {
			return res.status(404).json({ message: 'Lead not found' })
		}

		res.status(200).json({
			message: 'Lead marked as qualified',
			lead,
		})
	} catch (error) {
		next(error)
	}
}

// Get followup reminders
export const getFollowupReminders = async (req, res, next) => {
	try {

		const filters = { nextFollowupAt: { $lte: new Date() }, ...receivedBy(req.user) }

		const reminders = await Lead.find(filters)
			.populate('property', 'title city')
			.populate('buyer', 'firstName lastName phoneNumber')
			.sort({ nextFollowupAt: 1 })

		res.status(200).json({
			reminders,
			count: reminders.length,
		})
	} catch (error) {
		next(error)
	}
}
