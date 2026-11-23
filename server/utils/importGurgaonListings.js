// TESTING ONLY. Replaces the generated sample listings with real Gurgaon listings (see data/gurgaonListings.js).
//   node utils/importGurgaonListings.js           -> delete sample listings, (re)import the 50 Gurgaon listings
//   node utils/importGurgaonListings.js --remove  -> delete the imported Gurgaon listings only
import 'dotenv/config'
import mongoose from 'mongoose'
import Property from '../models/Property.js'
import User from '../models/User.js'
import Wishlist from '../models/Wishlist.js'
import Lead from '../models/Lead.js'
import { buildGurgaonListings, IMPORT_POSTER_PHONE } from '../data/gurgaonListings.js'

const SAMPLE_POSTER_PHONE = '9800000001' // owner of the generated listings from utils/seedSampleData.js

const deleteListings = async (filter, label) => {
	const ids = await Property.find(filter).distinct('_id')
	if (!ids.length) return 0
	// Saved and enquired entries would otherwise point at deleted listings
	await Wishlist.deleteMany({ property: { $in: ids } })
	await Lead.deleteMany({ property: { $in: ids } })
	const { deletedCount } = await Property.deleteMany({ _id: { $in: ids } })
	console.log(`Deleted ${deletedCount} ${label} listings`)
	return deletedCount
}

const run = async () => {
	await mongoose.connect(process.env.MONGO_URI)

	// Imported listings are recognised by their source, whoever they are attached to
	const imported = { sourceUrl: { $exists: true } }

	if (process.argv.includes('--remove')) {
		await deleteListings(imported, 'imported Gurgaon')
		return
	}

	const samplePoster = await User.findOne({ phoneNumber: SAMPLE_POSTER_PHONE })
	if (samplePoster) {
		await deleteListings({ postedBy: samplePoster._id, sourceUrl: { $exists: false } }, 'generated sample')
	}
	await deleteListings(imported, 'previously imported Gurgaon')

	let poster = await User.findOne({ phoneNumber: IMPORT_POSTER_PHONE })
	if (!poster) {
		poster = await User.create({
			phoneNumber: IMPORT_POSTER_PHONE,
			firstName: 'Imported',
			lastName: 'Listings',
			role: 'broker',
			isActive: true,
		})
	}

	const inserted = await Property.insertMany(buildGurgaonListings(poster._id))
	console.log(`Inserted ${inserted.length} Gurgaon listings`)
}

run()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => mongoose.disconnect())
