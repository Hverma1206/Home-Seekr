import { motion as Motion } from 'framer-motion';
import { ArrowUpRight, Building, Building2, Users, IndianRupee, Send } from 'lucide-react';
import { staggerContainer } from '../animations/variants';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PropertyCard from '../components/PropertyCard';
import SearchBar from '../components/SearchBar';

const HomePage = ({
  onViewChange,
  onPropertySelect,
  properties = [],
  locationMeta,
  isLoading,
  locationError,
  onSearch,
  savedPropertyIds,
  onToggleSave,
}) => {
  const featured = properties.slice(0, 3);
  const browse = (filters) => onViewChange('listings', { filters });

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-20">
      
      {/* Editorial Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto pt-28 pb-10">
        <div className="relative rounded-[3rem] overflow-hidden h-[75vh] min-h-[600px] flex flex-col justify-end p-6 md:p-12">
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full">
            <img 
              src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80" 
              alt="Luxury Architecture" 
              className="w-full h-full object-cover"
            />
            {/* Elegant Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-900/10 to-slate-900/80" />
          </div>
          
          <div className="relative z-10 w-full max-w-5xl mx-auto text-center">
            <Motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="light" className="mb-6 inline-block !px-4 !py-2">Premium Real Estate Network</Badge>
              {locationMeta?.city && (
                <p className="text-xs uppercase tracking-[0.4em] text-white/80 font-semibold mb-4">
                  Now serving {locationMeta.city}
                </p>
              )}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tighter leading-[1.1]">
                Find the place <br className="hidden md:block"/> that fits your life.
              </h1>
            </Motion.div>
            
            <SearchBar onSearch={onSearch || (() => onViewChange('listings'))} />
          </div>
        </div>
      </section>

      {/* What the platform offers */}
      <section className="py-10 border-b border-slate-100">
        <ul className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6 text-slate-600 font-semibold text-sm">
          {[
            { icon: <Building2 className="w-5 h-5" />, label: 'Buy, rent, PG & commercial' },
            { icon: <Users className="w-5 h-5" />, label: 'Owners, agents & builders' },
            { icon: <IndianRupee className="w-5 h-5" />, label: 'List your property free' },
            { icon: <Send className="w-5 h-5" />, label: 'Enquiries go straight to the poster' },
          ].map(({ icon, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="w-10 h-10 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                {icon}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* Featured Collection Section */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">
                Fresh listings{locationMeta?.city ? <><br />in {locationMeta.city}.</> : '.'}
              </h2>
              <p className="text-lg text-slate-500 font-medium">The newest homes from owners, agents and builders, updated as they're posted.</p>
              {locationError && (
                <p className="text-xs text-slate-400 font-semibold mt-3">{locationError}</p>
              )}
            </div>
            <Button variant="secondary" onClick={() => onViewChange('listings')} icon={<ArrowUpRight className="w-5 h-5"/>}>
              View all listings
            </Button>
          </div>
          
          <Motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {isLoading && !featured.length ? (
              <div className="text-slate-400 font-semibold">Loading listings...</div>
            ) : !featured.length ? (
              <div className="text-slate-500 font-semibold">No listings yet. Check back soon, or post your own property.</div>
            ) : (
              featured.map(prop => (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  onClick={onPropertySelect}
                  isSaved={savedPropertyIds?.has(String(prop.id))}
                  onToggleSave={onToggleSave}
                />
              ))
            )}
          </Motion.div>
        </div>
      </section>

      {/* Bento Grid Categories */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-16 text-center">Live Your Way.</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
            {/* Large Card */}
            <button type="button" className="md:col-span-2 relative rounded-[2.5rem] overflow-hidden group cursor-pointer h-64 md:h-full text-left" onClick={() => browse({ propertyCategory: 'residential', selectedType: 'Villa' })}>
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
              <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/20 transition-colors" />
              <div className="absolute bottom-8 left-8">
                <Badge variant="light" className="mb-3">Independent homes</Badge>
                <h3 className="text-4xl font-bold text-white tracking-tight">Villas & Houses</h3>
              </div>
            </button>
            
            {/* Stacked Cards */}
            <div className="flex flex-col gap-6 h-full">
              <button type="button" className="flex-1 relative rounded-[2.5rem] overflow-hidden group cursor-pointer min-h-[250px] text-left" onClick={() => browse({ propertyCategory: 'residential', selectedType: 'Apartment' })}>
                <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/20 transition-colors" />
                <div className="absolute bottom-6 left-6">
                  <Badge variant="light" className="mb-2">Flats & societies</Badge>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Apartments</h3>
                </div>
              </button>
              <button type="button" className="flex-1 relative rounded-[2.5rem] overflow-hidden group cursor-pointer min-h-[250px] bg-emerald-500 flex flex-col items-center justify-center text-center p-8" onClick={() => browse({ propertyCategory: 'commercial' })}>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 text-white">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Commercial Spaces</h3>
                <p className="text-emerald-100 font-medium mb-6">Offices & Retail</p>
                <span className="bg-white text-emerald-600 px-6 py-2.5 rounded-full font-bold text-sm w-full group-hover:shadow-lg transition-shadow">Explore Now</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </Motion.div>
  );
};

export default HomePage;

