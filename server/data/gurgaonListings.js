// TESTING ONLY: 50 real Gurgaon listings, factual fields only (society, sector, price, BHK, area, floor, furnishing),
// collected on 2026-11-23 from public listing pages. No phone numbers, personal names, photos or description text
// were copied. Listings may since have been sold or rented. Remove before launch:
//   node utils/importGurgaonListings.js --remove
// Pincodes are approximate per sector; pins come from data/gurgaonSocietyLocations.js (verified per society).

import { locate } from './gurgaonSocietyLocations.js'

export const IMPORT_POSTER_PHONE = '9800000003' // 9800000001 = sample listings, 9800000002 = sample projects

const NB = 'NoBroker'
const SY = 'Square Yards'
const CF = 'CommonFloor'
const SY_SALE = 'https://www.squareyards.com/sale/property-for-sale-in-gurgaon'
const SY_RENT = 'https://www.squareyards.com/rent/property-for-rent-in-gurgaon'
const NB_BUY = 'https://www.nobroker.in/property/buy'
const NB_RENT = 'https://www.nobroker.in/property'

// sector -> [lat, lng, pincode] (approximate)
export const SECTORS = {
	'Sector 10A': [28.4495, 76.999, '122001'],
	'Sector 14': [28.471, 77.045, '122001'],
	'Sector 15': [28.458, 77.041, '122001'],
	'Sector 24': [28.492, 77.1, '122002'],
	'Sector 28': [28.474, 77.094, '122002'],
	'Sector 31': [28.451, 77.053, '122001'],
	'Sector 37': [28.435, 77.007, '122004'],
	'Sector 37C': [28.447, 76.987, '122004'],
	'Sector 37D': [28.4449, 76.9847, '122004'],
	'Sector 39': [28.444, 77.056, '122003'],
	'Sector 41': [28.456, 77.07, '122001'],
	'Sector 43': [28.458, 77.083, '122009'],
	'Sector 47': [28.422, 77.048, '122018'],
	'Sector 49': [28.415, 77.056, '122018'],
	'Sector 50': [28.412, 77.068, '122018'],
	'Sector 51': [28.428, 77.065, '122018'],
	'Sector 52': [28.437, 77.075, '122003'],
	'Sector 54': [28.438, 77.1, '122011'],
	'Sector 56': [28.426, 77.104, '122011'],
	'Sector 63A': [28.397, 77.095, '122101'],
	'Sector 65': [28.401, 77.078, '122101'],
	'Sector 66': [28.396, 77.065, '122101'],
	'Sector 67': [28.388, 77.059, '122101'],
	'Sector 69': [28.397, 77.032, '122101'],
	'Sector 70A': [28.399, 77.019, '122101'],
	'Sector 71': [28.406, 77.035, '122101'],
	'Sector 79': [28.379, 76.996, '122004'],
	'Sector 84': [28.396, 76.959, '122004'],
	'Sector 88A': [28.421, 76.953, '122004'],
	'Sector 99A': [28.487, 76.997, '122505'],
	'Sector 103': [28.495, 76.999, '122006'],
	'Sector 108': [28.506, 77.004, '122017'],
	'Sohna Sector 4': [28.247, 77.065, '122103'],
	'Sohna Sector 36': [28.273, 77.035, '122103'],
}

