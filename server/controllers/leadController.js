import Lead from '../models/Lead.js'
import Property from '../models/Property.js'
import User from '../models/User.js'

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

// Create a new lead (buyer contacts owner)
export const createLead = async (req, res, next) => {
	try {
		const { propertyId, contactType, notes } = req.body
		const buyerId = req.user._id

		const property = await Property.findById(propertyId)
		if (!property) {
			return res.status(404).json({ message: 'Property not found' })
		}

		// Check if lead already exists
		const existingLead = await Lead.findOne({
			property: propertyId,
			buyer: buyerId,
		})

		if (existingLead) {
			return res.status(400).json({ message: 'You have already contacted this property' })
		}

		const lead = await Lead.create({
			property: propertyId,
			buyer: buyerId,
			owner: property.postedBy,
			broker: property.brokerAssociated,
			buyerName: req.user.firstName || 'Anonymous',
			buyerPhone: req.user.phoneNumber,
			buyerEmail: req.user.email,
			contactRequests: [
				{
					type: contactType || 'phone_request',
					requestedAt: new Date(),
				},
			],
			notes,
		})

		await Property.updateOne({ _id: propertyId }, { $inc: { contactsMade: 1 } })

		res.status(201).json({
			message: 'Lead created successfully',
			lead,
		})
	} catch (error) {
		next(error)
	}
}

// Get leads for owner/broker/admin
export const getLeads = async (req, res, next) => {
	try {
		const userId = req.user._id
		const { role } = req.user
		const { status, page = 1, limit = 20 } = req.query

		const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
		const parsedPage = Math.max(parseNumber(page) || 1, 1)
		const skip = (parsedPage - 1) * parsedLimit

		let filters = {}

		if (role === 'owner') {
			filters.owner = userId
		} else if (role === 'broker') {
			filters.broker = userId
		}

		if (status) {
			filters.status = status
		}

		const leads = await Lead.find(filters)
			.populate('property', 'title city locality price')
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

		const lead = await Lead.findById(leadId)
			.populate('property')
			.populate('buyer')
			.populate('owner')
			.populate('broker')

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

		const lead = await Lead.findByIdAndUpdate(
			leadId,
			{
				status,
				lastContactedAt:
					status === 'contacted' || status === 'interested'
						? new Date()
						: undefined,
			},
			{ new: true }
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

		const lead = await Lead.findByIdAndUpdate(
			leadId,
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
			{ new: true }
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

		const lead = await Lead.findByIdAndUpdate(
			leadId,
			{
				$push: {
					followupNotes: {
						note,
						createdBy: req.user._id,
						createdAt: new Date(),
					},
				},
			},
			{ new: true }
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
		const userId = req.user._id
		const { role } = req.user

		let filters = {}
		if (role === 'owner') {
			filters.owner = userId
		} else if (role === 'broker') {
			filters.broker = userId
		}

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

		const lead = await Lead.findByIdAndUpdate(
			leadId,
			{
				isQualified: true,
				qualifiedReason: reason,
			},
			{ new: true }
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
		const userId = req.user._id
		const { role } = req.user

		let filters = { nextFollowupAt: { $lte: new Date() } }
		if (role === 'owner') {
			filters.owner = userId
		} else if (role === 'broker') {
			filters.broker = userId
		}

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
