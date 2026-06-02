import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import NewsletterCTA from './components/layout/NewsletterCTA';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import LoginSignupPage from './pages/LoginSignupPage';
import PostPropertyPage from './pages/PostPropertyPage';
import PropertyFormPage from './pages/PropertyFormPage';
import OTPVerificationPage from './pages/OTPVerificationPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import WishlistPage from './pages/WishlistPage';
import ComparePage from './pages/ComparePage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import useGeoLocation from './hooks/useGeoLocation';
import { propertyService } from './services/propertyService';
import { userService } from './services/userService';
import { getLocationContext } from './utils/locationUtils';

const RECENT_SEARCHES_KEY = 'estatehub.recentSearches';
const LISTINGS_PAGE_SIZE = 20;

const sanitizeFilters = (filters = {}) => Object.fromEntries(
  Object.entries(filters).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  }),
);

const formatPriceShort = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  if (numeric >= 10000000) return `₹${(numeric / 10000000).toFixed(1)} Cr`;
  if (numeric >= 100000) return `₹${(numeric / 100000).toFixed(1)} L`;
  if (numeric >= 1000) return `₹${(numeric / 1000).toFixed(1)} K`;
  return `₹${numeric}`;
};

const buildSearchLabel = (filters = {}) => {
  const parts = [];
  const location = filters.locality
    ? `${filters.locality}${filters.city ? `, ${filters.city}` : ''}`
    : filters.city;

  if (location) parts.push(location);
  if (filters.lookingTo) parts.push(filters.lookingTo.toUpperCase());
  if (!filters.lookingTo && filters.propertyCategory) {
    parts.push(filters.propertyCategory.toUpperCase());
  }
  if (filters.selectedType) parts.push(filters.selectedType);
  if (filters.bhk) parts.push(`${filters.bhk} BHK`);

  if (filters.minPrice || filters.maxPrice) {
    const min = formatPriceShort(filters.minPrice);
    const max = formatPriceShort(filters.maxPrice);
    if (min || max) parts.push(`${min || 'Min'} - ${max || 'Max'}`);
  }

  return parts.filter(Boolean).join(' · ') || 'Explore properties';
};

