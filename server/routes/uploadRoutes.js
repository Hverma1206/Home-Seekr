import express from 'express'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { protect } from '../middleware/authMiddleware.js'

// shortcut: photos live on this server's disk, move to object storage (S3/Cloudinary) before deploying to an ephemeral or multi-instance host
export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads')

const router = express.Router()

const uploadLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: { message: 'Too many uploads, please try again later.' },
	standardHeaders: true,
	legacyHeaders: false,
})

/**
 * @route   POST /api/uploads
 * @desc    Upload one listing photo (raw JPEG body), returns its public URL
 * @access  Private
 */
router.post(
	'/',
	uploadLimiter,
	protect,
	express.raw({ type: 'image/jpeg', limit: '2mb' }),
	async (req, res, next) => {
		try {
			const photo = req.body
			// The client re-encodes every photo to JPEG; check the magic bytes instead of trusting the header
			const isJpeg = Buffer.isBuffer(photo)
				&& photo.length > 3
				&& photo[0] === 0xff
				&& photo[1] === 0xd8
				&& photo[2] === 0xff

			if (!isJpeg) {
				return res.status(400).json({ message: 'Only JPEG photos are accepted' })
			}

			await mkdir(UPLOAD_DIR, { recursive: true })
			const name = `${randomUUID()}.jpg`
			await writeFile(path.join(UPLOAD_DIR, name), photo)

			res.status(201).json({
				url: `${req.protocol}://${req.get('host')}/uploads/${name}`,
			})
		} catch (error) {
			next(error)
		}
	},
)

export default router
