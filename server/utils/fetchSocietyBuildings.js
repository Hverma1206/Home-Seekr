// Saves the real building outlines around each society, from OpenStreetMap, for the 3D map (data/gurgaonBuildings.json).
// Run again after importing listings that add new societies:
//   node utils/fetchSocietyBuildings.js
// Building data © OpenStreetMap contributors (ODbL).
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import mongoose from 'mongoose'
import { findSocieties } from '../controllers/societyController.js'

const RADIUS_M = 170 // around each pin; the 3D site is drawn about this size
const MAX_PER_SOCIETY = 60
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const M_PER_DEG_LAT = 111320
const mPerDegLng = (lat) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)

const overpass = async (query) => {
	for (const url of MIRRORS) {
		try {
			const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), headers: { 'User-Agent': 'estatehub-3d-map' } })
			if (res.ok) return await res.json()
			console.warn(`${url}: HTTP ${res.status}`)
		} catch (error) {
			console.warn(`${url}: ${error.message}`)
		}
	}
	throw new Error('Every Overpass mirror failed; try again in a few minutes')
}

// Outline in metres from the society's centre, so the file stays small and the client rebuilds it exactly
const toLocal = (geometry, [lng, lat]) => geometry.map((p) => [
	Math.round((p.lon - lng) * mPerDegLng(lat) * 10) / 10,
	Math.round((p.lat - lat) * M_PER_DEG_LAT * 10) / 10,
])
const areaOf = (ring) => Math.abs(ring.reduce((sum, [x1, y1], i) => {
	const [x2, y2] = ring[(i + 1) % ring.length]
	return sum + x1 * y2 - x2 * y1
}, 0)) / 2
const levelsOf = (tags = {}) => {
	const height = parseFloat(tags.height)
	if (height) return Math.max(1, Math.round(height / 3.2))
	return parseInt(tags['building:levels'], 10) || undefined
}

const run = async () => {
	await mongoose.connect(process.env.MONGO_URI)
	const societies = await findSocieties('Gurugram')
	await mongoose.disconnect()

	// The map fans out societies that share one point (sector-level addresses), so their outlines would not be theirs
	const shared = new Map()
	for (const s of societies) {
		const key = `${s.lng.toFixed(4)},${s.lat.toFixed(4)}`
		shared.set(key, (shared.get(key) || 0) + 1)
	}
	const pinned = societies.filter((s) => shared.get(`${s.lng.toFixed(4)},${s.lat.toFixed(4)}`) === 1)

	const parts = pinned.map((s) => `way["building"](around:${RADIUS_M},${s.lat},${s.lng});`).join('')
	const { elements } = await overpass(`[out:json][timeout:120];(${parts});out tags geom;`)
	console.log(`${elements.length} buildings near ${pinned.length} societies`)

	// Each building goes to the nearest society within the radius
	const bySociety = new Map()
	for (const el of elements) {
		if (!el.geometry?.length) continue
		const cx = el.geometry.reduce((a, p) => a + p.lon, 0) / el.geometry.length
		const cy = el.geometry.reduce((a, p) => a + p.lat, 0) / el.geometry.length
		let best = null
		for (const s of pinned) {
			const d = Math.hypot((cx - s.lng) * mPerDegLng(s.lat), (cy - s.lat) * M_PER_DEG_LAT)
			if (d <= RADIUS_M && (!best || d < best.d)) best = { s, d }
		}
		if (!best) continue
		const ring = toLocal(el.geometry, [best.s.lng, best.s.lat])
		const area = areaOf(ring)
		if (area < 20 || area > 8000) continue // sheds and kiosks; malls and factories are not homes
		if (!bySociety.has(best.s.id)) bySociety.set(best.s.id, [])
		bySociety.get(best.s.id).push({ d: best.d, r: ring.slice(0, -1), l: levelsOf(el.tags) })
	}

	const out = {}
	for (const s of pinned) {
		const list = (bySociety.get(s.id) || []).sort((a, b) => a.d - b.d).slice(0, MAX_PER_SOCIETY)
		if (list.length) out[s.id] = { c: [s.lng, s.lat], b: list.map(({ r, l }) => (l ? { r, l } : { r })) }
	}
	writeFileSync(new URL('../data/gurgaonBuildings.json', import.meta.url), JSON.stringify(out))
	console.log(`Saved outlines for ${Object.keys(out).length} of ${societies.length} societies`)
}

run().catch((error) => {
	console.error(error)
	process.exit(1)
})
