import test from 'node:test'
import assert from 'node:assert/strict'
import { groupSocieties } from './societyController.js'

const listing = (over) => ({
	_id: Math.random().toString(36).slice(2),
	city: 'Gurugram',
	locality: 'Sector 66',
	geo: { type: 'Point', coordinates: [77.065, 28.396] },
	selectedType: 'Flat / Apartment',
	lookingTo: 'buy',
	price: '20000000',
	bhk: '3 BHK',
	...over,
})

test('listings of one society become one pin, even when the name is typed two ways', () => {
	const societies = groupSocieties([
		listing({ societyName: 'Mapsko Mount Ville', price: '15000000', totalFloors: '14' }),
		listing({ societyName: 'Mapsko Mountville', lookingTo: 'rent', price: '45000', bhk: '2 BHK' }),
	])

	assert.equal(societies.length, 1)
	const [s] = societies
	assert.equal(s.kind, 'society')
	assert.deepEqual(s.buy, { count: 1, min: 15000000, max: 15000000 })
	assert.deepEqual(s.rent, { count: 1, min: 45000, max: 45000 })
	assert.deepEqual(s.bhks, ['2 BHK', '3 BHK'])
	assert.equal(s.floors, 14)
	assert.equal(s.tall, true)
	assert.equal(s.listings.length, 2)
})

test('homes outside a society group by locality; listings without coordinates are left off the map', () => {
	const societies = groupSocieties([
		listing({ societyName: '', selectedType: 'Independent / Builder Floor', locality: 'Sector 28' }),
		listing({ societyName: 'Nowhere', geo: { coordinates: [] } }),
	])

	assert.equal(societies.length, 1)
	assert.equal(societies[0].kind, 'area')
	assert.equal(societies[0].name, 'Sector 28')
	assert.equal(societies[0].tall, false)
})

test('a plot-only society is flagged, and price-on-request listings count without breaking the price range', () => {
	const [s] = groupSocieties([
		listing({ societyName: 'BPTP Amstoria', selectedType: 'Plot / Land', price: 'Price on request', priceNumeric: null }),
		listing({ societyName: 'BPTP Amstoria', selectedType: 'Plot / Land', price: '30000000', priceNumeric: 30000000 }),
	])

	assert.equal(s.plot, true)
	assert.deepEqual(s.buy, { count: 2, min: 30000000, max: 30000000 })
})

test('a project with the same name as a society merges into it; others get their own pin', () => {
	const projects = [
		{ _id: 'p1', name: 'Godrej Oasis', city: 'Gurugram', locality: 'Sector 88A', geo: { coordinates: [76.95, 28.42] }, status: 'ongoing', priceRange: { min: 1e7, max: 2e7 }, configurations: [{ type: '4 BHK' }] },
		{ _id: 'p2', name: 'Vista Central', city: 'Gurugram', locality: 'Sector 57', geo: { coordinates: [77.08, 28.42] }, status: 'completed' },
	]
	const societies = groupSocieties([listing({ societyName: 'Godrej Oasis' })], projects)

	assert.equal(societies.length, 2)
	const merged = societies.find((s) => s.name === 'Godrej Oasis')
	assert.equal(merged.project.id, 'p1')
	assert.deepEqual(merged.bhks, ['3 BHK', '4 BHK'])
	const solo = societies.find((s) => s.name === 'Vista Central')
	assert.equal(solo.kind, 'project')
	assert.equal(solo.lng, 77.08)
})
