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
  const [properties, setProperties] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [propertiesMeta, setPropertiesMeta] = useState({ city: '', locality: '' });
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  // Starts true so the first paint shows skeletons, not a flash of "no listings"
  const [propertiesLoading, setPropertiesLoading] = useState(true);
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
    // Only the latest request may update the page: a slow older response must not overwrite newer filters
    let isActive = true;

    const fetchListings = async () => {
      setPropertiesLoading(true);
      setPropertiesError('');

      try {
        let locationContext = { city: 'Bengaluru', locality: '', confidence: 'low' };
        if (coords?.latitude && coords?.longitude) {
          const derivedContext = getLocationContext(coords.latitude, coords.longitude);
          if (derivedContext?.city) locationContext = derivedContext;
        }

        const filters = sanitizeFilters(activeFilters);
        const userPickedLocation = Boolean(filters.city || filters.locality);
        const pageParams = { sortBy, page: currentPage, limit: LISTINGS_PAGE_SIZE };

        // Without a chosen location, start with the visitor's (detected or default) city
        let result = await propertyService.getProperties({
          ...filters,
          ...(userPickedLocation ? {} : { city: locationContext.city }),
          ...pageParams,
        });
        let fallbackFrom = null;

        // Nothing in the detected city: run the same search everywhere instead of showing an empty page
        if (!userPickedLocation && !result.properties.length && isActive) {
          result = await propertyService.getProperties({ ...filters, ...pageParams });
          fallbackFrom = locationContext.city;
        }

        if (!isActive) return;

        const listingsTotal = result.meta?.total || result.total || 0;
        setProperties(result.properties);
        setPropertiesMeta({
          city: userPickedLocation
            ? filters.city || result.meta?.location?.city || ''
            : fallbackFrom ? '' : locationContext.city,
          locality: filters.locality || '',
          total: listingsTotal,
          page: result.meta?.page || currentPage,
          pages: Math.max(1, Math.ceil(listingsTotal / LISTINGS_PAGE_SIZE)),
          limit: LISTINGS_PAGE_SIZE,
          confidence: locationContext.confidence,
          notFound: listingsTotal === 0,
          fallbackFrom,
        });
      } catch (error) {
        if (!isActive) return;
        console.error('Error fetching properties:', error);
        setPropertiesError('Unable to load listings right now. Please try again.');
      } finally {
        if (isActive) setPropertiesLoading(false);
      }
    };

    fetchListings();

    return () => {
      isActive = false;
    };
  }, [coords, activeFilters, sortBy, currentPage]);

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

  // Filter tweaks on the listings page: update in place. Replacing (not pushing) the history entry keeps Back
  // meaningful and lets the filters survive a visit to a property and back; tweaks aren't saved as recent searches.
  const handleFiltersChange = (filters) => {
    const next = sanitizeFilters(filters);
    setCurrentPage(1);
    setActiveFilters(next);
    navigate('/listings', { replace: true, state: { filters: next } });
  };

  const handleSortChange = (nextSort) => {
    setSortBy(nextSort);
    setCurrentPage(1);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage === currentPage) return;
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewModeChange = (nextMode) => {
    if (nextMode !== 'map' && nextMode !== 'list') return;
    setViewMode(nextMode);
  };

  const handleToggleSave = async (property) => {
    const propertyId = property?.id || property?._id || property?.raw?._id;
    if (!propertyId) return;

    if (!isAuthenticated) {
      handleViewChange('login', { from: location.pathname || '/' });
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
      // Come back to the page the user was on once they have logged in
      const from = navState?.from || (location.pathname !== '/login' ? location.pathname : '/');
      navigate('/login', { state: { from } });
    }
  };

  // /post-property is a protected route: logged-out users are sent to login and brought back
  const handlePostProperty = () => {
    navigate('/post-property');
  };

  const handleLoginSuccess = (redirectTo) => {
    navigate(redirectTo || '/', { replace: true });
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
              onFiltersChange={handleFiltersChange}
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
      <Route
        path="/post-property"
        element={
          <ProtectedRoute>
            <PostPropertyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/post-property/form"
        element={
          <ProtectedRoute>
            <PropertyFormPage />
          </ProtectedRoute>
        }
      />
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
