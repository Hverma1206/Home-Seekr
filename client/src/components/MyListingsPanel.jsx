import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Eye, MessageSquare, Pencil, Phone, Plus } from 'lucide-react'
import Button from './ui/Button'
import { propertyService } from '../services/propertyService'
import { leadService } from '../services/leadService'

const LISTING_STATUSES = ['active', 'sold', 'rented', 'inactive']
const LEAD_STATUSES = [
	'new', 'contacted', 'interested', 'scheduled_visit', 'visited',
	'negotiating', 'offered', 'closed_won', 'closed_lost',
]

const label = (value) => value.replace(/_/g, ' ')

const selectClass =
	'capitalize rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-slate-900 outline-none'

// A poster's inventory and the enquiries buyers sent on it
const MyListingsPanel = () => {
	const navigate = useNavigate()
	const [listings, setListings] = useState([])
	const [leads, setLeads] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		let isActive = true

		Promise.all([
			propertyService.getMyProperties(),
			leadService.getLeads({ limit: 100 }),
		])
			.then(([mine, received]) => {
				if (!isActive) return
				setListings(mine)
				setLeads(received.leads)
			})
			.catch((err) => {
				if (isActive) setError(err.response?.data?.message || 'Unable to load your listings')
			})
			.finally(() => {
				if (isActive) setLoading(false)
			})

		return () => {
			isActive = false
		}
	}, [])

	const changeListingStatus = async (listing, status) => {
		setError('')
		try {
			await propertyService.updateProperty(listing.id, { status })
			setListings((prev) =>
				prev.map((item) =>
					item.id === listing.id ? { ...item, raw: { ...item.raw, status } } : item,
				),
			)
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to update the listing')
		}
	}

	const changeLeadStatus = async (lead, status) => {
		setError('')
		try {
			await leadService.updateLeadStatus(lead._id, status)
			setLeads((prev) =>
				prev.map((item) => (item._id === lead._id ? { ...item, status } : item)),
			)
		} catch (err) {
			setError(err.response?.data?.message || 'Unable to update the enquiry')
		}
	}

	return (
		<section className="mt-12" aria-labelledby="my-listings-heading">
			<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<Building2 className="w-5 h-5 text-emerald-500" />
					<h2 id="my-listings-heading" className="text-2xl font-black text-slate-900">
						My listings
					</h2>
				</div>
				<Button
					variant="secondary"
					onClick={() => navigate('/post-property')}
					icon={<Plus className="w-4 h-4" />}
				>
					Post property
				</Button>
			</div>

			{error && (
				<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<p className="text-sm text-slate-500">Loading your listings...</p>
			) : listings.length ? (
				<ul className="space-y-4">
					{listings.map((listing) => (
						<li
							key={listing.id}
							className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-50 rounded-2xl p-4"
						>
							<div className="w-full md:w-28 h-24 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
								{listing.image ? (
									<img src={listing.image} alt="" className="w-full h-full object-cover" />
								) : (
									<Building2 className="w-8 h-8 text-slate-400" />
								)}
							</div>

							<div className="flex-1 min-w-0">
								<p className="font-bold text-slate-900 truncate">{listing.title}</p>
								<p className="text-sm text-slate-500 truncate">{listing.location}</p>
								<p className="text-sm font-semibold text-slate-700 mt-1">{listing.price}</p>
								<p className="flex items-center gap-4 text-xs text-slate-500 mt-2">
									<span className="flex items-center gap-1">
										<Eye className="w-3.5 h-3.5" /> {listing.raw.views || 0} views
									</span>
									<span className="flex items-center gap-1">
										<MessageSquare className="w-3.5 h-3.5" /> {listing.raw.contactsMade || 0} enquiries
									</span>
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<select
									aria-label={`Status of ${listing.title}`}
									value={listing.raw.status}
									onChange={(e) => changeListingStatus(listing, e.target.value)}
									className={selectClass}
								>
									{/* keep an unknown status (e.g. pending verification) visible instead of silently showing "active" */}
									{!LISTING_STATUSES.includes(listing.raw.status) && (
										<option value={listing.raw.status} disabled>{label(listing.raw.status || 'unknown')}</option>
									)}
									{LISTING_STATUSES.map((status) => (
										<option key={status} value={status}>{status}</option>
									))}
								</select>
								<Button
									variant="secondary"
									className="!py-2 !px-4 !text-sm"
									onClick={() => navigate('/post-property/form', { state: { property: listing.raw } })}
									icon={<Pencil className="w-4 h-4" />}
								>
									Edit
								</Button>
								<Button
									variant="secondary"
									className="!py-2 !px-4 !text-sm"
									onClick={() => navigate(`/property/${listing.id}`)}
								>
									View
								</Button>
							</div>
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-slate-500">
					You have not posted a property yet. Post one and it shows up for buyers right away.
				</p>
			)}

			{leads.length > 0 && (
				<div className="mt-10">
					<div className="flex items-center gap-3 mb-6">
						<MessageSquare className="w-5 h-5 text-emerald-500" />
						<h3 className="text-xl font-black text-slate-900">Enquiries received</h3>
					</div>
					<ul className="space-y-3">
						{leads.map((lead) => (
							<li
								key={lead._id}
								className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4"
							>
								<div className="min-w-0">
									<p className="font-semibold text-slate-800">{lead.buyerName || 'Buyer'}</p>
									<p className="text-xs text-slate-500 mt-1 truncate">
										{lead.property?.title || lead.property?.selectedType || 'Listing'}
										{lead.property?.locality ? ` · ${lead.property.locality}` : ''}
										{' · '}
										{new Date(lead.createdAt).toLocaleDateString('en-IN')}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-3">
									{lead.buyerPhone && (
										<a
											href={`tel:+91${lead.buyerPhone}`}
											className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline"
										>
											<Phone className="w-4 h-4" /> +91 {lead.buyerPhone}
										</a>
									)}
									<select
										aria-label={`Status of enquiry from ${lead.buyerName || 'buyer'}`}
										value={lead.status}
										onChange={(e) => changeLeadStatus(lead, e.target.value)}
										className={selectClass}
									>
										{LEAD_STATUSES.map((status) => (
											<option key={status} value={status}>{label(status)}</option>
										))}
									</select>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	)
}

export default MyListingsPanel
