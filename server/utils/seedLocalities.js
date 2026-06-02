import Locality from '../models/Locality.js'

// Simplified locality data for testing
const LOCALITIES_DATA = [
	// Delhi
	{
		name: 'Sector 57',
		city: 'Gurugram',
		state: 'Haryana',
		avgPricePerSqFt: 14500,
		growthPercentage: 5.2,
		coordinates: { lat: 28.4595, lng: 77.0592 },
		geo: { type: 'Point', coordinates: [77.0592, 28.4595] },
		ratings: { safety: 8.5, connectivity: 9.2, lifestyle: 8.4, overall: 8.7 },
		amenities: {
			schools: 5,
			hospitals: 7,
			metro: true,
			markets: 10,
			parks: 3,
			malls: 4,
			banks: 8,
		},
		pros: ['Great Connectivity', 'Modern Infrastructure', 'Metro Accessible'],
		cons: ['Traffic', 'Higher Cost'],
		priceTrend: [
			{ month: 'Jan 2024', averagePrice: 13800 },
			{ month: 'Feb 2024', averagePrice: 14000 },
			{ month: 'Mar 2024', averagePrice: 14200 },
			{ month: 'Apr 2024', averagePrice: 14500 },
		],
		neighboringLocalities: ['Sector 56', 'Sector 50'],
		description: 'Prime residential locality in Gurugram with excellent connectivity',
		searchCount: 8543,
		isPopular: true,
		developmentStatus: 'mature',
	},
	{
		name: 'Dwarka',
		city: 'Delhi',
		state: 'Delhi',
		avgPricePerSqFt: 8500,
		growthPercentage: 7.2,
		coordinates: { lat: 28.5921, lng: 77.0434 },
		geo: { type: 'Point', coordinates: [77.0434, 28.5921] },
		ratings: { safety: 7.8, connectivity: 8.1, lifestyle: 7.5, overall: 7.8 },
		amenities: {
			schools: 8,
			hospitals: 5,
			metro: true,
			markets: 8,
			parks: 5,
			malls: 3,
			banks: 6,
		},
		pros: ['Metro Accessible', 'Family Friendly', 'Affordable'],
		cons: ['Limited Shopping', 'Emerging Area'],
		priceTrend: [
			{ month: 'Jan 2024', averagePrice: 7800 },
			{ month: 'Feb 2024', averagePrice: 8000 },
			{ month: 'Mar 2024', averagePrice: 8200 },
			{ month: 'Apr 2024', averagePrice: 8500 },
		],
		neighboringLocalities: ['Sector 10', 'Dwarka Mor'],
		description: 'Family-friendly locality with metro access',
		searchCount: 6234,
		isPopular: true,
		developmentStatus: 'developed',
	},
	// Bangalore
	{
		name: 'Indiranagar',
		city: 'Bangalore',
		state: 'Karnataka',
		avgPricePerSqFt: 12000,
		growthPercentage: 6.5,
		coordinates: { lat: 13.0359, lng: 77.6399 },
		geo: { type: 'Point', coordinates: [77.6399, 13.0359] },
		ratings: { safety: 8.2, connectivity: 8.5, lifestyle: 8.8, overall: 8.5 },
		amenities: {
			schools: 6,
			hospitals: 8,
			metro: true,
			markets: 12,
			parks: 4,
			malls: 5,
			banks: 7,
		},
		pros: ['Tech Hub', 'Nightlife', 'Cafes and Restaurants'],
		cons: ['Traffic', 'High Rent'],
		priceTrend: [
			{ month: 'Jan 2024', averagePrice: 11000 },
			{ month: 'Feb 2024', averagePrice: 11500 },
			{ month: 'Mar 2024', averagePrice: 11750 },
			{ month: 'Apr 2024', averagePrice: 12000 },
		],
		neighboringLocalities: ['Koramangala', 'Whitefield'],
		description: 'Vibrant locality popular with IT professionals',
		searchCount: 9876,
		isPopular: true,
		developmentStatus: 'developed',
	},
	// Mumbai
	{
		name: 'Bandra',
		city: 'Mumbai',
		state: 'Maharashtra',
		avgPricePerSqFt: 22000,
		growthPercentage: 4.2,
		coordinates: { lat: 19.0596, lng: 72.8295 },
		geo: { type: 'Point', coordinates: [72.8295, 19.0596] },
		ratings: { safety: 8.0, connectivity: 8.7, lifestyle: 9.0, overall: 8.6 },
		amenities: {
			schools: 4,
			hospitals: 6,
			metro: true,
			markets: 15,
			parks: 2,
			malls: 6,
			banks: 9,
		},
		pros: ['Glamorous Area', 'Beach Access', 'Entertainment'],
		cons: ['Very Expensive', 'Crowded'],
		priceTrend: [
			{ month: 'Jan 2024', averagePrice: 20500 },
			{ month: 'Feb 2024', averagePrice: 21000 },
			{ month: 'Mar 2024', averagePrice: 21500 },
			{ month: 'Apr 2024', averagePrice: 22000 },
		],
		neighboringLocalities: ['Worli', 'Kala Ghoda'],
		description: 'Premium locality in Mumbai with beach proximity',
		searchCount: 11234,
		isPopular: true,
		developmentStatus: 'mature',
	},
]

export const seedLocalities = async () => {
	try {
		const existingCount = await Locality.countDocuments()
		if (existingCount > 0) {
			console.log(`🔄 Clearing ${existingCount} old localities for fresh seed...`)
			await Locality.deleteMany({})
		}

		console.log('🌱 Seeding sample localities...')
		const result = await Locality.insertMany(LOCALITIES_DATA)
		console.log(`✓ Successfully seeded ${result.length} sample localities`)
		return { inserted: result.length, skipped: false }
	} catch (error) {
		console.error('❌ Error seeding localities:', error.message)
		return { inserted: 0, error: error.message }
	}
}
