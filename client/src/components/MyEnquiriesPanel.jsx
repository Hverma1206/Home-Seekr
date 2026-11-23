import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, Phone, Send } from 'lucide-react'
import { leadService } from '../services/leadService'
import { formatPrice } from '../services/propertyService'

const STATUS_LABELS = {
	new: 'Sent',
	contacted: 'Poster contacted you',
	interested: 'In discussion',
	scheduled_visit: 'Visit requested',
	visited: 'Visited',
	negotiating: 'Negotiating',
	offered: 'Offer made',
	closed_won: 'Deal done',
	closed_lost: 'Closed',
}

const posterName = (lead) =>
	lead.property?.dealer
	|| lead.owner?.companyName
	|| [lead.owner?.firstName, lead.owner?.lastName].filter(Boolean).join(' ')
	|| 'Owner'

// Properties the logged-in user has enquired about, with the poster's number to call back
const MyEnquiriesPanel = () => {
	const navigate = useNavigate()
	const [leads, setLeads] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		let isActive = true
		leadService
			.getMyLeads({ limit: 50 })
			.then(({ leads: mine }) => {
				if (isActive) setLeads(mine)
			})
			.catch((err) => {
				if (isActive) setError(err.response?.data?.message || 'Unable to load your enquiries')
			})
			.finally(() => {
				if (isActive) setLoading(false)
			})
		return () => {
			isActive = false
		}
	}, [])

	return (
		<section className="mt-12" aria-labelledby="my-enquiries-heading">
			<div className="flex items-center gap-3 mb-6">
				<Send className="w-5 h-5 text-emerald-500" />
				<h2 id="my-enquiries-heading" className="text-2xl font-black text-slate-900">
					My enquiries
				</h2>
			</div>

			{error && (
				<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<p className="text-sm text-slate-500">Loading your enquiries...</p>
			) : leads.length ? (
				<ul className="space-y-3">
					{leads.map((lead) => {
						const property = lead.property
						const image = property?.image || property?.images?.[0]
						const isRental = property?.lookingTo === 'rent' || property?.lookingTo === 'pg'
						const nextVisit = [...(lead.visitSchedules || [])]
							.reverse()
							.find((visit) => visit.status !== 'cancelled')

						return (
							<li
								key={lead._id}
								className="flex flex-col md:flex-row md:items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4"
							>
								<button
									type="button"
									onClick={() => property?._id && navigate(`/property/${property._id}`)}
									disabled={!property}
									className="flex items-center gap-4 min-w-0 flex-1 text-left"
								>
									<div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
										{image ? (
											<img src={image} alt="" className="w-full h-full object-cover" />
										) : (
											<Building2 className="w-6 h-6 text-slate-400" />
										)}
									</div>
									<div className="min-w-0">
										<p className="font-bold text-slate-900 truncate">
											{property ? property.title || property.selectedType : 'Listing removed'}
										</p>
										<p className="text-xs text-slate-500 truncate">
											{property ? `${property.locality || ''}${property.city ? `, ${property.city}` : ''}` : ''}
											{property?.price ? ` · ${formatPrice(property.price)}${isRental ? '/month' : ''}` : ''}
										</p>
										<p className="text-xs text-slate-400 mt-1">
											{STATUS_LABELS[lead.status] || lead.status} · {new Date(lead.createdAt).toLocaleDateString('en-IN')}
											{nextVisit?.scheduledFor && (
												<span className="inline-flex items-center gap-1 ml-2 text-emerald-700 font-semibold">
													<CalendarDays className="w-3 h-3" />
													Visit {new Date(nextVisit.scheduledFor).toLocaleDateString('en-IN')}
												</span>
											)}
										</p>
									</div>
								</button>
								{property?.sourceUrl && !lead.owner?.phoneNumber && (
									<span className="flex items-center gap-2 text-sm text-slate-400 shrink-0">
										<Phone className="w-4 h-4" />
										Phone: Not specified
									</span>
								)}
								{lead.owner?.phoneNumber && (
									<a
										href={`tel:+91${lead.owner.phoneNumber}`}
										className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline shrink-0"
									>
										<Phone className="w-4 h-4" />
										<span>
											{posterName(lead)} · +91 {lead.owner.phoneNumber}
										</span>
									</a>
								)}
							</li>
						)
					})}
				</ul>
			) : (
				<p className="text-sm text-slate-500">
					You haven't contacted any property yet. Open a listing and tap “Get Phone Number” or “Enquire”.
				</p>
			)}
		</section>
	)
}

export default MyEnquiriesPanel
