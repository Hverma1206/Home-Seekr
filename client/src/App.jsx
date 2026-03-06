import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import NewsletterCTA from './components/layout/NewsletterCTA';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedProperty, setSelectedProperty] = useState(null);

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

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      <Navbar onViewChange={handleViewChange} />
      
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
        </AnimatePresence>
      </main>

      <NewsletterCTA />
      <Footer />
    </div>
  );
}
