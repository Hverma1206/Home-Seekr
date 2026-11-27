import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyFirebasePhoneToken, normalizeIndianMobileNumber } from './phone.js'

test('a missing or forged Firebase ID token proves no number', async () => {
	assert.equal(await verifyFirebasePhoneToken(''), null)
	assert.equal(await verifyFirebasePhoneToken(undefined), null)
	assert.equal(await verifyFirebasePhoneToken('not.a.jwt'), null)
	// Well-formed but unsigned token claiming a number
	const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
	const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ phone_number: '+919999999999', aud: 'home-seekr-otp' })}.`
	assert.equal(await verifyFirebasePhoneToken(forged), null)
})

test('normalizeIndianMobileNumber keeps the 10-digit national number', () => {
	assert.equal(normalizeIndianMobileNumber('+91 99999 99999').nationalNumber, '9999999999')
	assert.equal(normalizeIndianMobileNumber('12345').isValid, false)
})
