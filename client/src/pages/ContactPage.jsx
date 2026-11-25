import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { CheckCircle2, MessageSquare, Building2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { siteService } from '../services/siteService'

const inputClass =
	'w-full mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 transition-colors'

const ContactPage = () => {
	const { user } = useAuth()
	const [form, setForm] = useState(() => ({
		name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
		email: user?.email || '',
		message: '',
	}))
	const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'done' | 'error'
	const [feedback, setFeedback] = useState('')

	const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

	const handleSubmit = async (event) => {
		event.preventDefault()
		if (status === 'sending') return

		setStatus('sending')
		setFeedback('')
		try {
			const { data } = await siteService.sendContactMessage({
				name: form.name.trim(),
				email: form.email.trim(),
				message: form.message.trim(),
			})
			setStatus('done')
			setFeedback(data?.message || 'Thanks! We will get back to you soon.')
		} catch (error) {
			setStatus('error')
			setFeedback(error.response?.data?.message || 'Could not send your message. Please try again.')
		}
	}

	return (
		<Motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="pt-32 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-5 gap-12"
		>
			<div className="lg:col-span-2">
				<p className="text-xs uppercase tracking-[0.35em] text-emerald-600 font-bold mb-3">Contact</p>
				<h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-6">How can we help?</h1>
				<p className="text-lg text-slate-500 font-medium mb-10">
					Questions about your account, a problem with a listing, or feedback on the site. Send us a message and we&apos;ll reply by email.
				</p>

				<div className="space-y-6">
					<div className="flex gap-4">
						<span className="w-11 h-11 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
							<Building2 className="w-5 h-5" />
						</span>
						<div>
							<p className="font-bold text-slate-900">Asking about a property?</p>
							<p className="text-sm text-slate-500">
								Open the listing and tap &ldquo;Enquire&rdquo; or &ldquo;Get Phone Number&rdquo;. Your message goes straight to the owner or agent.
							</p>
							<Link to="/listings" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
								Browse listings &rarr;
							</Link>
						</div>
					</div>
					<div className="flex gap-4">
						<span className="w-11 h-11 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
							<MessageSquare className="w-5 h-5" />
						</span>
						<div>
							<p className="font-bold text-slate-900">Reporting a listing?</p>
							<p className="text-sm text-slate-500">Include the listing&apos;s link in your message so we can find it quickly.</p>
						</div>
					</div>
				</div>
			</div>

			<div className="lg:col-span-3 rounded-[2.5rem] bg-slate-50 border border-slate-100 p-8 md:p-10">
				{status === 'done' ? (
					<div role="status" className="h-full flex flex-col items-center justify-center text-center py-12">
						<CheckCircle2 className="w-14 h-14 text-emerald-500 mb-4" />
						<p className="text-2xl font-black text-slate-900 mb-2">Message sent</p>
						<p className="text-slate-500 mb-8">{feedback}</p>
						<Link to="/" className="font-bold text-slate-900 underline underline-offset-4">Back to home</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-5">
						<label className="block text-xs uppercase tracking-wider text-slate-500 font-bold">
							Your name
							<input required maxLength={100} value={form.name} onChange={update('name')} autoComplete="name" className={inputClass} />
						</label>
						<label className="block text-xs uppercase tracking-wider text-slate-500 font-bold">
							Email
							<input required type="email" value={form.email} onChange={update('email')} autoComplete="email" className={inputClass} />
						</label>
						<label className="block text-xs uppercase tracking-wider text-slate-500 font-bold">
							Message
							<textarea
								required
								minLength={10}
								maxLength={2000}
								rows={6}
								value={form.message}
								onChange={update('message')}
								className={`${inputClass} resize-y`}
							/>
						</label>
						{status === 'error' && (
							<p role="alert" className="text-sm font-semibold text-rose-600">{feedback}</p>
						)}
						<Button type="submit" variant="primary" disabled={status === 'sending'} className="w-full disabled:opacity-70">
							{status === 'sending' ? 'Sending...' : 'Send message'}
						</Button>
					</form>
				)}
			</div>
		</Motion.div>
	)
}

export default ContactPage
