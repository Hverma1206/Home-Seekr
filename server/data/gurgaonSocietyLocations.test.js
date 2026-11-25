import test from 'node:test'
import assert from 'node:assert/strict'
import { locate, SOCIETY_LOCATIONS } from './gurgaonSocietyLocations.js'
import { buildGurgaonListings } from './gurgaonListings.js'
import { buildMandateDeals } from './gurgaonMandateDeals.js'

test('a society spelled differently still gets its verified pin; unknown ones fall back to the sector centre', () => {
	assert.deepEqual(locate('Mapsko Mountville', 'Sector 79', [0, 0]), SOCIETY_LOCATIONS['Mapsko Mount Ville'])
	assert.deepEqual(locate('', 'Sector 43', [0, 0]), [28.453035, 77.080939])
	assert.deepEqual(locate('Some New Society', 'Sector 1', [1, 2]), [1, 2])
})

test('every imported listing lands inside Gurgaon district', () => {
	for (const p of [...buildGurgaonListings('x'), ...buildMandateDeals('x')]) {
		const [lng, lat] = p.geo.coordinates
		assert.ok(lat > 28.1 && lat < 28.6 && lng > 76.6 && lng < 77.25, `${p.title}: ${lat}, ${lng}`)
	}
})
