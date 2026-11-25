// TESTING ONLY: Gurgaon "mandate deals" from a broker's list shared on 2026-11-25. Factual fields only (project,
// sector, size, BHK, floor, facing, asking price). Duplicates in the list were merged, and Pareena Coban (1997 sq.ft)
// was left out because data/gurgaonListings.js already has it. Cheque/cash split notes were not copied.
// Pincodes are approximate per sector; pins come from data/gurgaonSocietyLocations.js (verified per society). Import or refresh only these with:
//   node utils/importGurgaonListings.js --mandate
import { SECTORS, KINDS, IMAGES } from './gurgaonListings.js'
import { locate } from './gurgaonSocietyLocations.js'

export const MANDATE_SOURCE = 'Mandate deal'

const LAKH = 100000
const CR = 10000000

// sector -> [lat, lng, pincode] (approximate), added to the ones gurgaonListings.js already has
const PLACES = {
	...SECTORS,
	'DLF Phase 1': [28.4755, 77.101, '122002'],
	'DLF Phase 2': [28.488, 77.089, '122002'],
	'DLF Phase 4': [28.466, 77.082, '122009'],
	'Palam Vihar': [28.511, 77.039, '122017'],
	'Sector 36A': [28.429, 76.978, '122004'],
	'Sector 45': [28.444, 77.066, '122003'],
	'Sector 53': [28.442, 77.098, '122011'],
	'Sector 60': [28.414, 77.084, '122101'],
	'Sector 61': [28.417, 77.092, '122101'],
	'Sector 63': [28.406, 77.089, '122101'],
	'Sector 68': [28.392, 77.048, '122101'],
	'Sector 70': [28.395, 77.029, '122101'],
	'Sector 72': [28.403, 77.044, '122101'],
	'Sector 76': [28.383, 77.018, '122004'],
	'Sector 77': [28.377, 77.01, '122004'],
	'Sector 89': [28.43, 76.96, '122004'],
	'Sector 92': [28.415, 76.939, '122004'],
	'Sector 102': [28.481, 76.988, '122006'],
	'Sector 104': [28.503, 77.001, '122006'],
	'Sector 106': [28.501, 77.016, '122006'],
	'Sector 109': [28.518, 77.012, '122017'],
	'Sector 112': [28.535, 77.033, '122017'],
	'Sector 113': [28.53, 77.024, '122017'],
	'Sohna Sector 35': [28.28, 77.045, '122103'],
	'Sidhrawali': [28.219, 76.642, '122413'],
}

