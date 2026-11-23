import Project from '../models/Project.js'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

const toArray = (value) => {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

const buildFilters = (query) => {
	const filters = { isActive: true }

	if (query.city) {
		filters.city = new RegExp(`^${escapeRegExp(query.city)}$`, 'i')
	}
	if (query.locality) {
		filters.locality = new RegExp(escapeRegExp(query.locality), 'i')
	}
	if (query.status) {
		filters.status = query.status
	}
	if (query.projectType) {
		filters.projectType = query.projectType
	}
	if (query.propertyType || query.propertyTypes) {
		const types = toArray(query.propertyType || query.propertyTypes)
		if (types.length) {
			filters.propertyType = { $in: types }
		}
	}
	if (query.builder) {
		filters.builder = query.builder
	}

	const minPrice = parseNumber(query.minPrice)
	const maxPrice = parseNumber(query.maxPrice)
	if (minPrice !== null || maxPrice !== null) {
		filters.$and = []
		if (minPrice !== null) {
			filters.$and.push({ 'priceRange.max': { $gte: minPrice } })
		}
		if (maxPrice !== null) {
			filters.$and.push({ 'priceRange.min': { $lte: maxPrice } })
		}
	}

	return filters
}

export const getProjects = async (req, res, next) => {
	try {
		const { limit = 20, page = 1 } = req.query
		const parsedLimit = Math.min(parseNumber(limit) || 20, 100)
		const parsedPage = Math.max(parseNumber(page) || 1, 1)
		const skip = (parsedPage - 1) * parsedLimit

		const filters = buildFilters(req.query)

		const projects = await Project.find(filters)
			.sort({ isFeatured: -1, createdAt: -1 })
			.skip(skip)
			.limit(parsedLimit)
			.lean()

		const total = await Project.countDocuments(filters)

		res.status(200).json({
			projects,
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

export const getProjectDetails = async (req, res, next) => {
	try {
		const { projectId } = req.params

		const project = await Project.findByIdAndUpdate(
			projectId,
			{ $inc: { views: 1 } },
			{ new: true },
		)
			.populate('builder', 'firstName lastName companyName profileImage')

		if (!project) {
			return res.status(404).json({ message: 'Project not found' })
		}

		const similarProjects = await Project.find({
			_id: { $ne: projectId },
			city: project.city,
			projectType: project.projectType,
			isActive: true,
		})
			.limit(4)
			.lean()

		res.status(200).json({ project, similarProjects })
	} catch (error) {
		next(error)
	}
}

export const createProject = async (req, res, next) => {
	try {
		const user = req.user
		if (!user || (user.role !== 'builder' && user.role !== 'admin')) {
			return res.status(403).json({ message: 'Only builders can create projects' })
		}

		const payload = { ...req.body }
		payload.builder = user._id
		payload.projectType = payload.projectType || 'residential'

		if (!payload.developerName) {
			payload.developerName = user.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim()
		}

		const propertyTypes = toArray(payload.propertyType || payload.propertyTypes)
		if (propertyTypes.length) {
			payload.propertyType = propertyTypes
		}

		const minPrice = parseNumber(payload.priceRange?.min ?? payload.minPrice)
		const maxPrice = parseNumber(payload.priceRange?.max ?? payload.maxPrice)
		if (minPrice !== null || maxPrice !== null) {
			payload.priceRange = {
				min: minPrice !== null ? minPrice : maxPrice,
				max: maxPrice !== null ? maxPrice : minPrice,
			}
			if (payload.priceRange.min > payload.priceRange.max) {
				const temp = payload.priceRange.min
				payload.priceRange.min = payload.priceRange.max
				payload.priceRange.max = temp
			}
			payload.avgPrice = Math.round((payload.priceRange.min + payload.priceRange.max) / 2)
		}

		const project = await Project.create(payload)
		res.status(201).json({ message: 'Project created successfully', project })
	} catch (error) {
		next(error)
	}
}
