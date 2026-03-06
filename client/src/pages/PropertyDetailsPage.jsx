import { motion } from 'framer-motion';
import { 
  MapPin, Building, Heart, Share2, Bath, BedDouble, Maximize, 
  Star, ChevronLeft, Car, Shield, Wifi 
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const PropertyDetailsPage = ({ property, onBack }) => {
  if (!property) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="pt-32 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 bg-white"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-8 hover:text-slate-900 uppercase tracking-wider transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Collection
      </button>

      {/* Editorial Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div className="max-w-3xl">
          <div className="flex gap-2 mb-4">
            {property.tags.map((tag, idx) => (
              <Badge key={idx} variant="dark">{tag}</Badge>
            ))}
            <Badge variant="accent">{property.status}</Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
            {property.title}
          </h1>
          <p className="text-xl text-slate-500 font-medium flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-500" /> {property.location}
          </p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Listed Price</p>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{property.price}</h2>
        </div>
      </div>

      {/* Bento Box Image Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-16 h-[60vh] min-h-[500px]">
        <div className="lg:col-span-8 rounded-[2.5rem] overflow-hidden relative group">
          <img src={property.image} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        </div>
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
          <div className="flex-1 rounded-[2.5rem] overflow-hidden group">
            <img src="https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=600&q=80" alt="Interior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="flex-1 rounded-[2.5rem] overflow-hidden relative group cursor-pointer">
            <img src="https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=600&q=80" alt="Interior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center group-hover:bg-slate-900/50 transition-colors backdrop-blur-sm">
              <Button variant="secondary" className="!bg-white/90 backdrop-blur-md !border-none" icon={<Maximize className="w-4 h-4"/>}>
                Show all photos
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Main Content Area */}
        <div className="flex-1">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8 border-y border-slate-100 mb-12">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Configuration</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><BedDouble className="w-5 h-5 text-emerald-500"/> {property.bhk}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Area Space</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><Maximize className="w-5 h-5 text-emerald-500"/> {property.area}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Property Type</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><Building className="w-5 h-5 text-emerald-500"/> {property.type}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Est. EMI</p>
              <p className="text-xl font-bold text-slate-900">₹1.2L <span className="text-sm text-slate-500 font-medium">/mo</span></p>
            </div>
          </div>

          {/* About Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">About the property</h2>
            <div className="prose prose-lg text-slate-600 font-medium leading-relaxed">
              <p>
                Experience unparalleled luxury in this exquisite property located in the highly coveted heart of {property.location}. 
                Boasting architectural brilliance and premium bespoke fittings, this expansive {property.bhk} residence offers a meticulous 
                living area of {property.area}.
              </p>
              <p className="mt-4">
                Designed for those who appreciate the finer things, the property features floor-to-ceiling windows ensuring abundant natural light, a state-of-the-art chef's kitchen, and panoramic scenic views that redefine urban living.
              </p>
            </div>
          </div>

          {/* Premium Amenities */}
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-8">Premium Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {[
                { icon: Shield, label: "24/7 Concierge" },
                { icon: Car, label: "Valet Parking" },
                { icon: Bath, label: "Infinity Pool" },
                { icon: Wifi, label: "Smart Home Tech" },
                { icon: Building, label: "Private Lounge" },
                { icon: Star, label: "Wellness Center" },
              ].map((amenity, idx) => (
                <div key={idx} className="flex flex-col gap-3 p-6 rounded-[1.5rem] bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-sm group-hover:text-emerald-600">
                    <amenity.icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-800">{amenity.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Contact Widget */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl sticky top-32">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-black tracking-tighter">Interested?</h3>
              <div className="flex gap-2">
                <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors"><Share2 className="w-4 h-4"/></button>
                <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"><Heart className="w-4 h-4"/></button>
              </div>
            </div>

            <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-800">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg">
                {property.dealer.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-1">Exclusive Agent</p>
                <p className="text-xl font-bold">{property.dealer}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button variant="accent" className="w-full !py-4 text-lg">Schedule a Tour</Button>
              <Button className="w-full !py-4 bg-slate-800 hover:bg-slate-700 text-white shadow-none">Request Details</Button>
            </div>
            
            <p className="text-xs text-center text-slate-500 mt-6 font-medium">
              Information is deemed reliable but not guaranteed.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyDetailsPage;
