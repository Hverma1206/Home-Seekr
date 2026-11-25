import { Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'

const LAST_UPDATED = '24 November 2026'

// Static content pages linked from the footer. Keep these in sync with what the app actually does.
const PAGES = {
	about: {
		eyebrow: 'About us',
		title: 'Property search without the runaround.',
		intro:
			'RealtyHub connects people looking for a home or a workspace with the owners, agents and builders who have one. Search, shortlist and contact posters directly, or list your own property for free.',
		sections: [
			{
				heading: 'For buyers and tenants',
				body: [
					'Search homes to buy or rent, PGs, commercial spaces and new builder projects across Indian cities. Filter by budget, bedrooms, furnishing, property type and who posted the listing.',
					'Save the listings you like, compare up to three side by side, and send an enquiry or reveal the poster’s number when you are ready to talk.',
				],
			},
			{
				heading: 'For owners, agents and builders',
				body: [
					'Posting a property is free. Verify your phone number once, fill in the details and photos, and your listing goes live. Enquiries from interested buyers and tenants arrive on your dashboard.',
				],
			},
			{
				heading: 'Our approach',
				body: [
					'Every account that posts or enquires has a verified phone number, so both sides know a real person is on the other end. We still recommend visiting a property and checking its documents before you pay anyone.',
				],
			},
		],
		cta: { label: 'Browse properties', to: '/listings' },
	},
	privacy: {
		eyebrow: 'Privacy policy',
		title: 'How we handle your data',
		intro: `Last updated ${LAST_UPDATED}. This page explains what RealtyHub collects, why, and who can see it.`,
		sections: [
			{
				heading: 'What we collect',
				body: [
					'Account details you give us: name, email address, mobile number, role (buyer, owner, agent or builder), company name, profile photo and bio.',
					'What you do on RealtyHub: properties you post, listings you save, enquiries you send, your recent searches, search alerts and the preferences you set on your profile.',
					'If you allow location access in your browser, it is used on your device to pick your nearest city for listings. We do not store your exact location.',
				],
			},
			{
				heading: 'How we use it',
				body: [
					'To run your account, show you relevant listings, deliver enquiries to posters, and send you verification codes. If you subscribe to our newsletter we will email you about new listings and updates; you can unsubscribe at any time.',
				],
			},
			{
				heading: 'Who can see it',
				body: [
					'When you send an enquiry or reveal a poster’s number, the poster receives your name and phone number so they can reply. When you post a property, a signed-in user with a verified phone number can reveal your number on that listing; doing so also sends you their details as an enquiry.',
					'Verification codes are delivered through our SMS and email providers. We do not sell your personal data.',
				],
			},
			{
				heading: 'Stored on your device',
				body: [
					'Your browser keeps your login session, recent searches and compare list in local storage. Logging out removes your session; clearing site data removes the rest.',
				],
			},
			{
				heading: 'Your choices',
				body: [
					'You can edit your profile and preferences at any time from your profile settings. To delete your account or get a copy of your data, contact us and we will help.',
				],
			},
		],
		cta: { label: 'Contact us', to: '/contact' },
	},
	terms: {
		eyebrow: 'Terms of use',
		title: 'The rules of the road',
		intro: `Last updated ${LAST_UPDATED}. By using RealtyHub you agree to these terms.`,
		sections: [
			{
				heading: 'Your account',
				body: [
					'Give accurate details and keep your login to yourself. You are responsible for what is posted or sent from your account.',
				],
			},
			{
				heading: 'Listings',
				body: [
					'Only post properties you own or are authorised to sell or rent. Prices, photos and descriptions must be accurate. Do not post duplicate, misleading or fraudulent listings.',
					'We may edit or remove any listing, and suspend any account, that breaks these rules or that we receive credible complaints about.',
				],
			},
			{
				heading: 'Dealing with other users',
				body: [
					'RealtyHub is a platform that connects people. We are not a party to any deal and do not verify ownership, titles or the condition of a property. Visit the property, check the documents and never pay a token amount before you are satisfied.',
				],
			},
			{
				heading: 'Acceptable use',
				body: [
					'Do not scrape the site, spam other users, use someone else’s phone number or email, or try to break or overload the service.',
				],
			},
			{
				heading: 'Changes',
				body: [
					'We may update these terms. If the changes are significant we will tell you on the site before they take effect.',
				],
			},
		],
		cta: { label: 'Contact us', to: '/contact' },
	},
}

const InfoPage = ({ page }) => {
	const content = PAGES[page]
	if (!content) return null

	return (
		<Motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="pt-32 pb-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
		>
			<p className="text-xs uppercase tracking-[0.35em] text-emerald-600 font-bold mb-3">{content.eyebrow}</p>
			<h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-6">{content.title}</h1>
			<p className="text-lg text-slate-500 font-medium mb-12">{content.intro}</p>

			<div className="space-y-10">
				{content.sections.map((section) => (
					<section key={section.heading}>
						<h2 className="text-xl font-black text-slate-900 mb-3">{section.heading}</h2>
						{section.body.map((paragraph) => (
							<p key={paragraph.slice(0, 40)} className="text-slate-600 leading-relaxed mb-3">
								{paragraph}
							</p>
						))}
					</section>
				))}
			</div>

			<Link
				to={content.cta.to}
				className="inline-flex mt-12 px-6 py-3.5 rounded-full font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
			>
				{content.cta.label}
			</Link>
		</Motion.div>
	)
}

export default InfoPage
