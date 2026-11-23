import { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { MapPin, Heart, BedDouble, Maximize, CheckCircle2, Building2 } from 'lucide-react';

// Kept deliberately light: a short fade-in on mount, CSS-only hover (no spring, no backdrop blur over images),
// so a grid of 20 cards stays smooth while filters change.
const PropertyCard = ({ property, onClick, isSaved, onToggleSave, index = 0 }) => {
  const tags = Array.isArray(property.tags) ? property.tags.slice(0, 2) : [];
  // A dead photo URL shows the placeholder instead of the browser's broken-image icon
  const [failedImage, setFailedImage] = useState('');
  const showImage = property.image && failedImage !== property.image;

  return (
    <Motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: Math.min(index, 8) * 0.03 }}
      className="group cursor-pointer bg-white rounded-3xl p-2.5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-[translate,box-shadow] duration-300 ease-out"
      onClick={() => onClick?.(property)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.(property);
      }}
      tabIndex={0}
      aria-label={`${property.title}, ${property.price}${property.priceSuffix || ''}`}
    >
      <div className="relative h-56 w-full overflow-hidden rounded-[1.25rem] mb-4 bg-slate-100">
        {showImage ? (
          <img
            src={property.image}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedImage(property.image)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <Building2 className="w-10 h-10" />
            <span className="text-xs font-semibold mt-2">No photos yet</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/0 to-transparent" />

        {tags.length > 0 && (
          <div className="absolute top-3 left-3 right-14 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-white/90 text-slate-800 text-[10px] font-bold uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label={isSaved ? 'Remove from saved' : 'Save property'}
          aria-pressed={Boolean(isSaved)}
          className={`absolute top-3 right-3 p-2.5 rounded-full transition-colors duration-150 ${
            isSaved
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-900/40 text-white hover:bg-white hover:text-emerald-500'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(property);
          }}
        >
          <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end gap-2">
          <p className="text-2xl font-black text-white tracking-tight">
            {property.price}
            {property.priceSuffix && <span className="text-sm font-semibold text-white/80">{property.priceSuffix}</span>}
          </p>
          {property.isVerified && (
            <span className="bg-emerald-500 px-2.5 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
      </div>

      <div className="px-2.5 pb-1.5">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight line-clamp-1 group-hover:text-emerald-600 transition-colors duration-150">
          {property.title}
        </h3>
        <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1 font-medium">
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="line-clamp-1">{property.location}</span>
        </p>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-sm font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <BedDouble className="w-4 h-4 text-slate-400" />
            {property.bhk}
          </span>
          {property.area && (
            <span className="flex items-center gap-1.5">
              <Maximize className="w-4 h-4 text-slate-400" />
              {property.area}
            </span>
          )}
          {property.dealer && (
            <span className="ml-auto text-xs font-semibold text-slate-400 truncate max-w-[40%]">{property.dealer}</span>
          )}
        </div>
      </div>
    </Motion.article>
  );
};

export default PropertyCard;
