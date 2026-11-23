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

// What a buyer may see about the poster once they have enquired
const buildContact = (property, poster) => ({
	name:
		property.dealer
		|| poster.companyName
		|| [poster.firstName, poster.lastName].filter(Boolean).join(' ')
		|| 'Owner',
	// Imported test listings carry no real contact; the poster account's number is a placeholder
	phoneNumber: property.sourceUrl ? null : poster.phoneNumber,
	phoneNotSpecified: Boolean(property.sourceUrl),
	role: property.postedByType || poster.role || 'owner',
})

const parseVisitDate = (value) => {
	if (!value) return null
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

// Create a new lead (buyer contacts owner). Contacting the same listing again adds to the existing lead.
export const createLead = async (req, res, next) => {
	try {
		const { propertyId, contactType, notes, visitDate } = req.body
		const buyerId = req.user._id

		const property = await Property.findById(propertyId).populate(
			'postedBy',
			'firstName lastName phoneNumber companyName role',
		)
		if (!property || !property.postedBy || property.status !== 'active') {
			return res.status(404).json({ message: 'This listing is no longer available' })
		}

		const poster = property.postedBy
		if (poster._id.equals(buyerId)) {
			return res.status(400).json({ message: 'This is your own listing' })
		}

		const type = CONTACT_TYPES.includes(contactType) ? contactType : 'phone_request'
		const message = typeof notes === 'string' ? notes.trim().slice(0, 1000) : ''
		const scheduledFor = parseVisitDate(visitDate)
		if (visitDate && (!scheduledFor || scheduledFor < new Date(Date.now() - 24 * 60 * 60 * 1000))) {
			return res.status(400).json({ message: 'Pick a visit date from today onwards' })
		}

		// The poster's number is shared only with a logged-in buyer who has sent an enquiry
		const contact = buildContact(property, poster)
		const contactRequest = { type, requestedAt: new Date() }
		const visit = scheduledFor
			? { requestedAt: new Date(), scheduledFor, status: 'pending', notes: message || undefined }
			: null

		const existingLead = await Lead.findOne({ property: propertyId, buyer: buyerId })

		if (existingLead) {
			existingLead.contactRequests.push(contactRequest)
			if (message) {
				existingLead.notes = existingLead.notes
					? `${existingLead.notes}\n---\n${message}`.slice(-3000)
					: message
			}
			if (visit) {
				existingLead.visitSchedules.push(visit)
				existingLead.status = 'scheduled_visit'
			} else if (['closed_lost'].includes(existingLead.status)) {
				existingLead.status = 'new' // the buyer came back
			}
			await existingLead.save()

			return res.status(200).json({
				message: visit ? 'Visit request sent' : 'Your enquiry has been sent again',
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
			contactRequests: [contactRequest],
			visitSchedules: visit ? [visit] : [],
			status: visit ? 'scheduled_visit' : 'new',
			notes: message || undefined,
		})

		await Property.updateOne(
			{ _id: propertyId },
			{ $inc: { contactsMade: 1, enquiries: 1 } },
		)
		await User.updateOne({ _id: poster._id }, { $inc: { totalLeads: 1 } })

		res.status(201).json({
			message: visit ? 'Visit request sent' : 'Your enquiry has been sent',
			lead,
			contact,
		})
	} catch (error) {
		next(error)
	}
}

// Has the logged-in buyer already enquired on this listing? Returns the poster's contact if so,
// so the number stays visible after a page reload
export const getMyLeadForProperty = async (req, res, next) => {
	try {
		const lead = await Lead.findOne({
			property: req.params.propertyId,
			buyer: req.user._id,
		}).lean()

		if (!lead) {
			return res.status(200).json({ lead: null, contact: null })
		}

		const property = await Property.findById(req.params.propertyId).populate(
			'postedBy',
			'firstName lastName phoneNumber companyName role',
		)

		res.status(200).json({
			lead,
			contact: property?.postedBy ? buildContact(property, property.postedBy) : null,
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
			.populate('property', 'title selectedType city locality price lookingTo image')
			.populate('buyer', 'firstName lastName phoneNumber email')
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
			.populate('property', 'title selectedType city locality price lookingTo image images status dealer postedByType sourceUrl')
			.populate('owner', 'firstName lastName phoneNumber companyName')
			.skip(skip)
			.limit(parsedLimit)
			.sort({ createdAt: -1 })

		// Imported test listings: hide the placeholder poster number
		for (const lead of leads) {
			if (lead.property?.sourceUrl && lead.owner) lead.owner.phoneNumber = undefined
		}

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
