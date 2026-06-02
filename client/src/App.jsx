import { useState, useEffect } from 'react';
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
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import useGeoLocation from './hooks/useGeoLocation';
import { propertyService } from './services/propertyService';
import { getLocationContext } from './utils/locationUtils';
import { MOCK_PROPERTIES } from './data/properties';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { coords, error: geoError } = useGeoLocation({ auto: true });
  const [currentView, setCurrentView] = useState('home');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [properties, setProperties] = useState(MOCK_PROPERTIES);
  const [propertiesMeta, setPropertiesMeta] = useState({ city: 'Bangalore', locality: 'Indiranagar' });
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, selectedProperty]);

  useEffect(() => {
    if (location.pathname === '/login') {
      setCurrentView('login');
    } else if (location.pathname === '/listings') {
      setCurrentView('listings');
    } else {
      setCurrentView('home');
    }
  }, [location.pathname]);

  useEffect(() => {
    let isActive = true;

    const fetchListings = async () => {
      setPropertiesLoading(true);
      setPropertiesError('');

      try {
        let city = 'Bangalore'; // Default city
        let locationContext = { city: 'Bangalore', locality: 'Indiranagar' };

        // If we have coordinates, derive the city
        if (coords?.latitude && coords?.longitude) {
          locationContext = getLocationContext(coords.latitude, coords.longitude);
          city = locationContext.city;
        }

        // Fetch properties for the derived city
        const { properties: nextProperties, total } = await propertyService.getPropertiesByCity(city, { limit: 20 });

        if (!isActive) return;

        if (nextProperties.length) {
          setProperties(nextProperties);
          setPropertiesMeta({
            city,
            locality: locationContext.locality,
            total,
            confidence: locationContext.confidence,
          });
        } else {
          // Fallback to general properties if city search returns empty
          const { properties: fallbackProps, total: fallbackTotal } = await propertyService.getProperties({ limit: 20 });
          setProperties(fallbackProps);
          setPropertiesMeta({
            city,
            locality: locationContext.locality,
            total: fallbackTotal,
            confidence: 'low',
          });
        }
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
  }, [coords, geoError]);

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    setCurrentView('details');
  };

  const handleViewChange = (view) => {
    setSelectedProperty(null);
    setCurrentView(view);
    if (view === 'home') {
      navigate('/');
    } else if (view === 'listings') {
      navigate('/listings');
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
            />
          )}
          {currentView === 'details' && (
            <PropertyDetailsPage key="details" property={selectedProperty} onBack={() => handleViewChange('listings')} />
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
      <Route path="/post-property" element={<PostPropertyPage />} />
      <Route path="/post-property/form" element={<PropertyFormPage />} />
      <Route path="/verify-otp" element={<OTPVerificationPage />} />
      <Route path="/login" element={<MainLayout />} />
      <Route path="/listings" element={<MainLayout />} />
      <Route path="/" element={<MainLayout />} />
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
}