const KIND_DEFS = { ...KINDS, plot: { type: 'Plot', selectedType: 'Plot / Land' } }
const PICTURES = { ...IMAGES, plot: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'] }

// s: society/project ('' = not in one), at: sector, k: kind, bhk: number or label ('' = not stated),
// size: number or list (sizes on offer), pair: sizes sold together, unit: 'sqft' | 'sqyd',
// price: total ₹ (null = price on request), rate: ₹ per unit (price = rate x smallest size), notes: shown as written
const ROWS = [
	{ s: '', at: 'DLF Phase 1', k: 'plot', size: 300, unit: 'sqyd', price: 11.5 * CR, notes: 'Block F · West facing · Excellent location' },
	{ s: 'Whiteland The Aspen & Blissville', at: 'Sector 76', k: 'apartment', size: [1311, 1371, 1628, 1656, 1672, 2290, 2330, 2540, 2740, 2766, 2795, 2936, 3243, 3695, 3890, 4038, 4054, 4454, 4645], unit: 'sqft', price: null, notes: 'Best deal available' },
	{ s: 'Dhoot Times Residency', at: 'Sector 63', k: 'apartment', bhk: '3 BHK + Servant', size: 1642, unit: 'sqft', price: 3.15 * CR },
	{ s: 'Heritage Max', at: 'Sector 102', k: 'apartment', bhk: '3 BHK + Servant', size: 2149, unit: 'sqft', price: 3.25 * CR, floor: 'Middle' },
	{ s: 'Smartworld One DXP', at: 'Sector 113', k: 'apartment', bhk: '3.5 BHK', size: 2138, unit: 'sqft', rate: 15500, notes: 'Corner · Highway facing · Book value ₹14,750/sq.ft + GST · Demand ₹15,500/sq.ft + GST' },
	{ s: 'Smartworld One DXP', at: 'Sector 113', k: 'apartment', bhk: '4.5 BHK', size: 3016, unit: 'sqft', rate: 15900, notes: 'Lagoon facing · Book value ₹13,700/sq.ft + GST · Demand ₹15,900/sq.ft + GST' },
	{ s: 'M3M Capital', at: 'Sector 113', k: 'apartment', bhk: '3.5 BHK', size: 2060, unit: 'sqft', rate: 16250, notes: 'Corner unit · ₹16,250/sq.ft' },
	{ s: 'Krisumi Waterfall Suites', at: 'Sector 36A', k: 'apartment', size: 1181, unit: 'sqft', price: null, floor: '1', notes: 'East facing · Global City view · Book value ₹16,000/sq.ft · Demand on call' },
	{ s: 'Adani Samsara', at: 'Sector 61', k: 'builderFloor', bhk: '3 BHK', size: 1725, unit: 'sqft', price: 4.1 * CR, floor: '3', notes: 'Block M · Terrace + basement' },
	{ s: 'Smartworld Orchard', at: 'Sector 60', k: 'builderFloor', bhk: '3 BHK', size: 1595, unit: 'sqft', price: 2.5 * CR, floor: '4', notes: 'Terrace + basement' },
	{ s: 'Pareena Mi Casa', at: 'Sector 68', k: 'apartment', bhk: '2 BHK', size: 1245, unit: 'sqft', price: 1.6 * CR, floor: 'Higher' },
	{ s: 'Ireo Uptown', at: 'Sector 66', k: 'apartment', bhk: '3 BHK + Servant', size: 1872, unit: 'sqft', price: 3.4 * CR, floor: 'Middle' },
	{ s: 'Smartworld The Edition', at: 'Sector 66', k: 'apartment', bhk: '3 BHK + Servant', size: 3035, unit: 'sqft', rate: 19160 + 2500, floor: 'Higher', notes: 'Book value ₹19,160/sq.ft + GST · Premium ₹2,500/sq.ft · 50:50 payment plan' },
	{ s: '', at: 'DLF Phase 1', k: 'builderFloor', bhk: '5 BHK + Pooja + Servant', size: 500, unit: 'sqyd', price: 9.5 * CR, floor: '4', ready: true, notes: 'Basement store · Full power backup · Gated community' },
	{ s: 'Central Park Flower Valley', at: 'Sohna Sector 35', k: 'plot', size: [250, 300], unit: 'sqyd', rate: 2.75 * LAKH, notes: 'Naksha pass for stilt + 4 floors · ₹2.75 lakh/sq.yd' },
	{ s: 'DLF Garden City', at: 'Sector 92', k: 'plot', pair: [502, 502], unit: 'sqyd', rate: 2 * LAKH, notes: '12 m wide road · East and west facing · ₹2 lakh/sq.yd' },
	{ s: '', at: 'Sector 45', k: 'plot', size: 342, unit: 'sqyd', rate: 3.2 * LAKH, notes: '14 marla · North-east facing · Map approved for stilt + 4 floors · Lane 1931–1941 · ₹3.20 lakh/sq.yd' },
	{ s: 'M3M Solitude', at: 'Sector 89', k: 'builderFloor', bhk: '3 BHK', size: 1365, unit: 'sqft', price: 1.57 * CR, floor: '1', ready: true, notes: 'With basement · Key in hand' },
	{ s: '3C Greenopolis', at: 'Sector 89', k: 'apartment', bhk: '3 BHK + Servant', size: 1954, unit: 'sqft', price: 1.8 * CR, floor: 'Middle', ready: true, notes: 'Key in hand' },
	{ s: 'BPTP Terra', at: 'Sector 37D', k: 'apartment', bhk: '3 BHK + Servant', size: 1877, unit: 'sqft', price: null, floor: 'Middle' },
	{ s: 'Parsvnath Exotica', at: 'Sector 53', k: 'apartment', bhk: '4 BHK + Servant', size: 3390, unit: 'sqft', price: 10 * CR, floor: 'Middle', notes: 'Golf Course Road' },
	{ s: 'BPTP Amstoria', at: 'Sector 102', k: 'plot', size: [225, 250, 282, 289, 303, 465, 495, 500], unit: 'sqyd', price: null, notes: 'Best deal available · Pair of 495 + 500 sq.yd with stilt + 4 floors naksha approved' },
	{ s: 'BPTP Amstoria', at: 'Sector 102', k: 'builderFloor', bhk: '3 BHK', size: 303, unit: 'sqyd', price: 3 * CR, floor: '2', notes: 'Built by BPTP' },
	{ s: 'Suncity Platinum Towers', at: 'Sector 28', k: 'apartment', bhk: '4 BHK + Servant', size: 4175, unit: 'sqft', price: 17 * CR, notes: 'M.G. Road · 3 car parkings · Extraordinary interiors' },
	{ s: 'Signature Global Sidhrawali', at: 'Sidhrawali', k: 'plot', size: 179, unit: 'sqyd', rate: 1.15 * LAKH, notes: 'On main NH-48 · Corner · 2 sides open · ₹1.15 lakh/sq.yd' },
	{ s: 'Ireo The Corridors', at: 'Sector 67', k: 'apartment', bhk: '3 BHK', size: 1920, unit: 'sqft', price: 3.2 * CR },
	{ s: 'DLF Beverly Park 2', at: 'DLF Phase 2', k: 'apartment', bhk: '3 BHK + Study + Servant', size: 3086, unit: 'sqft', price: 9 * CR, floor: 'Middle' },
	{ s: 'DLF Windsor Court', at: 'DLF Phase 4', k: 'apartment', bhk: '4 BHK + Servant', size: 2950, unit: 'sqft', price: 9.25 * CR, floor: 'Middle', notes: '2 car parkings' },
	{ s: 'Orris Woodview Residences', at: 'Sector 89', k: 'plot', size: 240, unit: 'sqyd', rate: 2.15 * LAKH, notes: '24 m wide road · ₹2.15 lakh/sq.yd' },
	{ s: 'ATS Tourmaline', at: 'Sector 109', k: 'apartment', size: 1750, unit: 'sqft', price: 2.35 * CR, floor: 'Middle' },
	{ s: 'M3M Golf Estate', at: 'Sector 65', k: 'apartment', bhk: '3 BHK + Den', size: 2998, unit: 'sqft', price: 7.5 * CR, floor: 'Middle' },
	{ s: '', at: 'DLF Phase 1', k: 'plot', size: 502, unit: 'sqyd', price: null, notes: '12 m wide road' },
	{ s: '', at: 'DLF Phase 1', k: 'house', bhk: '6 BHK + Servant', size: 502, unit: 'sqyd', price: null, furnished: true, notes: 'Built-up kothi · 24 m wide road' },
	{ s: 'BPTP Astaire Garden', at: 'Sector 70', k: 'plot', pair: [389, 411], unit: 'sqyd', price: null, notes: 'North facing · 84 m wide road' },
	// Sector not given in the list; flat-finder has it as "Ireo Savannah", Sector 35 Sohna
	{ s: 'Ireo Savana', at: 'Sohna Sector 35', k: 'plot', size: [128, 179], unit: 'sqyd', price: null, notes: 'East facing · 18 m wide road' },
	{ s: 'Adani Deen Dayal Plots', at: 'Sector 102', k: 'plot', size: [123, 135], unit: 'sqyd', rate: 3.3 * LAKH, notes: 'Deen Dayal scheme · Naksha pass for stilt + 4 floors · Dwarka Expressway · ₹3.30 lakh/sq.yd' },
	{ s: 'Nirvana Country Deerwood', at: 'Sector 50', k: 'villa', bhk: '3 BHK + Study + Servant', size: 360, unit: 'sqyd', price: 16 * CR, notes: 'Simplex villa · 12 m wide road · Nicely done up' },
	{ s: '', at: 'Palam Vihar', k: 'plot', size: 802, unit: 'sqyd', price: 15 * CR, notes: 'East facing · 18 m wide road' },
	{ s: 'ATS Triumph', at: 'Sector 104', k: 'apartment', size: 3150, unit: 'sqft', price: 4.15 * CR, notes: 'Sun facing · 2 car parkings · Dwarka Expressway' },
	{ s: 'Godrej Meridian', at: 'Sector 106', k: 'apartment', bhk: '3 BHK + Servant', size: 1855, unit: 'sqft', price: 3.18 * CR, floor: 'Middle', notes: 'Tower 1 · Internal facing' },
	{ s: 'DLF Privana South', at: 'Sector 77', k: 'apartment', bhk: '4 BHK + Servant', size: 3577, unit: 'sqft', price: null, floor: 'Middle', notes: 'Tower F, unit 02' },
	{ s: 'Emaar Urban Ascent', at: 'Sector 112', k: 'apartment', bhk: '4 BHK + Servant', size: 2750, unit: 'sqft', price: null, floor: 'Middle' },
	{ s: 'Elan The Presidential', at: 'Sector 106', k: 'apartment', size: [2450, 2700, 3075, 3395, 4095, 4495], unit: 'sqft', price: null, notes: 'Best deal available' },
	{ s: 'Nirvana Country 2', at: 'Sector 72', k: 'plot', size: 678, unit: 'sqyd', rate: 2.85 * LAKH, notes: 'SPR Road · Corner · 3 sides open · ₹2.85 lakh/sq.yd' },
]

const UNIT = { sqft: { label: 'sq.ft', store: 'sq.ft', toSqFt: 1 }, sqyd: { label: 'sq.yd', store: 'sq.yards', toSqFt: 9 } }
const fmt = (n) => n.toLocaleString('en-IN')

export const buildMandateDeals = (postedBy) =>
	ROWS.map((row, index) => {
		const { s: society, at, k, bhk = '', unit, rate, notes = '', floor = '', ready, furnished } = row
		const u = UNIT[unit]
		const sizes = row.pair || [].concat(row.size)
		const size = row.pair ? sizes.reduce((a, b) => a + b, 0) : Math.min(...sizes)
		const sizeText = row.pair
			? `${sizes.map(fmt).join(' + ')} ${u.label} (pair)`
			: sizes.length > 1 ? `${fmt(sizes[0])}–${fmt(sizes[sizes.length - 1])} ${u.label}` : `${fmt(size)} ${u.label}`
		const price = row.price !== undefined ? row.price : Math.round(rate * size)
		const [sectorLat, sectorLng, pincode] = PLACES[at]
		const [lat, lng] = locate(society, at, [sectorLat, sectorLng])
		const locality = at
		const { type, selectedType } = KIND_DEFS[k]
		const label = typeof bhk === 'number' ? `${bhk} BHK` : bhk
		const where = society ? `${society}, ${locality}` : locality
		const image = PICTURES[k][index % PICTURES[k].length]
		const areaSqFt = Math.round(size * u.toSqFt)
		const sizeList = sizes.length > 1 && !row.pair ? `Sizes on offer: ${sizes.map(fmt).join(', ')} ${u.label}.` : ''
		const rateNote = rate && sizes.length > 1 && !row.pair ? ` Price shown is for the ${fmt(size)} ${u.label} option.` : ''

		return {
			postedBy,
			lookingTo: 'buy',
			propertyCategory: 'residential',
			selectedType,
			type,
			role: 'broker',
			postedByType: 'broker',
			dealer: MANDATE_SOURCE,

			title: `${label ? `${label} ` : ''}${type} in ${society || locality}`,
			description: [
				`${label ? `${label} ` : ''}${type.toLowerCase()} for sale in ${where}, Gurugram.`,
				notes ? `${notes}.` : '',
				sizeList,
				rateNote.trim(),
				'Test listing from a broker mandate list; details may be outdated.',
			].filter(Boolean).join(' '),

			city: 'Gurugram',
			state: 'Haryana',
			locality,
			societyName: society || undefined,
			address: `${where}, Gurugram, Haryana`,
			pincode,
			locationLabel: `${where}, Gurugram`,
			geo: { type: 'Point', coordinates: [lng, lat] },

			price: price ? String(price) : 'Price on request',
			priceNumeric: price || null,
			pricePerSqFt: price ? Math.round(price / areaSqFt) : null,

			plotArea: String(size),
			plotAreaUnit: u.store,
			plotAreaNumeric: size,
			areaSqFt,
			area: sizeText,
			...(k === 'plot' ? {} : { superBuiltupArea: unit === 'sqft' ? String(size) : '' }),

			bhk: label,
			bhkNumeric: parseFloat(label) || null,
			bedrooms: label,
			floor,
			...(furnished ? { furnishingType: 'fully-furnished' } : {}),
			availabilityStatus: ready ? 'Ready to move' : '',
			readyForOccupancy: ready || undefined,

			image,
			images: [image],
			tags: [MANDATE_SOURCE, ...(ready ? ['Ready to move'] : []), ...(price ? [] : ['Price on request'])],
			status: 'active',

			sourceName: MANDATE_SOURCE,
		}
	})
