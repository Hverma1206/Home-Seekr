import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareListingData } from './propertyController.js'

test('a poster cannot set server-owned fields', () => {
	const data = prepareListingData({
		isVerified: true,
		isFeatured: true,
		views: 9999,
		status: 'active',
		postedBy: 'someone-else',
		city: 'Pune',
	})

	assert.deepEqual(data, { city: 'Pune' })
})

test('search fields are derived from what the poster typed', () => {
	const data = prepareListingData({
		lookingTo: 'sell',
		propertyCategory: 'Residential',
		selectedType: 'Flat / Apartment',
		city: 'Pune',
		locality: 'Baner',
		price: '8500000',
		plotArea: '100',
		plotAreaUnit: 'sq.yards',
		bedrooms: '3',
		geo: null,
		images: ['a.jpg', '', 'b.jpg'],
	})

	assert.equal(data.lookingTo, 'buy')
	assert.equal(data.priceNumeric, 8500000)
	assert.equal(data.areaSqFt, 900)
	assert.equal(data.bhkNumeric, 3)
	assert.equal(data.title, '3 BHK Flat / Apartment in Baner')
	assert.equal(data.locationLabel, 'Baner, Pune')
	assert.deepEqual(data.images, ['a.jpg', 'b.jpg'])
	assert.equal(data.image, 'a.jpg')
	assert.equal('geo' in data, false, 'a Point without coordinates must not reach the 2dsphere index')
})

test('a status-only edit does not wipe derived fields', () => {
	assert.deepEqual(prepareListingData({}), {})
})

test('a real location is kept', () => {
	const geo = { type: 'Point', coordinates: [73.78, 18.56] }
	assert.deepEqual(prepareListingData({ geo }).geo, geo)
})

test('skipped optional fields do not break enum validation', () => {
	const data = prepareListingData({ furnishingType: '', security: '', city: 'Pune' })

	assert.deepEqual(data, { city: 'Pune' })
})
