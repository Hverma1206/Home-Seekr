import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Building } from 'lucide-react';
import Button from './ui/Button';

const SearchBar = ({ onSearch }) => {
  const [activeTab, setActiveTab] = useState('buy');
  const [query, setQuery] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [error, setError] = useState('');

  const CITY_ALIASES = {
    delhi: 'Delhi',
    gurugram: 'Gurugram',
    gurgaon: 'Gurugram',
    noida: 'Noida',
    bangalore: 'Bengaluru',
    bengaluru: 'Bengaluru',
    mumbai: 'Mumbai',
    hyderabad: 'Hyderabad',
    pune: 'Pune',
    kolkata: 'Kolkata',
  };

  const handleSearch = () => {
    if (!onSearch) return;

    const filters = {};
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('Please enter a location to search.');
      return;
    }
    if (trimmedQuery) {
      const parts = trimmedQuery.split(',').map((part) => part.trim()).filter(Boolean);
      if (parts.length > 1) {
        filters.locality = parts[0];
        filters.city = parts[1];
      } else {
        const lowerQuery = parts[0].toLowerCase();
        if (CITY_ALIASES[lowerQuery]) {
          filters.city = CITY_ALIASES[lowerQuery];
        } else {
          filters.locality = parts[0];
        }
      }
    }

    if (propertyType) {
      filters.selectedType = propertyType;
    }

    if (activeTab === 'commercial') {
      filters.propertyCategory = 'commercial';
    } else if (activeTab === 'projects') {
      filters.propertyCategory = 'project';
    } else {
      filters.propertyCategory = 'residential';
      filters.lookingTo = activeTab;
    }

    setError('');
    onSearch(filters);
  };
  
  return (
    <motion.div 
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="w-full max-w-4xl mx-auto mt-8 relative z-20"
    >
      {/* Floating Tabs */}
      <div className="flex justify-center mb-[-1rem] relative z-10">
        <div className="bg-slate-900 p-1 rounded-full shadow-lg flex gap-1">
          {['buy', 'rent', 'pg', 'commercial', 'projects'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === tab ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Search Body */}
      <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 flex flex-col md:flex-row gap-2 pt-8 md:pt-3">
        
        <div className="flex-1 flex items-center gap-3 px-6 py-3 md:py-4 bg-slate-50 rounded-full md:rounded-[2rem]">
          <Search className="w-5 h-5 text-emerald-500 shrink-0" />
          <input 
            type="text" 
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search neighborhood, city, or zip..." 
            className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
          />
        </div>

        {error && (
          <p className="px-6 text-xs font-semibold text-rose-500 md:col-span-2">
            {error}
          </p>
        )}
        
        <div className="flex-1 flex items-center gap-3 px-6 py-3 md:py-4 bg-slate-50 rounded-full md:rounded-[2rem] hidden sm:flex">
          <Building className="w-5 h-5 text-slate-400 shrink-0" />
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className="w-full bg-transparent border-none focus:outline-none text-slate-700 font-medium cursor-pointer appearance-none"
          >
            <option value="">All Property Types</option>
            <option value="Apartment">Apartment</option>
            <option value="Villa">Villa</option>
            <option value="Builder Floor">Builder Floor</option>
            <option value="Plot / Land">Plots / Land</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>
        
        <Button onClick={handleSearch} className="md:w-auto w-full !py-4 md:!px-10 rounded-full text-lg">
          Search
        </Button>
      </div>
    </motion.div>
  );
};

export default SearchBar;
