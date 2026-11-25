import { Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'

const NotFoundPage = () => (
	<Motion.div
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		exit={{ opacity: 0 }}
		className="pt-40 pb-16 max-w-xl mx-auto px-4 text-center"
	>
		<p className="text-7xl font-black text-emerald-500 tracking-tighter mb-4">404</p>
		<h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-4">This page doesn&apos;t exist</h1>
		<p className="text-slate-500 font-medium mb-10">The link may be broken, or the page may have moved.</p>
		<div className="flex flex-wrap justify-center gap-3">
			<Link to="/" className="px-6 py-3.5 rounded-full font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">
				Go home
			</Link>
			<Link to="/listings" className="px-6 py-3.5 rounded-full font-semibold bg-white text-slate-900 border border-slate-200 hover:border-slate-900 transition-colors">
				Browse listings
			</Link>
		</div>
	</Motion.div>
)

export default NotFoundPage