// [lookingTo, kind, bhk (0 = 1 RK), society, sector, price in ₹ (monthly for rent), area sq.ft, area basis,
//  floor, totalFloors, furnishing, availability, postedByType, maintenance/month, source, sourceUrl]
const ROWS = [
	// ---- Sale ----
	['buy', 'apartment', 3, 'BPTP Spacio', 'Sector 37D', 20000000, 1303, '', '', '', 'fully-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-37d-gurgaon/8a9f8fc3918d7fca01918de7a7b924ea/detail`],
	['buy', 'apartment', 3, 'Smartworld The Edition', 'Sector 66', 71100000, 3078, '', '', '', 'unfurnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-66-gurgaon/8aa9ae02a1d2f81401a1d3cc83e602ec/detail`],
	['buy', 'apartment', 3, 'Landmark Avenue', 'Sector 43', 34000000, 1650, '', '', '', 'fully-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sushant-lok-i-gurgaon/8a9fa5827891b871017891fdf5511eff/detail`],
	['buy', 'apartment', 3, 'The Peach Jasmine CGHS', 'Sector 31', 20000000, 2100, '', '', '', 'fully-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-31-gurgaon/8aa9afcaa201512d01a20219e58e7ffb/detail`],
	['buy', 'apartment', 3, 'Tulip White', 'Sector 69', 15000000, 1326, '', '', '', 'semi-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-69-gurgaon/8aa9af26a203083c01a203535b9a3467/detail`],
	['buy', 'apartment', 3, 'Malibu Towne', 'Sector 47', 32500000, 1940, '', '', '', 'semi-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-47-gurgaon/8aa9b9ad9ce14944019ce14e3a960111/detail`],
	['buy', 'apartment', 3, 'Sanskriti Apartments', 'Sector 43', 25000000, 1436, '', '', '', 'semi-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-gh5-block-d-sushant-lok-phase-i-sector-43-gurugram-haryana-122009-india-gurgaon/8aa9afa9a1f9601201a1f9d299a82a1c/detail`],
	['buy', 'apartment', 3, 'Pratham Meghdoot Apartments', 'Sector 10A', 15000000, 1485, '', '', '', 'unfurnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-10a-gurgaon-gurgaon/8a9f95827c60775b017c647aee3c1b9c/detail`],
	['buy', 'apartment', 3, 'M2K Aura', 'Sector 47', 25000000, 1725, '', '', '', 'fully-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-47-gurgaon/8a9fa38394c0c0af0194c0eee36712db/detail`],
	['buy', 'apartment', 4, 'Emaar Emerald Hill', 'Sector 65', 70000000, 3645, '', '', '', 'semi-furnished', '', '', null, NB, `${NB_BUY}/4-bhk-apartment-for-sale-in-sector-65-gurgaon/8aa9ac4da206771d01a206a152c40e49/detail`],
	['buy', 'apartment', 4, 'Sahara Grace Condominium', 'Sector 28', 90000000, 4000, '', '', '', 'fully-furnished', '', '', null, NB, `${NB_BUY}/4-bhk-apartment-for-sale-in-sector-28-gurgaon/8aa99892a201512c01a201d2c3764924/detail`],
	['buy', 'apartment', 4, 'Pareena Coban', 'Sector 99A', 25000000, 1997, '', '', '', 'unfurnished', '', '', null, NB, `${NB_BUY}/4-bhk-apartment-for-sale-in-sector-99a-gurgaon/8a9f9e839a5cb32f019a5cb88fea0097/detail`],
	['buy', 'apartment', 3, 'Jalvayu Towers', 'Sector 56', 32500000, 1700, '', '', '', 'semi-furnished', '', '', null, NB, `${NB_BUY}/3-bhk-apartment-for-sale-in-sector-56-gurgaon/8aa9a9239a917c9b019a919fa6c90f27/detail`],
	['buy', 'apartment', 4, 'Birla Avik', 'Sector 63A', 81500000, 3900, '', '', '', 'unfurnished', '', '', null, NB, `${NB_BUY}/4-bhk-apartment-for-sale-in-sector-63a-gurgaon/8aa99e84a1d3d34401a1d486d9a07330/detail`],
	['buy', 'apartment', 4, 'Godrej Alira', 'Sector 39', 74100000, 3167, '', '', '', 'unfurnished', '', '', null, NB, `${NB_BUY}/4-bhk-apartment-for-sale-in-sector-39-gurgaon/8aa9a484a1d3d3ac01a1d46f50df64b4/detail`],
	['buy', 'apartment', 4, 'Smartworld The Edition', 'Sector 66', 86700000, 3755, '', '', '', 'unfurnished', '', '', null, NB, `${NB_BUY}/4-bhk-apartment-for-sale-in-sector-66-gurgaon/8aa9a0d4a1d2f81b01a1d3cca9710570/detail`],
	['buy', 'apartment', 3, 'Shakti Apartments', 'Sector 15', 22500000, 1100, 'carpet', 'Ground', '', '', 'Ready to move', 'owner', null, CF, 'https://www.commonfloor.com/listing/3-bhk-apartment-for-sale-in-sector-15-gurgaon-at-shakti-apartments-sector-15-/q430se7ohc43qdv3'],
	['buy', 'builderFloor', 3, '', 'Sector 51', 24000000, 1440, 'carpet', '2', '', 'semi-furnished', 'Ready to move', 'owner', null, CF, 'https://www.commonfloor.com/listing/semi-furnished-3bhk-builderfloor-for-sale-in-sector-51-gurgaon/p0n49205bkhe88jv'],
	['buy', 'apartment', 2, 'Signature The Serenas', 'Sohna Sector 36', 7500000, 614, 'superBuiltup', '', '', 'fully-furnished', 'Ready to move', 'broker', null, SY, SY_SALE],
	['buy', 'apartment', 2, 'GLS Arawali Homes', 'Sohna Sector 4', 4000000, 580, 'superBuiltup', '5', '13', '', 'Ready to move', 'broker', null, SY, SY_SALE],
	['buy', 'builderFloor', 1, '', 'Sector 28', 3000000, 550, 'superBuiltup', '3', '4', '', 'Ready to move', 'broker', null, SY, SY_SALE],
	['buy', 'apartment', 3, 'Signature Global City', 'Sector 37D', 15600000, 1250, 'superBuiltup', '2', '4', '', 'Ready to move', 'broker', null, SY, SY_SALE],
	['buy', 'apartment', 3, 'Sobha City Gurgaon', 'Sector 108', 44500000, 2134, 'builtup', '1', '19', 'semi-furnished', 'Ready to move', 'owner', null, SY, SY_SALE],
	['buy', 'builderFloor', 2, 'Uppal Southend', 'Sector 49', 14900000, 925, 'builtup', '1', '2', '', 'Ready to move', 'broker', null, SY, SY_SALE],
	['buy', 'apartment', 2, 'Apex Our Homes', 'Sector 37C', 6050000, 580, 'carpet', '9', '11', '', 'Ready to move', 'broker', null, SY, SY_SALE],

	// ---- Rent ----
	['rent', 'apartment', 1, 'Joy Central', 'Sector 63A', 12000, 540, 'builtup', '', '', 'semi-furnished', 'Available from 25 Nov 2026', '', null, NB, `${NB_RENT}/1-bhk-apartment-for-rent-in-sector-63a-gurgaon-for-rs-12000/8a9fa18499c7cc510199c8084fd12261/detail`],
	['rent', 'apartment', 2, 'Sudham Apartment', 'Sector 14', 30000, 2000, 'builtup', '', '', 'semi-furnished', 'Available from 28 Nov 2026', '', null, NB, `${NB_RENT}/2-bhk-apartment-for-rent-in-sector-14-gurgaon-for-rs-30000/8aa9ae5e9fbd0dc6019fbd166139038f/detail`],
	['rent', 'apartment', 1, 'Ardee City', 'Sector 52', 32000, 650, 'builtup', '', '', 'fully-furnished', 'Ready to move', '', null, NB, `${NB_RENT}/1-bhk-apartment-for-rent-in-sector-52-gurgaon-for-rs-32000/8aa9a618a206771401a206bcac0f1aa7/detail`],
	['rent', 'apartment', 3, 'Experion The Heartsong', 'Sector 108', 47000, 2338, 'builtup', '', '', 'semi-furnished', 'Ready to move', '', 8000, NB, `${NB_RENT}/3-bhk-apartment-for-rent-in-sector-108-gurgaon-for-rs-47000/8a9f84827abedd3a017abf35e19a2ea9/detail`],
	['rent', 'apartment', 3, 'Ramprastha City', 'Sector 37', 34000, 1800, 'builtup', '', '', 'semi-furnished', 'Available from 30 Nov 2026', '', null, NB, `${NB_RENT}/3-bhk-apartment-for-rent-in-sector-37-gurgaon-for-rs-34000/8a9fad83944904b8019449575d15119e/detail`],
	['rent', 'apartment', 3, 'Park View Apartment', 'Sector 56', 65000, 2200, 'builtup', '', '', 'semi-furnished', 'Available from 1 Jan 2027', '', 3500, NB, `${NB_RENT}/3-bhk-apartment-for-rent-in-sector-56-gurgaon-for-rs-65000/8a9f898496519aff019651d7f5121bc8/detail`],
	['rent', 'apartment', 2, 'Signature Global Andour Heights', 'Sector 71', 24000, 750, 'builtup', '', '', 'semi-furnished', 'Ready to move', '', 3500, NB, `${NB_RENT}/2-bhk-apartment-for-rent-in-sector-71-gurgaon-for-rs-24000/8a9f92838b311d2d018b31fb341073bb/detail`],
	['rent', 'apartment', 3, 'Princeton Floors', 'Sector 51', 45000, 1550, 'builtup', '', '', 'semi-furnished', 'Ready to move', '', 2550, NB, `${NB_RENT}/3-bhk-apartment-for-rent-in-sector-51-gurgaon-for-rs-45000/8a9f82a2a1154eec01a115b898ce11cb/detail`],
	['rent', 'apartment', 3, 'South City 1, Block K', 'Sector 41', 80000, 1500, 'builtup', '', '', 'fully-furnished', 'Ready to move', '', null, NB, `${NB_RENT}/3-bhk-apartment-for-rent-in-block-k-south-city-1-sector-41-gurgaon-for-rs-80000/8a9fb083964e261701964e7832c31c55/detail`],
	['rent', 'villa', 3, 'SS Almeria', 'Sector 84', 40000, 2000, 'builtup', '', '', 'semi-furnished', 'Ready to move', '', 6700, NB, `${NB_RENT}/3-bhk-apartment-for-rent-in-sector-84-gurgaon-for-rs-40000/8a9f82e3a0f2170c01a0f28c49f415e0/detail`],
	['rent', 'apartment', 3, 'Mapsko Mountville', 'Sector 79', 35000, 1620, 'builtup', '', '', 'semi-furnished', 'Available from 30 Nov 2026', '', 6000, NB, `${NB_RENT}/3-bhk-apartment-for-rent-in-sector-79-gurgaon-for-rs-35000/8a9faf857d57da17017d584e922323d6/detail`],
	['rent', 'apartment', 2, 'Satya The Hermitage', 'Sector 103', 24500, 1200, 'builtup', '', '', 'semi-furnished', 'Available from 25 Nov 2026', '', 3500, NB, `${NB_RENT}/2-bhk-apartment-for-rent-in--dwarka-expy-sector-103-gurugram-haryana-122006-india-gurgaon-for-rs-24500/8aa9af65a1fde1ca01a1fe32d83436b3/detail`],
	['rent', 'apartment', 0, '', 'Sector 43', 12000, 250, 'builtup', '', '', 'fully-furnished', 'Available from 26 Nov 2026', '', 500, NB, `${NB_RENT}/1-rk-apartment-for-rent-in-sector-43-gurgaon-for-rs-12000/8a9fbf827ef85586017ef8a1d4ea25e3/detail`],
	['rent', 'house', 0, 'DLF Phase 3, U Block', 'Sector 24', 18000, 270, 'builtup', '', '', 'fully-furnished', 'Available from 26 Nov 2026', '', 500, NB, `${NB_RENT}/1-rk-apartment-for-rent-in-sector-24-gurgaon-for-rs-18000/8aa9a02da1fe868a01a2012ec27405eb/detail`],
	['rent', 'house', 2, '', 'Sector 51', 28000, 1520, 'builtup', '', '', 'fully-furnished', 'Ready to move', '', null, NB, `${NB_RENT}/2-bhk-apartment-for-rent-in-sector-51-gurgaon-for-rs-28000/8a9fb5827c7e6a2c017c825008b97b82/detail`],
	['rent', 'builderFloor', 0, '', 'Sector 51', 23000, 600, 'builtup', '2', '4', 'fully-furnished', '', 'broker', null, SY, SY_RENT],
	['rent', 'apartment', 2, 'Pyramid Urban Homes', 'Sector 70A', 25007, 625, 'superBuiltup', '10', '14', 'semi-furnished', '', 'broker', null, SY, SY_RENT],
	['rent', 'apartment', 3, 'Mapsko Mount Ville', 'Sector 79', 40000, 1620, 'superBuiltup', '1', '25', 'semi-furnished', '', 'broker', null, SY, SY_RENT],
	['rent', 'apartment', 2, 'HBH Galaxy Apartments', 'Sector 43', 23000, 1250, 'builtup', '7', '13', 'fully-furnished', '', 'owner', null, SY, SY_RENT],
	['rent', 'apartment', 3, 'CHD Avenue 71', 'Sector 71', 51000, 1802, 'superBuiltup', '14', '17', 'fully-furnished', '', 'broker', null, SY, SY_RENT],
	['rent', 'builderFloor', 3, 'Anant Raj The Estate Floors', 'Sector 63A', 80000, 2400, 'builtup', '4', '4', 'fully-furnished', '', 'broker', null, SY, SY_RENT],
	['rent', 'builderFloor', 4, 'Eros Rosewood Villas', 'Sector 50', 95000, 2500, 'builtup', '2', '4', 'fully-furnished', '', 'broker', null, SY, SY_RENT],
	['rent', 'apartment', 3, 'M3M Merlin', 'Sector 67', 70000, 2025, 'superBuiltup', '5', '12', 'semi-furnished', '', 'broker', null, SY, SY_RENT],
	['rent', 'apartment', 3, 'DLF Park Place', 'Sector 54', 165000, 2282, 'builtup', '8', '30', 'semi-furnished', '', 'owner', null, SY, SY_RENT],
	['rent', 'apartment', 2, 'Godrej Oasis', 'Sector 88A', 33000, 1307, 'superBuiltup', '2', '20', 'semi-furnished', '', 'broker', null, SY, SY_RENT],
]

export const KINDS = {
	apartment: { type: 'Apartment', selectedType: 'Flat / Apartment' },
	builderFloor: { type: 'Builder Floor', selectedType: 'Independent / Builder Floor' },
	villa: { type: 'Villa', selectedType: 'Independent House / Villa' },
	house: { type: 'Independent House', selectedType: 'Independent House / Villa' },
}

export const IMAGES = {
	apartment: [
		'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
		'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
		'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
		'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
	],
	builderFloor: [
		'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
		'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
	],
	villa: [
		'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
		'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
	],
}
IMAGES.house = IMAGES.villa

const formatSqFt = (value) => `${value.toLocaleString('en-IN')} sq.ft.`

export const buildGurgaonListings = (postedBy) =>
	ROWS.map((row, index) => {
		const [
			lookingTo, kind, bhk, society, sector, price, areaSqFt, areaBasis,
			floor, totalFloors, furnishing, availability, postedByType, maintenance, sourceName, sourceUrl,
		] = row
		const [sectorLat, sectorLng, pincode] = SECTORS[sector]
		const [lat, lng] = locate(society, sector, [sectorLat, sectorLng])
		const { type, selectedType } = KINDS[kind]
		const bhkLabel = bhk === 0 ? '1 RK' : `${bhk} BHK`
		const where = society ? `${society}, ${sector}` : sector
		const images = IMAGES[kind]
		const image = images[index % images.length]

		return {
			postedBy,
			lookingTo,
			propertyCategory: 'residential',
			selectedType,
			type,
			role: postedByType || 'owner',
			postedByType: postedByType || 'owner',
			dealer: `Via ${sourceName}`,

			title: `${bhkLabel} ${type} in ${society || sector}`,
			description: `${bhkLabel} ${type.toLowerCase()} ${lookingTo === 'rent' ? 'for rent' : 'for sale'} in ${where}, Gurugram. Test listing imported from ${sourceName}; details may be outdated.`,

			city: 'Gurugram',
			state: 'Haryana',
			locality: sector,
			societyName: society || undefined,
			address: `${where}, Gurugram, Haryana`,
			pincode,
			locationLabel: `${where}, Gurugram`,
			geo: { type: 'Point', coordinates: [lng, lat] },

			price: String(price),
			priceNumeric: price,
			pricePerSqFt: lookingTo === 'buy' ? Math.round(price / areaSqFt) : null,
			maintenanceCharges: maintenance || undefined,

			plotArea: String(areaSqFt),
			plotAreaUnit: 'sq.ft',
			areaSqFt,
			area: formatSqFt(areaSqFt),
			carpetArea: areaBasis === 'carpet' ? String(areaSqFt) : '',
			builtupArea: areaBasis === 'builtup' ? String(areaSqFt) : '',
			superBuiltupArea: areaBasis === 'superBuiltup' ? String(areaSqFt) : '',

			bhk: bhkLabel,
			bhkNumeric: bhk || 1,
			bedrooms: bhkLabel,
			floor,
			totalFloors,
			...(furnishing ? { furnishingType: furnishing } : {}),
			availabilityStatus: availability,

			image,
			images: [image],
			tags: [`From ${sourceName}`, ...(availability ? [availability] : [])],
			status: 'active',

			sourceName,
			sourceUrl,
		}
	})
