import express from 'express'
import {
	createLead,
	getLeads,
	getBuyerLeads,
	getLeadDetails,
	updateLeadStatus,
	scheduleVisit,
	addFollowupNote,
	getLeadAnalytics,
	qualifyLead,
	getFollowupReminders,
	getMyLeadForProperty,
} from '../controllers/leadController.js'
import { protect, requireVerifiedPhone } from '../middleware/authMiddleware.js'

const router = express.Router()

// Protected routes
router.use(protect)

// Lead management
router.post('/', requireVerifiedPhone, createLead)
router.get('/', getLeads)
router.get('/buyer/my-leads', getBuyerLeads)
router.get('/analytics', getLeadAnalytics)
router.get('/reminders/followup', getFollowupReminders)
router.get('/property/:propertyId', getMyLeadForProperty)

// Single lead
router.get('/:leadId', getLeadDetails)
router.put('/:leadId/status', updateLeadStatus)
router.put('/:leadId/qualify', qualifyLead)

// Lead interactions
router.post('/:leadId/visit', scheduleVisit)
router.post('/:leadId/followup-note', addFollowupNote)

export default router
