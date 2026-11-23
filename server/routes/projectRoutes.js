import express from 'express'
import {
	createProject,
	getProjects,
	getProjectDetails,
} from '../controllers/projectController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public
router.get('/', getProjects)
router.get('/:projectId', getProjectDetails)

// Protected
router.post('/', protect, createProject)

export default router
