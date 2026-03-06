import { motion } from 'framer-motion';
import { ArrowUpRight, Building } from 'lucide-react';
import { staggerContainer } from '../animations/variants';
import { MOCK_PROPERTIES } from '../data/properties';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PropertyCard from '../components/PropertyCard';
import SearchBar from '../components/SearchBar';

const HomePage = ({ onViewChange, onPropertySelect }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-20">
      
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
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="light" className="mb-6 inline-block !px-4 !py-2">Premium Real Estate Network</Badge>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tighter leading-[1.1]">
                Find the place <br className="hidden md:block"/> that fits your life.
              </h1>
            </motion.div>
            
            <SearchBar onSearch={() => onViewChange('listings')} />
          </div>
        </div>
      </section>

      {/* Stats/Logos Strip */}
      <section className="py-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-wrap justify-center md:justify-between items-center gap-8 text-slate-400 font-bold uppercase tracking-widest text-sm">
          <span>Forbes Real Estate</span>
          <span>Architectural Digest</span>
          <span>Vogue Living</span>
          <span className="hidden sm:block">Bloomberg</span>
          <span className="hidden md:block">The Wall Street Journal</span>
        </div>
      </section>

      {/* Featured Collection Section */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">The Signature <br/> Collection.</h2>
              <p className="text-lg text-slate-500 font-medium">Curated homes of exceptional quality and design, handpicked by our expert real estate curators.</p>
            </div>
            <Button variant="secondary" onClick={() => onViewChange('listings')} icon={<ArrowUpRight className="w-5 h-5"/>}>
              View Collection
            </Button>
          </div>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {MOCK_PROPERTIES.slice(0, 3).map(prop => (
              <PropertyCard key={prop.id} property={prop} onClick={onPropertySelect} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Categories */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-16 text-center">Live Your Way.</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
            {/* Large Card */}
            <div className="md:col-span-2 relative rounded-[2.5rem] overflow-hidden group cursor-pointer h-64 md:h-full" onClick={() => onViewChange('listings')}>
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Villas" />
              <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/20 transition-colors" />
              <div className="absolute bottom-8 left-8">
                <Badge variant="light" className="mb-3">800+ Properties</Badge>
                <h3 className="text-4xl font-bold text-white tracking-tight">Luxury Villas</h3>
              </div>
            </div>
            
            {/* Stacked Cards */}
            <div className="flex flex-col gap-6 h-full">
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden group cursor-pointer min-h-[250px]" onClick={() => onViewChange('listings')}>
                <img src="https://images.unsplash.com/photo-1600607687931-cebf0746e426?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Apartments" />
                <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/20 transition-colors" />
                <div className="absolute bottom-6 left-6">
                  <Badge variant="light" className="mb-2">4.5k+ Properties</Badge>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Apartments</h3>
                </div>
              </div>
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden group cursor-pointer min-h-[250px] bg-emerald-500 flex flex-col items-center justify-center text-center p-8" onClick={() => onViewChange('listings')}>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 text-white">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Commercial Spaces</h3>
                <p className="text-emerald-100 font-medium mb-6">Offices & Retail</p>
                <button className="bg-white text-emerald-600 px-6 py-2.5 rounded-full font-bold text-sm w-full hover:shadow-lg transition-shadow">Explore Now</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default HomePage;

