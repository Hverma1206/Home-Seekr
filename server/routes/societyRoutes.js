import express from 'express'
import { getSocieties } from '../controllers/societyController.js'

const router = express.Router()

// Public
router.get('/', getSocieties)

export default router
