import { Link } from 'react-router-dom';
import { Home, Mail, MapPin } from 'lucide-react';

const linkClass = 'hover:text-emerald-400 transition-colors';

const EXPLORE_LINKS = [
  { label: 'Buy a home', to: '/listings', state: { filters: { lookingTo: 'buy', propertyCategory: 'residential' } } },
  { label: 'Rent a home', to: '/listings', state: { filters: { lookingTo: 'rent', propertyCategory: 'residential' } } },
  { label: 'Commercial spaces', to: '/listings', state: { filters: { propertyCategory: 'commercial' } } },
  { label: 'New projects', to: '/projects' },
  { label: 'Post your property', to: '/post-property' },
];

const COMPANY_LINKS = [
  { label: 'About us', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy policy', to: '/privacy' },
  { label: 'Terms of use', to: '/terms' },
];

const Footer = () => (
  <footer className="bg-slate-950 text-slate-400 py-20 mt-20 rounded-t-[3rem]">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-6 w-fit">
            <div className="bg-emerald-500 p-2 rounded-full">
              <Home className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tighter">RealtyHub.</span>
          </Link>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Buy, rent or sell property directly with owners, agents and builders. List your property for free and get enquiries straight to your dashboard.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Explore</h4>
          <ul className="space-y-4 text-sm font-medium">
            {EXPLORE_LINKS.map((item) => (
              <li key={item.label}>
                <Link to={item.to} state={item.state} className={linkClass}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Company</h4>
          <ul className="space-y-4 text-sm font-medium">
            {COMPANY_LINKS.map((item) => (
              <li key={item.label}>
                <Link to={item.to} className={linkClass}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Get in Touch</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li>
              <Link to="/contact" className={`flex items-center gap-3 ${linkClass}`}>
                <Mail className="w-4 h-4 text-emerald-500" /> Send us a message
              </Link>
            </li>
            <li className="flex items-center gap-3"><MapPin className="w-4 h-4 text-emerald-500" /> Cyber City, Gurugram</li>
          </ul>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <p>&copy; {new Date().getFullYear()} RealtyHub. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
