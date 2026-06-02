import { useEffect, useState } from 'react'
import { Image, Loader2, Save } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'

const ProfilePage = () => {
	const { user, updateProfile } = useAuth()
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [phoneNumber, setPhoneNumber] = useState('')
	const [profileImage, setProfileImage] = useState('')
	const [bio, setBio] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')

	useEffect(() => {
		if (!user) return
		const fullName = user.firstName
			? `${user.firstName} ${user.lastName || ''}`.trim()
			: ''
		setName(fullName)
		setEmail(user.email || '')
		setPhoneNumber(user.phoneNumber || '')
		setProfileImage(user.profileImage || '')
		setBio(user.bio || '')
	}, [user])

	const handleSubmit = async (event) => {
		event.preventDefault()
		setLoading(true)
		setError('')
		setMessage('')

		if (phoneNumber && !/^[6-9]\d{9}$/.test(phoneNumber)) {
			setLoading(false)
			setError('Please enter a valid 10-digit Indian mobile number')
			return
		}

		try {
			await updateProfile({
				name,
				email,
				phoneNumber,
				profileImage,
				bio,
			})
			setMessage('Profile updated successfully')
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Could not update profile'
			setError(errorMessage)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-slate-50 pt-28 pb-20">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-8 md:p-12">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
						<div>
							<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
								Profile Settings
							</p>
							<h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
								Edit your profile
							</h1>
							<p className="text-slate-500 mt-2">
								Keep your details up to date for a personalized experience.
							</p>
						</div>
					</div>

					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
								{error}
							</div>
						)}
						{message && (
							<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
								{message}
							</div>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
									Name
								</label>
								<input
									type="text"
									value={name}
									onChange={(event) => setName(event.target.value)}
									className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
									placeholder="Your name"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
									Email
								</label>
								<input
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
									placeholder="you@example.com"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
									Phone
								</label>
								<input
									type="tel"
									value={phoneNumber}
									onChange={(event) =>
										setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 10))
									}
									className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
									placeholder="10-digit number"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
									Profile image
								</label>
								<div className="relative">
									<input
										type="text"
										value={profileImage}
										onChange={(event) => setProfileImage(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
										placeholder="Paste image URL"
									/>
									<Image className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
								Bio
							</label>
							<textarea
								rows={4}
								value={bio}
								onChange={(event) => setBio(event.target.value)}
								className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
								placeholder="Share a short bio"
							/>
						</div>

						<div className="flex items-center gap-3">
							<Button
								variant="primary"
								className="!px-6 !py-3"
								type="submit"
								disabled={loading}
								icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
							>
								{loading ? 'Saving...' : 'Save changes'}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}

export default ProfilePage
