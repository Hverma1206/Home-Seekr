import { motion } from 'framer-motion';
import { MapPin, Heart, BedDouble, Maximize, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { fadeUp } from '../animations/variants';
import Badge from './ui/Badge';

const PropertyCard = ({ property, onClick }) => {
  return (
    <motion.div 
      variants={fadeUp}
      whileHover={{ y: -10 }}
      className="group cursor-pointer bg-white rounded-[2rem] p-3 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 border border-slate-100"
      onClick={() => onClick(property)}
    >
      <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-[1.5rem] mb-5">
        <img 
          src={property.image} 
          alt={property.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80" />
        
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {property.tags.map((tag, idx) => (
            <Badge key={idx} variant={tag === 'Signature' || tag === 'Bespoke' ? 'dark' : 'light'}>
              {tag}
            </Badge>
          ))}
        </div>
        
        <button className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-emerald-500 transition-colors z-10" onClick={(e) => { e.stopPropagation(); }}>
          <Heart className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <h3 className="text-2xl font-bold text-white tracking-tight">{property.price}</h3>
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </div>
        </div>
      </div>
      
      <div className="px-3 pb-2">
        <h4 className="text-xl font-bold text-slate-900 mb-1 tracking-tight line-clamp-1 group-hover:text-emerald-600 transition-colors">{property.title}</h4>
        <p className="text-slate-500 text-sm flex items-center gap-1.5 mb-5 font-medium">
          <MapPin className="w-4 h-4 text-emerald-500" />
          {property.location}
        </p>
        
        <div className="flex items-center gap-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-full"><BedDouble className="w-4 h-4 text-slate-600" /></div>
            <span className="text-sm font-semibold text-slate-700">{property.bhk}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-full"><Maximize className="w-4 h-4 text-slate-600" /></div>
            <span className="text-sm font-semibold text-slate-700">{property.area}</span>
          </div>
          
          <div className="ml-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard;
