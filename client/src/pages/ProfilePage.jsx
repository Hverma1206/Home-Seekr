import { useEffect, useState } from 'react'
import { Image, Loader2, Save } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import { userService } from '../services/userService'

const parseNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : undefined
}

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
			} catch (err) {
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
