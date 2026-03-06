import { Home, Phone, MapPin } from 'lucide-react';

const Footer = () => (
  <footer className="bg-slate-950 text-slate-400 py-20 mt-20 rounded-t-[3rem]">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-emerald-500 p-2 rounded-full">
              <Home className="text-white w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tighter">RealtyHub.</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-8">
            Elevating the real estate experience. We curate the finest properties to match your distinctive lifestyle and investment goals.
          </p>
          <div className="flex gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer" />
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Explore</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Premium Homes</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Commercial Spaces</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">New Projects</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Market Insights</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Company</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Press</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Get in Touch</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-emerald-500"/> +91 98765 43210</li>
            <li className="flex items-center gap-3"><MapPin className="w-4 h-4 text-emerald-500"/> Cyber City, Gurugram</li>
          </ul>
        </div>
      </div>
      
      <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <p>&copy; 2026 RealtyHub Inc. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Sitemap</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
