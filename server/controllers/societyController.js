import Property from '../models/Property.js'
import Project from '../models/Project.js'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// "Mapsko Mount Ville" and "Mapsko Mountville" are the same society typed two ways
export const societyKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const toNumber = (value) => {
	const n = Number(value)
	return Number.isFinite(n) && n > 0 ? n : null
}

const hasCoords = (doc) => {
	const [lng, lat] = doc?.geo?.coordinates || []
	return Number.isFinite(lng) && Number.isFinite(lat) && (lng !== 0 || lat !== 0)
}

const range = (values) => (values.length ? { count: values.length, min: Math.min(...values), max: Math.max(...values) } : { count: 0, min: null, max: null })

const listingArea = (p) => (p.areaSqFt ? `${p.areaSqFt} sq.ft` : p.area || (p.plotArea ? `${p.plotArea} ${p.plotAreaUnit || ''}`.trim() : ''))

// One map pin per society: listings grouped by society name (or by locality when a home is not in a society),
// with projects in the same city merged in by name. Pure, so it can be tested without a database.
export const groupSocieties = (properties = [], projects = []) => {
	const groups = new Map()

	for (const p of properties) {
		if (!hasCoords(p)) continue
		const society = String(p.societyName || '').trim()
		const key = society ? `s:${societyKey(society)}` : `a:${societyKey(p.locality)}`
		if (key.length <= 2) continue
		if (!groups.has(key)) groups.set(key, { key, name: society || p.locality, kind: society ? 'society' : 'area', items: [], project: null })
		groups.get(key).items.push(p)
	}

	for (const project of projects) {
		if (!hasCoords(project)) continue
		const key = `s:${societyKey(project.name)}`
		if (!groups.has(key)) groups.set(key, { key, name: project.name, kind: 'project', items: [], project: null })
		groups.get(key).project = project
	}

	return [...groups.values()].map(({ key, name, kind, items, project }) => {
		const coords = items.length ? items.map((p) => p.geo.coordinates) : [project.geo.coordinates]
		const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
		const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length
		const price = (p) => toNumber(p.priceNumeric) ?? toNumber(p.price)
		const isRental = (p) => p.lookingTo === 'rent' || p.lookingTo === 'pg'
		const floors = items.map((p) => toNumber(p.totalFloors)).filter(Boolean)
		const projectFloors = project ? Math.max(0, ...(project.towers || []).map((t) => t.floors || 0), project.specifications?.floorsInTower || 0) : 0
		const bhks = new Set([
			...items.map((p) => p.bhk).filter(Boolean),
			...(project?.configurations || []).map((c) => c.type).filter(Boolean),
		])
		const first = items[0] || {}

		return {
			id: key,
			name,
			kind,
			locality: first.locality || project?.locality || '',
			city: first.city || project?.city || '',
			lng: +lng.toFixed(6),
			lat: +lat.toFixed(6),
			// Apartments and projects are drawn as towers; builder floors and villas as low blocks
			tall: Boolean(project) || items.some((p) => /apartment|flat|penthouse|studio/i.test(p.selectedType || '')),
			floors: Math.max(projectFloors, ...floors, 0) || null,
			buy: range(items.filter((p) => !isRental(p)).map(price).filter(Boolean)),
			rent: range(items.filter(isRental).map(price).filter(Boolean)),
			bhks: [...bhks].sort(),
			types: [...new Set(items.map((p) => p.selectedType).filter(Boolean))],
			amenities: [...new Set([...items.flatMap((p) => p.amenities || []), ...(project?.amenities || [])])].slice(0, 12),
			image: first.image || first.images?.[0] || project?.thumbnail || project?.images?.[0] || '',
			listings: items.slice(0, 30).map((p) => ({
				id: String(p._id),
				title: p.title || `${p.bhk || ''} ${p.selectedType || 'Home'}`.trim(),
				lookingTo: p.lookingTo,
				price: price(p),
				bhk: p.bhk || '',
				area: listingArea(p),
				furnishing: p.furnishingType || '',
				image: p.image || p.images?.[0] || '',
			})),
			project: project ? {
				id: String(project._id),
				status: project.status,
				developer: project.developerName || '',
				priceMin: toNumber(project.priceRange?.min),
				priceMax: toNumber(project.priceRange?.max),
				possessionDate: project.possessionDate || null,
				totalUnits: project.totalUnits || null,
				towers: project.towers?.length || null,
				configurations: (project.configurations || []).map((c) => ({ type: c.type, priceMin: c.priceMin, priceMax: c.priceMax, minArea: c.minArea, maxArea: c.maxArea })),
			} : null,
		}
	})
}

const LISTING_FIELDS = 'societyName locality city geo lookingTo selectedType price priceNumeric bhk areaSqFt area plotArea plotAreaUnit totalFloors furnishingType amenities image images title'

// GET /api/societies?city=Gurugram — every society with listings or a project in the city, ready for the 3D map
export const getSocieties = async (req, res, next) => {
	try {
		const city = String(req.query.city || 'Gurugram').trim().slice(0, 60)
		const cityMatch = new RegExp(`^${escapeRegExp(city)}$`, 'i')
		const withCoords = { 'geo.coordinates.1': { $exists: true } }

		// shortcut: groups in memory and caps at 5,000 listings; move to a $group aggregation if a city outgrows that
		const [properties, projects] = await Promise.all([
			Property.find({ status: 'active', city: cityMatch, ...withCoords }).select(LISTING_FIELDS).sort({ createdAt: -1 }).limit(5000).lean(),
			Project.find({ isActive: true, city: cityMatch, ...withCoords }).lean(),
		])

		const societies = groupSocieties(properties, projects)
		res.status(200).json({ city, total: societies.length, societies })
	} catch (error) {
		next(error)
	}
}
