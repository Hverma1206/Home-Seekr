import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Image, Loader2, Save, BadgeCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import VerifyContact from '../components/VerifyContact'
import { userService } from '../services/userService'

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : undefined
}

const VerifiedBadge = ({ verified }) =>
	verified ? (
		<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
			<BadgeCheck className="w-3.5 h-3.5" /> Verified
		</span>
	) : (
		<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
			<AlertCircle className="w-3.5 h-3.5" /> Not verified
		</span>
	)

const ProfilePage = () => {
	const { user, updateProfile, updateUser } = useAuth()
	const [searchParams] = useSearchParams()
	// ?verify=phone or ?verify=email (linked from places that need a verified contact) opens that check right away
	const [verifying, setVerifying] = useState(() => ({
		email: searchParams.get('verify') === 'email',
		phone: searchParams.get('verify') === 'phone',
	}))
	const openVerify = (channel) => setVerifying((v) => ({ ...v, [channel]: true }))
	const phoneVerified = Boolean(user?.isPhoneVerified && user?.phoneNumber)
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [phoneNumber, setPhoneNumber] = useState('')
	const [companyName, setCompanyName] = useState('')
	const [profileImage, setProfileImage] = useState('')
	const [bio, setBio] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [preferredCities, setPreferredCities] = useState('')
	const [preferredLocalities, setPreferredLocalities] = useState('')
	const [propertyTypePrefs, setPropertyTypePrefs] = useState([])
	const [bhkRange, setBhkRange] = useState([])
	const [furnishing, setFurnishing] = useState([])
	const [budgetMin, setBudgetMin] = useState('')
	const [budgetMax, setBudgetMax] = useState('')
	const [notificationSettings, setNotificationSettings] = useState({
		emailNotifications: true,
		smsNotifications: true,
		pushNotifications: true,
		alertNotifications: true,
	})
	const [prefsLoading, setPrefsLoading] = useState(false)
	const [prefsMessage, setPrefsMessage] = useState('')
	const [prefsError, setPrefsError] = useState('')

	useEffect(() => {
		if (!user) return
		const fullName = user.firstName
			? `${user.firstName} ${user.lastName || ''}`.trim()
			: ''
		setName(fullName)
		setEmail(user.email || '')
		setPhoneNumber(user.phoneNumber || '')
		setCompanyName(user.companyName || '')
		setProfileImage(user.profileImage || '')
		setBio(user.bio || '')
	}, [user])

	useEffect(() => {
		let isActive = true

		const loadPreferences = async () => {
			try {
				const response = await userService.getPreferences()
				if (!isActive) return
				const preferences = response.data?.data?.preferences || {}
				setPreferredCities((preferences.preferredCities || []).join(', '))
				setPreferredLocalities((preferences.preferredLocalities || []).join(', '))
				setPropertyTypePrefs(preferences.searchPreferences?.propertyType || [])
				setBhkRange(preferences.searchPreferences?.bhkRange || [])
				setFurnishing(preferences.searchPreferences?.furnishing || [])
				setBudgetMin(
					preferences.searchPreferences?.budget?.min?.toString() || '',
				)
				setBudgetMax(
					preferences.searchPreferences?.budget?.max?.toString() || '',
				)
				setNotificationSettings({
					emailNotifications:
						preferences.notificationSettings?.emailNotifications ?? true,
					smsNotifications:
						preferences.notificationSettings?.smsNotifications ?? true,
					pushNotifications:
						preferences.notificationSettings?.pushNotifications ?? true,
					alertNotifications:
						preferences.notificationSettings?.alertNotifications ?? true,
				})
			} catch {
				if (!isActive) return
				setPrefsError('Unable to load preferences')
			}
		}

		loadPreferences()

		return () => {
			isActive = false
		}
	}, [user])

	const handleSubmit = async (event) => {
		event.preventDefault()
		setLoading(true)
		setError('')
		setMessage('')

		try {
			await updateProfile({
				name,
				email,
				companyName,
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

	const togglePreference = (value, setter) => {
		setter((prev) =>
			prev.includes(value)
				? prev.filter((item) => item !== value)
				: [...prev, value],
		)
	}

	const handlePreferencesSubmit = async (event) => {
		event.preventDefault()
		setPrefsLoading(true)
		setPrefsError('')
		setPrefsMessage('')

		const payload = {
			preferredCities: preferredCities
				.split(',')
				.map((city) => city.trim())
				.filter(Boolean),
			preferredLocalities: preferredLocalities
				.split(',')
				.map((locality) => locality.trim())
				.filter(Boolean),
			searchPreferences: {
				propertyType: propertyTypePrefs,
				budget: {
					min: parseNumber(budgetMin),
					max: parseNumber(budgetMax),
				},
				bhkRange,
				furnishing,
			},
			notificationSettings,
		}

		try {
			await userService.updatePreferences(payload)
			setPrefsMessage('Preferences updated successfully')
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Could not update preferences'
			setPrefsError(errorMessage)
		} finally {
			setPrefsLoading(false)
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
								<div className="flex items-center justify-between gap-2">
									<label htmlFor="profile-email" className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Email
									</label>
									{user?.email && email.trim().toLowerCase() === user.email && (
										<VerifiedBadge verified={user.isEmailVerified} />
									)}
								</div>
								<input
									id="profile-email"
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
									placeholder="you@example.com"
								/>
								{user?.email && !user.isEmailVerified && email.trim().toLowerCase() === user.email && !verifying.email && (
									<button type="button" onClick={() => openVerify('email')} className="text-xs font-bold text-emerald-600 hover:underline">
										Verify email →
									</button>
								)}
								{email.trim() && email.trim().toLowerCase() !== (user?.email || '') && (
									<p className="text-[11px] text-slate-400">Save your changes, then verify the new address.</p>
								)}
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<label htmlFor="profile-phone" className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Phone
									</label>
									{(phoneNumber || user?.pendingPhoneNumber) && <VerifiedBadge verified={phoneVerified} />}
								</div>
								<input
									id="profile-phone"
									type="tel"
									value={phoneNumber || user?.pendingPhoneNumber ? `+91 ${phoneNumber || user.pendingPhoneNumber}` : ''}
									placeholder="No number added"
									readOnly
									className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 outline-none cursor-not-allowed"
								/>
								{phoneVerified ? (
									<p className="text-[11px] text-slate-400">Verified by OTP. You can log in with it, and it is shared with the people you contact.</p>
								) : !verifying.phone && (
									<button type="button" onClick={() => openVerify('phone')} className="text-xs font-bold text-emerald-600 hover:underline">
										{user?.pendingPhoneNumber ? 'Verify phone number →' : 'Add & verify phone number →'}
									</button>
								)}
							</div>
							{(verifying.email || verifying.phone) && (
								<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4" id="verification">
									{verifying.email && user?.email && !user.isEmailVerified && (
										<VerifyContact
											channel="email"
											target={user.email}
											autoSend
											onVerified={(nextUser) => {
												updateUser(nextUser)
												setVerifying((v) => ({ ...v, email: false }))
												setMessage('Email verified')
											}}
										/>
									)}
									{verifying.phone && !phoneVerified && (
										<VerifyContact
											channel="phone"
											target={user?.pendingPhoneNumber || ''}
											autoSend={Boolean(user?.pendingPhoneNumber)}
											allowChangeNumber
											onVerified={(nextUser) => {
												updateUser(nextUser)
												setVerifying((v) => ({ ...v, phone: false }))
												setMessage('Phone number verified')
											}}
										/>
									)}
								</div>
							)}
							{['broker', 'builder'].includes(user?.role) && (
								<div className="space-y-2">
									<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										{user.role === 'broker' ? 'Agency / Firm name' : 'Company name'}
									</label>
									<input
										type="text"
										value={companyName}
										onChange={(event) => setCompanyName(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
										placeholder="Shown to buyers on your listings"
									/>
								</div>
							)}
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

					<div className="mt-12 border-t border-slate-200 pt-10">
						<div className="mb-8">
							<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
								Preferences
							</p>
							<h2 className="text-2xl font-black text-slate-900">Personalization settings</h2>
							<p className="text-slate-500 mt-2">
								Control the alerts and recommendations you receive.
							</p>
						</div>

						<form onSubmit={handlePreferencesSubmit} className="space-y-6">
							{prefsError && (
								<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									{prefsError}
								</div>
							)}
							{prefsMessage && (
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
									{prefsMessage}
								</div>
							)}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Preferred cities
									</label>
									<input
										type="text"
										value={preferredCities}
										onChange={(event) => setPreferredCities(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
										placeholder="Bengaluru, Mumbai"
									/>
								</div>
								<div className="space-y-2">
									<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Preferred localities
									</label>
									<input
										type="text"
										value={preferredLocalities}
										onChange={(event) => setPreferredLocalities(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
										placeholder="Indiranagar, Koramangala"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Budget min
									</label>
									<input
										type="number"
										value={budgetMin}
										onChange={(event) => setBudgetMin(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
										placeholder="3500000"
									/>
								</div>
								<div className="space-y-2">
									<label className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Budget max
									</label>
									<input
										type="number"
										value={budgetMax}
										onChange={(event) => setBudgetMax(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none"
										placeholder="12000000"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="space-y-3">
									<p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Looking for
									</p>
									{['buy', 'rent', 'pg', 'commercial'].map((option) => (
										<label key={option} className="flex items-center gap-2 text-sm text-slate-700">
											<input
												type="checkbox"
												checked={propertyTypePrefs.includes(option)}
												onChange={() => togglePreference(option, setPropertyTypePrefs)}
												className="rounded text-emerald-500"
											/>
											<span className="capitalize">{option}</span>
										</label>
									))}
								</div>
								<div className="space-y-3">
									<p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										BHK range
									</p>
									{['1', '2', '3', '4+'].map((option) => (
										<label key={option} className="flex items-center gap-2 text-sm text-slate-700">
											<input
												type="checkbox"
												checked={bhkRange.includes(option)}
												onChange={() => togglePreference(option, setBhkRange)}
												className="rounded text-emerald-500"
											/>
											<span>{option}</span>
										</label>
									))}
								</div>
								<div className="space-y-3">
									<p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Furnishing
									</p>
									{['unfurnished', 'semi-furnished', 'fully-furnished'].map((option) => (
										<label key={option} className="flex items-center gap-2 text-sm text-slate-700">
											<input
												type="checkbox"
												checked={furnishing.includes(option)}
												onChange={() => togglePreference(option, setFurnishing)}
												className="rounded text-emerald-500"
											/>
											<span className="capitalize">{option.replace('-', ' ')}</span>
										</label>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-3">
									<p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
										Notifications
									</p>
									{[
										{ key: 'emailNotifications', label: 'Email alerts' },
										{ key: 'smsNotifications', label: 'SMS alerts' },
										{ key: 'pushNotifications', label: 'Push alerts' },
										{ key: 'alertNotifications', label: 'In-app alerts' },
									].map((option) => (
										<label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
											<input
												type="checkbox"
												checked={notificationSettings[option.key]}
												onChange={() =>
													setNotificationSettings((prev) => ({
														...prev,
														[option.key]: !prev[option.key],
													}))
												}
												className="rounded text-emerald-500"
											/>
											<span>{option.label}</span>
										</label>
									))}
								</div>
							</div>

							<div className="flex items-center gap-3">
								<Button
									variant="primary"
									className="!px-6 !py-3"
									type="submit"
									disabled={prefsLoading}
									icon={
										prefsLoading ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Save className="w-4 h-4" />
										)
									}
								>
									{prefsLoading ? 'Saving...' : 'Save preferences'}
								</Button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}

export default ProfilePage