const recordRecentSearch = (filters) => {
  const cleaned = sanitizeFilters(filters);
  if (!Object.keys(cleaned).length) return;

  const payload = {
    id: `${Date.now()}`,
    label: buildSearchLabel(cleaned),
    filters: cleaned,
    createdAt: Date.now(),
  };

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const deduped = existing.filter((item) => item.label !== payload.label);
    const next = [payload, ...deduped].slice(0, 6);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([payload]));
  }

  return payload;
};

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { coords, error: geoError } = useGeoLocation({ auto: true });
  const [currentView, setCurrentView] = useState('home');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [properties, setProperties] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [propertiesMeta, setPropertiesMeta] = useState({ city: 'Bengaluru', locality: 'Indiranagar' });
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState('');
  const [savedPropertyIds, setSavedPropertyIds] = useState(new Set());
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, selectedProperty]);

  useEffect(() => {
    if (location.pathname === '/login') {
      setCurrentView('login');
    } else if (location.pathname === '/listings') {
      setCurrentView('listings');
    } else if (location.pathname.startsWith('/property/')) {
      const routeId = location.pathname.replace('/property/', '');
      if (!selectedProperty || String(selectedProperty.id) !== routeId) {
        setSelectedProperty(null);
      }
      setCurrentView('details');
    } else if (location.pathname === '/projects') {
      setCurrentView('projects');
    } else if (location.pathname.startsWith('/projects/')) {
      setCurrentView('project-details');
    } else if (location.pathname === '/wishlist') {
      setCurrentView('wishlist');
    } else if (location.pathname === '/compare') {
      setCurrentView('compare');
    } else {
      setCurrentView('home');
    }
  }, [location.pathname, selectedProperty]);

  useEffect(() => {
    const previousPath = previousPathRef.current;

    if (location.pathname === '/listings') {
      const incomingFilters = location.state?.filters;
      if (incomingFilters) {
        setActiveFilters(incomingFilters);
        setCurrentPage(1);
      } else if (previousPath !== '/listings') {
        setActiveFilters({});
        setCurrentPage(1);
        setSortBy('newest');
        setViewMode('list');
      }
    }

    previousPathRef.current = location.pathname;
  }, [location.key, location.pathname, location.state]);

  useEffect(() => {
    let isActive = true;

    const fetchListings = async () => {
      setPropertiesLoading(true);
      setPropertiesError('');

      try {
        let city = 'Bengaluru';
        let locationContext = { city: 'Bengaluru', locality: 'Indiranagar', confidence: 'low' };

        // If we have coordinates, derive the city
        if (coords?.latitude && coords?.longitude) {
          const derivedContext = getLocationContext(coords.latitude, coords.longitude);
          if (derivedContext?.city) {
            locationContext = derivedContext;
            city = derivedContext.city;
          }
        }

        const sanitizedFilters = sanitizeFilters(activeFilters);

        if (!sanitizedFilters.city && !sanitizedFilters.locality) {
          sanitizedFilters.city = city;
        }

        const { properties: nextProperties, total, meta } = await propertyService.getProperties({
          ...sanitizedFilters,
          sortBy,
          page: currentPage,
          limit: LISTINGS_PAGE_SIZE,
        });
        const metaLocation = meta?.location || {};
        const listingsTotal = meta?.total || total || nextProperties.length;
        const listingsPages = Math.max(1, Math.ceil(listingsTotal / LISTINGS_PAGE_SIZE));

        if (!isActive) return;

        const hasLocationFilter = Boolean(sanitizedFilters.city || sanitizedFilters.locality);

        if (nextProperties.length) {
          const resolvedCity = sanitizedFilters.city || metaLocation.city || locationContext.city || city;
          setProperties(nextProperties);
          setPropertiesMeta({
            city: resolvedCity,
            locality: sanitizedFilters.locality || metaLocation.locality || locationContext.locality,
            total: listingsTotal,
            page: meta?.page || currentPage,
            pages: listingsPages,
            limit: LISTINGS_PAGE_SIZE,
            confidence: locationContext.confidence,
            notFound: false,
          });
          return;
        }

        if (hasLocationFilter) {
          const resolvedCity = sanitizedFilters.city || locationContext.city || city;
          const notFound = listingsTotal === 0;
          setProperties([]);
          setPropertiesMeta({
            city: resolvedCity,
            locality: sanitizedFilters.locality || locationContext.locality,
            total: listingsTotal,
            page: meta?.page || currentPage,
            pages: listingsPages,
            limit: LISTINGS_PAGE_SIZE,
            confidence: locationContext.confidence,
            notFound,
          });
          return;
        }

        // Fallback to general properties only when no location filter is set
        const { properties: fallbackProps, total: fallbackTotal, meta: fallbackMeta } = await propertyService.getProperties({
          sortBy,
          page: currentPage,
          limit: LISTINGS_PAGE_SIZE,
        });
        const fallbackLocation = fallbackMeta?.location || {};
        const resolvedFallbackCity = fallbackLocation.city || locationContext.city || city;
        const fallbackPages = Math.max(1, Math.ceil((fallbackMeta?.total || fallbackTotal) / LISTINGS_PAGE_SIZE));
        setProperties(fallbackProps);
        setPropertiesMeta({
          city: resolvedFallbackCity,
          locality: fallbackLocation.locality || locationContext.locality,
          total: fallbackMeta?.total || fallbackTotal,
          page: fallbackMeta?.page || currentPage,
          pages: fallbackPages,
          limit: LISTINGS_PAGE_SIZE,
          confidence: 'low',
          notFound: false,
        });
      } catch (error) {
        if (!isActive) return;
        console.error('Error fetching properties:', error);
        setPropertiesError(geoError || 'Unable to load live listings. Showing curated properties.');
        // Keep showing mock properties on error
      } finally {
        if (isActive) {
          setPropertiesLoading(false);
        }
      }
    };

    // Fetch immediately on mount with default city
    fetchListings();

    // Re-fetch when coordinates change
    if (coords?.latitude && coords?.longitude) {
      fetchListings();
    }
  }, [coords, geoError, activeFilters, sortBy, currentPage]);

  useEffect(() => {
    let isActive = true;

    const fetchSavedProperties = async () => {
      if (!isAuthenticated) {
        setSavedPropertyIds(new Set());
        return;
      }

      try {
        const { properties: saved } = await propertyService.getSavedProperties({ limit: 200 });
        if (!isActive) return;
        const ids = saved.map((property) => String(property.id));
        setSavedPropertyIds(new Set(ids));
      } catch (error) {
        if (!isActive) return;
        console.error('Error fetching saved properties:', error);
        setSavedPropertyIds(new Set());
      }
    };

    fetchSavedProperties();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  const handleSearch = (filters = {}) => {
    setCurrentPage(1);
    const recentPayload = recordRecentSearch(filters);
    if (recentPayload && isAuthenticated) {
      userService.recordRecentSearch({
        label: recentPayload.label,
        filters: recentPayload.filters,
      }).catch((error) => {
        console.error('Error recording recent search:', error);
      });
    }
    if (filters.propertyCategory === 'project') {
      navigate('/projects', { state: { filters } });
      setCurrentView('projects');
      return;
    }

    setActiveFilters(filters);
    handleViewChange('listings', { filters });
  };

  const handleSortChange = (nextSort) => {
    setSortBy(nextSort);
    setCurrentPage(1);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage === currentPage) return;
    setCurrentPage(nextPage);
  };

  const handleViewModeChange = (nextMode) => {
    if (nextMode !== 'map' && nextMode !== 'list') return;
    setViewMode(nextMode);
  };

  const handleToggleSave = async (property) => {
    const propertyId = property?.id || property?._id || property?.raw?._id;
    if (!propertyId) return;

    if (!isAuthenticated) {
      setRedirectAfterLogin(location.pathname || '/');
      handleViewChange('login');
      return;
    }

    try {
      const response = await propertyService.saveProperty(propertyId);
      const isSaved = response?.isSaved;

      setSavedPropertyIds((prev) => {
        const next = new Set(prev);
        if (isSaved) {
          next.add(String(propertyId));
        } else {
          next.delete(String(propertyId));
        }
        return next;
      });
    } catch (error) {
      console.error('Error saving property:', error);
    }
  };

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    setCurrentView('details');
    if (property?.id) {
      navigate(`/property/${property.id}`);
    }
  };

  const handleViewChange = (view, navState) => {
    setSelectedProperty(null);
    setCurrentView(view);
    if (view === 'home') {
      navigate('/');
    } else if (view === 'listings') {
      if (navState) {
        navigate('/listings', { state: navState });
      } else {
        navigate('/listings');
      }
    } else if (view === 'projects') {
      navigate('/projects');
    } else if (view === 'wishlist') {
      navigate('/wishlist');
    } else if (view === 'compare') {
      navigate('/compare');
    } else if (view === 'login') {
      navigate('/login');
    }
  };

  const handlePostProperty = () => {
    if (isAuthenticated) {
      navigate('/post-property');
    } else {
      setRedirectAfterLogin('/post-property');
      handleViewChange('login');
    }
  };

  const handleLoginSuccess = (redirectTo) => {
    const redirect = redirectTo || redirectAfterLogin || '/';
    setRedirectAfterLogin(null);
    navigate(redirect);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navbar
        onViewChange={handleViewChange}
        currentView={currentView}
        onPostProperty={handlePostProperty}
      />
      
      <main className="min-h-screen">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <HomePage
              key="home"
              onViewChange={handleViewChange}
              onPropertySelect={handlePropertySelect}
              properties={properties}
              locationMeta={propertiesMeta}
              isLoading={propertiesLoading}
              locationError={geoError || propertiesError}
              onSearch={handleSearch}
              savedPropertyIds={savedPropertyIds}
              onToggleSave={handleToggleSave}
            />
          )}
          {currentView === 'listings' && (
            <ListingsPage
              key="listings"
              onPropertySelect={handlePropertySelect}
              properties={properties}
              locationMeta={propertiesMeta}
              isLoading={propertiesLoading}
              locationError={geoError || propertiesError}
              onSearch={handleSearch}
              activeFilters={activeFilters}
              savedPropertyIds={savedPropertyIds}
              onToggleSave={handleToggleSave}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              currentPage={propertiesMeta?.page || currentPage}
              totalPages={propertiesMeta?.pages || 1}
              onPageChange={handlePageChange}
            />
          )}
          {currentView === 'details' && (
            <PropertyDetailsPage
              key="details"
              property={selectedProperty}
              onBack={() => handleViewChange('listings')}
              onPropertySelect={handlePropertySelect}
              savedPropertyIds={savedPropertyIds}
              onToggleSave={handleToggleSave}
            />
          )}
          {currentView === 'wishlist' && (
            <WishlistPage
              key="wishlist"
              savedPropertyIds={savedPropertyIds}
              onToggleSave={handleToggleSave}
            />
          )}
          {currentView === 'projects' && (
            <ProjectsPage key="projects" />
          )}
          {currentView === 'project-details' && (
            <ProjectDetailsPage key="project-details" />
          )}
          {currentView === 'compare' && (
            <ComparePage key="compare" />
          )}
          {currentView === 'login' && (
            <LoginSignupPage key="login" onLoginSuccess={handleLoginSuccess} />
          )}
        </AnimatePresence>
      </main>

      {currentView !== 'login' && <NewsletterCTA />}
      {currentView !== 'login' && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compare"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      <Route path="/post-property" element={<PostPropertyPage />} />
      <Route path="/post-property/form" element={<PropertyFormPage />} />
      <Route path="/verify-otp" element={<OTPVerificationPage />} />
      <Route path="/property/:propertyId" element={<MainLayout />} />
      <Route path="/projects" element={<MainLayout />} />
      <Route path="/projects/:projectId" element={<MainLayout />} />
      <Route path="/login" element={<MainLayout />} />
      <Route path="/listings" element={<MainLayout />} />
      <Route path="/" element={<MainLayout />} />
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
}
