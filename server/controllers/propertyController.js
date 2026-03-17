import Property from '../models/Property.js'

export const createProperty = async (req, res, next) => {
  try {
    const property = await Property.create(req.body)
    res.status(201).json({ message: 'Property saved successfully', property })
  } catch (error) {
    next(error)
  }
}

export const getProperties = async (_req, res, next) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 })
    res.status(200).json({ properties })
  } catch (error) {
    next(error)
  }
}
