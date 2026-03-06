import { motion } from 'framer-motion';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { staggerContainer } from '../animations/variants';
import { MOCK_PROPERTIES } from '../data/properties';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PropertyCard from '../components/PropertyCard';

const ListingsPage = ({ onPropertySelect }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pt-32 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* Editorial Sidebar Filters */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-32">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Gurugram</h1>
            <p className="text-slate-500 font-medium mb-10">1,245 Premium Properties</p>

            <div className="space-y-8 pr-6">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Budget Range
                </h3>
                <input type="range" className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" min="0" max="100" />
                <div className="flex justify-between text-sm font-semibold text-slate-500 mt-3">
                  <span>₹0</span>
                  <span>₹10 Cr+</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Bedrooms</h3>
                <div className="flex flex-wrap gap-2">
                  {['1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'].map(bhk => (
                    <button key={bhk} className="px-4 py-2 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-full text-sm font-semibold text-slate-700 transition-colors">
                      {bhk}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Property Type</h3>
                <div className="space-y-3">
                  {['Apartment', 'Villa', 'Builder Floor', 'Plot'].map(type => (
                    <label key={type} className="flex items-center gap-3 text-slate-700 font-medium cursor-pointer group">
                      <div className="w-5 h-5 rounded border-2 border-slate-300 group-hover:border-emerald-500 flex items-center justify-center">
                      </div>
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <Button className="w-full mt-10">Show Results</Button>
          </div>
        </div>

        {/* Main Listing Grid */}
        <div className="flex-1">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div className="flex gap-2">
              <Badge variant="dark">Map View</Badge>
              <Badge variant="light">List View</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500 hidden sm:block">Sort by</span>
              <select className="bg-slate-50 border-none rounded-full px-5 py-2.5 text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer">
                <option>Newest First</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>

          <motion.div 
            variants={staggerContainer} initial="hidden" animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8"
          >
            {MOCK_PROPERTIES.map(prop => (
              <PropertyCard key={prop.id} property={prop} onClick={onPropertySelect} />
            ))}
            {MOCK_PROPERTIES.map(prop => (
              <PropertyCard key={prop.id + '-dup'} property={{...prop, id: prop.id + 10}} onClick={onPropertySelect} />
            ))}
          </motion.div>
          
          {/* Pagination */}
          <div className="flex justify-center items-center gap-2 mt-16">
            <button className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-900 text-white font-bold">1</button>
            <button className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors">2</button>
            <span className="text-slate-400 font-bold px-2">...</span>
            <button className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ListingsPage;
