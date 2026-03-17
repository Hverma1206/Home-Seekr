import express from 'express'
import { createProperty, getProperties } from '../controllers/propertyController.js'

const router = express.Router()

router.route('/').get(getProperties).post(createProperty)

export default router
