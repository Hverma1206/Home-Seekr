import axios from 'axios'

// Transactional email. Set ONE of these in .env:
//   BREVO_API_KEY  - Brevo (https://www.brevo.com): free 300 emails/day, a single verified sender address is
//                    enough to start (no domain needed). Recommended while the app has no domain.
//   RESEND_API_KEY - Resend (https://resend.com): free 3,000 emails/month (100/day); needs your own verified
//                    domain to email anyone other than yourself.
// plus EMAIL_FROM (the verified sender address) and optionally EMAIL_FROM_NAME.
// With neither key outside production, emails are printed to the server console instead of being sent.

const fromName = () => process.env.EMAIL_FROM_NAME || 'HomeSeekr'

const provider = () => {
	if (process.env.BREVO_API_KEY) return 'brevo'
	if (process.env.RESEND_API_KEY) return 'resend'
	return null
}

export const isDevEmailMode = () => !provider() && process.env.NODE_ENV !== 'production'

export const isEmailConfigured = () => Boolean(provider() && process.env.EMAIL_FROM) || isDevEmailMode()

const sendViaBrevo = ({ to, subject, html, text }) =>
	axios.post(
		'https://api.brevo.com/v3/smtp/email',
		{
			sender: { email: process.env.EMAIL_FROM, name: fromName() },
			to: [{ email: to }],
			subject,
			htmlContent: html,
			textContent: text,
		},
		{ headers: { 'api-key': process.env.BREVO_API_KEY }, timeout: 10000 },
	)

const sendViaResend = ({ to, subject, html, text }) =>
	axios.post(
		'https://api.resend.com/emails',
		{ from: `${fromName()} <${process.env.EMAIL_FROM}>`, to: [to], subject, html, text },
		{ headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, timeout: 10000 },
	)

// Returns true when the email was handed to the provider (or printed in dev mode)
export const sendEmail = async ({ to, subject, html, text }) => {
	if (isDevEmailMode()) {
		console.log(`[dev email] to ${to} | ${subject}\n${text}`)
		return true
	}
	if (!isEmailConfigured()) {
		console.error('Email not sent: set BREVO_API_KEY or RESEND_API_KEY, and EMAIL_FROM')
		return false
	}

	try {
		if (provider() === 'brevo') await sendViaBrevo({ to, subject, html, text })
		else await sendViaResend({ to, subject, html, text })
		return true
	} catch (error) {
		console.error(`Email send failed (${provider()}):`, error.response?.data || error.message)
		return false
	}
}

export const sendVerificationCodeEmail = (to, code, minutes) =>
	sendEmail({
		to,
		subject: `${code} is your ${fromName()} verification code`,
		text: `Your ${fromName()} email verification code is ${code}. It expires in ${minutes} minutes. If you didn't ask for this, ignore this email.`,
		html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a">
  <h2 style="margin:0 0 12px">Verify your email</h2>
  <p style="margin:0 0 20px;color:#475569">Enter this code in ${fromName()} to verify your email address:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:0 0 20px">${code}</p>
  <p style="margin:0;color:#64748b;font-size:13px">It expires in ${minutes} minutes. If you didn't ask for this, you can ignore this email.</p>
</div>`,
	})
