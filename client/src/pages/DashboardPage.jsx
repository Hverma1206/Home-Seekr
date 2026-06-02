import { useNavigate } from 'react-router-dom'
import { Mail, Phone, Pencil } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'

const DashboardPage = () => {
	const navigate = useNavigate()
	const { user } = useAuth()
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

	return (
		<div className="min-h-screen bg-slate-50 pt-28 pb-20">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
								Manage your profile and stay on top of your property journey.
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

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
						</div>

						<div className="lg:col-span-2 bg-slate-50 rounded-3xl p-8">
							<h3 className="text-xl font-black text-slate-900 mb-6">Profile details</h3>
							<div className="space-y-5">
								<div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-slate-100">
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
								<div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-slate-100">
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
							<div className="mt-8 bg-white rounded-2xl p-6 border border-slate-100">
								<h4 className="text-lg font-bold text-slate-900">Edit profile</h4>
								<p className="text-sm text-slate-500 mt-2">
									Update your name, contact details, bio, and profile image.
								</p>
								<Button
									variant="secondary"
									className="mt-4"
									onClick={() => navigate('/profile')}
								>
									Go to Profile Settings
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default DashboardPage
