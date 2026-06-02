import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Phone, Pencil, Bell, Sparkles, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import PropertyCard from '../components/PropertyCard'
import ProjectCard from '../components/ProjectCard'
import { propertyService } from '../services/propertyService'
import { userService } from '../services/userService'
import { alertService } from '../services/alertService'

const normalizeFeedProperty = (property) => {
	const areaFallback = property.plotArea
		? `${property.plotArea}${property.plotAreaUnit ? ` ${property.plotAreaUnit}` : ''}`
		: ''

	return {
		id: property._id || property.id,
		title: property.title || property.selectedType || 'Property',
		price: property.price || property.displayPrice || '',
		bhk: property.bhk || property.bedrooms || 'N/A',
		area: property.area || areaFallback,
		location:
			property.locationLabel ||
			`${property.locality || ''}${property.city ? `, ${property.city}` : ''}`,
		locality: property.locality || '',
		city: property.city || '',
		dealer: property.dealer || property.role || 'Verified Agent',
		tags: Array.isArray(property.tags) ? property.tags : [],
		image: property.image || (property.images && property.images[0]) || '',
		type: property.type || property.selectedType || 'Property',
		status: property.status || property.availabilityStatus || 'Ready',
		raw: property,
	}
}

const DashboardPage = () => {
	const navigate = useNavigate()
	const { user, isAuthenticated } = useAuth()
	const [feed, setFeed] = useState({
		properties: [],
		projects: [],
		recentSearches: [],
		alertSuggestions: [],
		preferences: {},
		role: 'buyer',
	})
	const [alerts, setAlerts] = useState([])
	const [loading, setLoading] = useState(true)
	const [feedError, setFeedError] = useState('')
	const [alertMessage, setAlertMessage] = useState('')
	const [alertError, setAlertError] = useState('')
	const [creatingAlert, setCreatingAlert] = useState('')
	const [savedPropertyIds, setSavedPropertyIds] = useState(new Set())

	const fullName = user?.firstName
		? `${user.firstName} ${user.lastName || ''}`.trim()
		: 'Welcome back'
	const initials = fullName
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase()

	const normalizedProperties = useMemo(
		() => feed.properties.map(normalizeFeedProperty),
		[feed.properties],
	)

	useEffect(() => {
		let isActive = true

		const loadDashboard = async () => {
			setLoading(true)
			setFeedError('')

			try {
				const [feedResponse, alertResponse] = await Promise.all([
					userService.getFeed(),
					alertService.getAlerts(),
				])
				if (!isActive) return

				const feedData = feedResponse.data?.data || {}
				setFeed((prev) => ({
					properties: feedData.properties || [],
					projects: feedData.projects || [],
					recentSearches: feedData.recentSearches || [],
					alertSuggestions: feedData.alertSuggestions || [],
					preferences: feedData.preferences || {},
					role: feedData.role || prev.role || 'buyer',
				}))
				setAlerts(alertResponse.data?.data?.alerts || [])
			} catch (error) {
				if (!isActive) return
				setFeedError(
					error.response?.data?.message || 'Unable to load your dashboard',
				)
			} finally {
				if (isActive) {
					setLoading(false)
				}
			}
		}

		loadDashboard()

		return () => {
			isActive = false
		}
	}, [])

	useEffect(() => {
		let isActive = true

		const fetchSavedProperties = async () => {
			if (!isAuthenticated) {
				setSavedPropertyIds(new Set())
				return
			}

			try {
				const { properties: saved } = await propertyService.getSavedProperties({
					limit: 200,
				})
				if (!isActive) return
				const ids = saved.map((property) => String(property.id))
				setSavedPropertyIds(new Set(ids))
			} catch (error) {
				if (!isActive) return
				console.error('Error fetching saved properties:', error)
				setSavedPropertyIds(new Set())
			}
		}

		fetchSavedProperties()

		return () => {
			isActive = false
		}
	}, [isAuthenticated])

	const handleToggleSave = async (property) => {
		const propertyId = property?.id || property?._id || property?.raw?._id
		if (!propertyId) return

		try {
			const response = await propertyService.saveProperty(propertyId)
			const isSaved = response?.isSaved

			setSavedPropertyIds((prev) => {
				const next = new Set(prev)
				if (isSaved) {
					next.add(String(propertyId))
				} else {
					next.delete(String(propertyId))
				}
				return next
			})
		} catch (error) {
			console.error('Error saving property:', error)
		}
	}

	const handlePropertySelect = (property) => {
		if (property?.id) {
			navigate(`/property/${property.id}`)
		}
	}

	const handleProjectSelect = (project) => {
		if (project?._id || project?.id) {
			navigate(`/projects/${project._id || project.id}`)
		}
	}

	const handleCreateAlert = async (suggestion) => {
		setAlertError('')
		setAlertMessage('')
		setCreatingAlert(suggestion.label)

		const filters = suggestion.filters || {}
		const fallbackCities = feed.preferences?.preferredCities || []
		const alertCities = filters.city ? [filters.city] : fallbackCities
		if (!alertCities.length) {
			setAlertError('Add a preferred city in profile to create alerts.')
			setCreatingAlert('')
			return
		}

		const alertType =
			filters.lookingTo || filters.propertyCategory || 'buy'

		try {
			const response = await alertService.createAlert({
				alertType,
				cities: alertCities,
				localities: filters.locality ? [filters.locality] : [],
				budget: {
					min: filters.minPrice,
					max: filters.maxPrice,
				},
				propertyTypes: filters.selectedType ? [filters.selectedType] : [],
				bhk: filters.bhk ? [filters.bhk] : [],
			})

			setAlerts((prev) => [response.data?.data?.alert, ...prev].filter(Boolean))
			setAlertMessage('Alert created successfully')
		} catch (error) {
			setAlertError(
				error.response?.data?.message || 'Unable to create alert',
			)
		} finally {
			setCreatingAlert('')
		}
	}

	const handleToggleAlert = async (alertId, isActive) => {
		setAlertError('')
		setAlertMessage('')
		try {
			const nextStatus = isActive ? 'paused' : 'active'
			const response = await alertService.updateAlertStatus(
				alertId,
				nextStatus,
			)
			const updated = response.data?.data?.alert
			setAlerts((prev) =>
				prev.map((alert) =>
					alert._id === alertId ? updated : alert,
				),
			)
			setAlertMessage('Alert updated successfully')
		} catch (error) {
			setAlertError(
				error.response?.data?.message || 'Unable to update alert',
			)
		}
	}

	const preferredCitiesLabel =
		feed.preferences?.preferredCities?.length
			? feed.preferences.preferredCities.join(', ')
			: 'Add preferred cities'
	const preferredLocalitiesLabel =
		feed.preferences?.preferredLocalities?.length
			? feed.preferences.preferredLocalities.join(', ')
			: 'Add preferred localities'

	const budgetLabel = feed.preferences?.searchPreferences?.budget
		? `${feed.preferences.searchPreferences.budget?.min || 'Min'} - ${
				feed.preferences.searchPreferences.budget?.max || 'Max'
			}`
		: 'Set your budget range'

	return (
		<div className="min-h-screen bg-slate-50 pt-28 pb-20">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-8 md:p-12">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
						<div>
							<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
								Dashboard
							</p>
							<h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
								Welcome, {fullName}
							</h1>
							<p className="text-slate-500 mt-2">
								Your personalized feed blends your saved preferences and recent searches.
							</p>
						</div>
						<Button
							variant="secondary"
							onClick={() => navigate('/profile')}
							icon={<Pencil className="w-4 h-4" />}
						>
							Edit Profile
						</Button>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
						<div className="bg-slate-900 text-white rounded-3xl p-8 flex flex-col gap-6">
							<div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-black overflow-hidden">
								{user?.profileImage ? (
									<img
										src={user.profileImage}
										alt={fullName}
										className="w-full h-full object-cover"
									/>
								) : (
									initials || 'U'
								)}
							</div>
							<div>
								<p className="text-sm text-emerald-200 font-semibold uppercase tracking-wider">
									Profile
								</p>
								<h2 className="text-2xl font-bold mt-2">{fullName}</h2>
								<p className="text-sm text-slate-300 mt-2">
									{user?.bio || 'Tell us about your property goals.'}
								</p>
							</div>
							<div className="rounded-2xl bg-white/10 p-4">
								<p className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">
									Role
								</p>
								<p className="text-lg font-bold text-white mt-2">
									{feed.role === 'builder' ? 'Builder account' : 'Buyer account'}
								</p>
							</div>
						</div>

						<div className="lg:col-span-2 bg-slate-50 rounded-3xl p-8">
							<h3 className="text-xl font-black text-slate-900 mb-6">Personalization snapshot</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div className="bg-white rounded-2xl p-5 border border-slate-100">
									<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
										Preferred cities
									</p>
									<p className="text-sm font-semibold text-slate-700 mt-3">
										{preferredCitiesLabel}
									</p>
								</div>
								<div className="bg-white rounded-2xl p-5 border border-slate-100">
									<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
										Preferred localities
									</p>
									<p className="text-sm font-semibold text-slate-700 mt-3">
										{preferredLocalitiesLabel}
									</p>
								</div>
								<div className="bg-white rounded-2xl p-5 border border-slate-100">
									<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
										Budget range
									</p>
									<p className="text-sm font-semibold text-slate-700 mt-3">{budgetLabel}</p>
								</div>
								<div className="bg-white rounded-2xl p-5 border border-slate-100">
									<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
										Search intent
									</p>
									<p className="text-sm font-semibold text-slate-700 mt-3">
										{feed.preferences?.searchPreferences?.propertyType?.length
											? feed.preferences.searchPreferences.propertyType.join(', ')
											: 'Add preferences'}
									</p>
								</div>
							</div>
							<div className="mt-6 bg-white rounded-2xl p-6 border border-slate-100">
								<h4 className="text-lg font-bold text-slate-900">Profile details</h4>
								<div className="space-y-4 mt-4">
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
											<Mail className="w-4 h-4 text-emerald-600" />
										</div>
										<div>
											<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Email</p>
											<p className="text-sm font-semibold text-slate-700">
												{user?.email || 'Not provided'}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
											<Phone className="w-4 h-4 text-emerald-600" />
										</div>
										<div>
											<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Phone</p>
											<p className="text-sm font-semibold text-slate-700">
												{user?.phoneNumber || 'Not provided'}
											</p>
										</div>
									</div>
								</div>
								<Button
									variant="secondary"
									className="mt-5"
									onClick={() => navigate('/profile')}
								>
									Go to Profile Settings
								</Button>
							</div>
						</div>
					</div>

					{feedError && (
						<div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
							{feedError}
						</div>
					)}

					<div className="mt-12">
						<div className="flex items-center gap-3 mb-6">
							<Sparkles className="w-5 h-5 text-emerald-500" />
							<h2 className="text-2xl font-black text-slate-900">For you</h2>
						</div>
						{loading ? (
							<p className="text-sm text-slate-500">Loading personalized listings...</p>
						) : normalizedProperties.length ? (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
								{normalizedProperties.map((property) => (
									<PropertyCard
										key={property.id}
										property={property}
										onClick={handlePropertySelect}
										isSaved={savedPropertyIds.has(String(property.id))}
										onToggleSave={handleToggleSave}
									/>
								))}
							</div>
						) : (
							<p className="text-sm text-slate-500">
								Add preferences to see personalized listings here.
							</p>
						)}
					</div>

					<div className="mt-12 grid grid-cols-1 xl:grid-cols-3 gap-8">
						<div className="xl:col-span-2 bg-white rounded-3xl p-8 border border-slate-100">
							<div className="flex items-center gap-3 mb-6">
								<Bell className="w-5 h-5 text-emerald-500" />
								<h3 className="text-xl font-black text-slate-900">Alerts</h3>
							</div>
							{alertError && (
								<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
									{alertError}
								</div>
							)}
							{alertMessage && (
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-4">
									{alertMessage}
								</div>
							)}
							<div className="space-y-4">
								{alerts.length ? (
									alerts.map((alert) => (
										<div
											key={alert._id}
											className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 rounded-2xl p-4"
										>
											<div>
												<p className="text-sm font-semibold text-slate-700">
													{alert.alertType?.toUpperCase() || 'ALERT'} in{' '}
													{alert.cities?.join(', ')}
												</p>
												<p className="text-xs text-slate-500 mt-1">
													Matches: {alert.matchCount ?? alert.totalMatches ?? 0}
												</p>
											</div>
											<Button
												variant="secondary"
												onClick={() => handleToggleAlert(alert._id, alert.isActive)}
											>
												{alert.isActive ? 'Pause alert' : 'Resume alert'}
											</Button>
										</div>
									))
								) : (
									<p className="text-sm text-slate-500">
										Create alerts from your recent searches below.
									</p>
								)}
							</div>

							{feed.alertSuggestions?.length ? (
								<div className="mt-6">
									<p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
										Suggested alerts
									</p>
									<div className="space-y-3">
										{feed.alertSuggestions.map((suggestion) => (
											<div
												key={suggestion.label}
												className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4"
											>
												<div>
													<p className="text-sm font-semibold text-slate-700">
														{suggestion.label}
													</p>
													<p className="text-xs text-slate-500 mt-1">
														Matches: {suggestion.matchCount ?? 0}
													</p>
												</div>
												<Button
													variant="secondary"
													disabled={creatingAlert === suggestion.label}
													onClick={() => handleCreateAlert(suggestion)}
												>
													{creatingAlert === suggestion.label
														? 'Creating...'
														: 'Create alert'}
												</Button>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>

						<div className="bg-white rounded-3xl p-8 border border-slate-100">
							<div className="flex items-center gap-3 mb-6">
								<Search className="w-5 h-5 text-emerald-500" />
								<h3 className="text-xl font-black text-slate-900">Recent searches</h3>
							</div>
							{feed.recentSearches?.length ? (
								<ul className="space-y-4">
									{feed.recentSearches.map((search) => (
										<li key={search.label} className="text-sm text-slate-600">
											<p className="font-semibold text-slate-700">{search.label}</p>
											<p className="text-xs text-slate-400 mt-1">
												{search.createdAt
													? new Date(search.createdAt).toLocaleDateString('en-IN')
													: 'Just now'}
											</p>
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-slate-500">
									Search for properties to see your recent activity here.
								</p>
							)}
						</div>
					</div>

					<div className="mt-12">
						<div className="flex items-center gap-3 mb-6">
							<Sparkles className="w-5 h-5 text-emerald-500" />
							<h2 className="text-2xl font-black text-slate-900">Project picks</h2>
						</div>
						{feed.projects?.length ? (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
								{feed.projects.map((project) => (
									<ProjectCard
										key={project._id || project.id}
										project={project}
										onClick={handleProjectSelect}
									/>
								))}
							</div>
						) : (
							<p className="text-sm text-slate-500">
								Add preferences to see recommended projects.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default DashboardPage
