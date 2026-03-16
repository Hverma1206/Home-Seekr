import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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

function MainLayout() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('home');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, selectedProperty]);

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    setCurrentView('details');
  };

  const handleViewChange = (view) => {
    setSelectedProperty(null);
    setCurrentView(view);
  };

  const handlePostProperty = () => {
    if (isLoggedIn) {
      navigate('/post-property');
    } else {
      setRedirectAfterLogin('/post-property');
      handleViewChange('login');
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    const redirect = redirectAfterLogin || null;
    setRedirectAfterLogin(null);
    if (redirect) {
      navigate(redirect);
    } else {
      handleViewChange('home');
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navbar onViewChange={handleViewChange} currentView={currentView} onPostProperty={handlePostProperty} isLoggedIn={isLoggedIn} />
      
      <main className="min-h-screen">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <HomePage key="home" onViewChange={handleViewChange} onPropertySelect={handlePropertySelect} />
          )}
          {currentView === 'listings' && (
            <ListingsPage key="listings" onPropertySelect={handlePropertySelect} />
          )}
          {currentView === 'details' && (
            <PropertyDetailsPage key="details" property={selectedProperty} onBack={() => handleViewChange('listings')} />
          )}
          {currentView === 'login' && (
            <LoginSignupPage key="login" onViewChange={handleViewChange} onLoginSuccess={handleLoginSuccess} />
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
      <Route path="/post-property" element={<PostPropertyPage />} />
      <Route path="/post-property/form" element={<PropertyFormPage />} />
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
}
