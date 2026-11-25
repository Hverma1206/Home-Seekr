// TESTING ONLY. Replaces the generated sample listings with real Gurgaon listings (see data/gurgaonListings.js).
//   node utils/importGurgaonListings.js           -> delete sample listings, (re)import the 50 Gurgaon listings
//   node utils/importGurgaonListings.js --remove  -> delete the imported Gurgaon listings only (both sets)
//   node utils/importGurgaonListings.js --mandate -> (re)import only the broker mandate deals (data/gurgaonMandateDeals.js)
//   node utils/importGurgaonListings.js --locations -> move the 50 imported listings to their verified pins, in place
import 'dotenv/config'
import mongoose from 'mongoose'
import Property from '../models/Property.js'
import User from '../models/User.js'
import Wishlist from '../models/Wishlist.js'
import Lead from '../models/Lead.js'
import { buildGurgaonListings, IMPORT_POSTER_PHONE } from '../data/gurgaonListings.js'
import { buildMandateDeals, MANDATE_SOURCE } from '../data/gurgaonMandateDeals.js'
import { locate } from '../data/gurgaonSocietyLocations.js'

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
	const mandate = { sourceName: MANDATE_SOURCE }
	const imported = { $or: [{ sourceUrl: { $exists: true } }, mandate] }

	if (process.argv.includes('--remove')) {
		await deleteListings(imported, 'imported Gurgaon')
		return
	}

	if (process.argv.includes('--locations')) {
		// Updating in place keeps listing ids, so saved and enquired entries stay valid
		const docs = await Property.find({ sourceUrl: { $exists: true } }).select('societyName locality geo').lean()
		let moved = 0
		for (const d of docs) {
			const [oldLng, oldLat] = d.geo.coordinates
			const [lat, lng] = locate(d.societyName, d.locality, [oldLat, oldLng])
			if (lat === oldLat && lng === oldLng) continue
			await Property.updateOne({ _id: d._id }, { $set: { 'geo.coordinates': [lng, lat] } })
			moved += 1
		}
		console.log(`Moved ${moved} of ${docs.length} imported listings to their verified pins`)
		return
	}

	const mandateOnly = process.argv.includes('--mandate')
	if (mandateOnly) {
		// Leaves the 50 listings (and anything saved or enquired on them) untouched
		await deleteListings(mandate, 'previous mandate deal')
	} else {
		const samplePoster = await User.findOne({ phoneNumber: SAMPLE_POSTER_PHONE })
		if (samplePoster) {
			await deleteListings({ postedBy: samplePoster._id, sourceUrl: { $exists: false }, sourceName: { $ne: MANDATE_SOURCE } }, 'generated sample')
		}
		await deleteListings(imported, 'previously imported Gurgaon')
	}

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

	if (!mandateOnly) {
		const inserted = await Property.insertMany(buildGurgaonListings(poster._id))
		console.log(`Inserted ${inserted.length} Gurgaon listings`)
	}
	const deals = await Property.insertMany(buildMandateDeals(poster._id))
	console.log(`Inserted ${deals.length} mandate deals`)
}

run()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => mongoose.disconnect())
