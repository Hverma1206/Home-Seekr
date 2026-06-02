import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Menu, X, ChevronDown, LogOut, LayoutDashboard, UserCog, Heart, ListChecks } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

const Navbar = ({ onViewChange, currentView, onPostProperty }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.phoneNumber || 'Account';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoginClick = () => {
    setProfileOpen(false);
    onViewChange('login');
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout({ redirectTo: '/' });
  };

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
          {currentView !== 'listings' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100/50 backdrop-blur-md p-1 rounded-full border border-white/20">
              {[
                { label: 'Buy', view: 'listings' },
                { label: 'Rent', view: 'listings' },
                { label: 'Commercial', view: 'listings' },
                { label: '', view: 'projects' },
              ].map((item) => (
                <button 
                  key={item.label} 
                  onClick={() => onViewChange(item.view)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all hover:bg-white hover:shadow-sm ${isScrolled ? 'text-slate-700' : 'text-slate-800'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoading && !isAuthenticated && (
              <>
                <button
                  onClick={handleLoginClick}
                  className={`text-sm font-semibold hover:opacity-70 transition-opacity ${currentView === 'login' ? 'opacity-50 pointer-events-none' : ''} ${isScrolled ? 'text-slate-900' : 'text-slate-900'}`}
                >
                  Login
                </button>
                <button
                  onClick={handleLoginClick}
                  className={`text-sm font-semibold hover:opacity-70 transition-opacity ${isScrolled ? 'text-slate-900' : 'text-slate-900'}`}
                >
                  Signup
                </button>
              </>
            )}

            {isAuthenticated && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-full bg-white/80 px-3 py-2 shadow-sm border border-white/60 hover:shadow-md transition-shadow"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials || 'U'
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{displayName}</p>
                    <p className="text-[11px] text-slate-500">Profile</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/dashboard');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <UserCog className="w-4 h-4" />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/wishlist');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Heart className="w-4 h-4" />
                      Saved Properties
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/compare');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ListChecks className="w-4 h-4" />
                      Compare
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

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
