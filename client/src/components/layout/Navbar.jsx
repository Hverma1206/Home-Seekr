import { useState, useEffect } from 'react';
import { Home, Menu, X } from 'lucide-react';
import Button from '../ui/Button';

const Navbar = ({ onViewChange, currentView, onPostProperty, isLoggedIn }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-4 transition-all duration-500 ${isScrolled ? 'pt-4' : 'pt-6'}`}>
      <div className={`max-w-6xl mx-auto transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 border border-white/50 rounded-full py-3 px-6' : 'bg-transparent py-4 px-2'}`}>
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onViewChange('home')}>
            <div className={`p-2 rounded-full transition-colors ${isScrolled ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 group-hover:bg-slate-900 group-hover:text-white'}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className={`text-xl font-bold tracking-tighter ${isScrolled ? 'text-slate-900' : 'text-slate-900 drop-shadow-sm'}`}>
              RealtyHub.
            </span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 backdrop-blur-md p-1 rounded-full border border-white/20">
            {['Buy', 'Rent', 'Commercial', 'New Launch'].map((item) => (
              <button 
                key={item} 
                onClick={() => onViewChange('listings')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all hover:bg-white hover:shadow-sm ${isScrolled ? 'text-slate-700' : 'text-slate-800'}`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => onViewChange('login')}
              className={`text-sm font-semibold hover:opacity-70 transition-opacity ${currentView === 'login' ? 'opacity-50 pointer-events-none' : ''} ${isScrolled ? 'text-slate-900' : 'text-slate-900'}`}
            >
              Sign In
            </button>
            <Button variant="primary" className="!py-2.5 !px-5 !text-sm" onClick={onPostProperty}>Post Property</Button>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 bg-white rounded-full shadow-sm" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="text-slate-900 w-5 h-5" /> : <Menu className="text-slate-900 w-5 h-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
