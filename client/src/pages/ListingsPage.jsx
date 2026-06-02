import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { staggerContainer } from '../animations/variants';
import Button from '../components/ui/Button';
import PropertyCard from '../components/PropertyCard';

const ListingsPage = ({
  onPropertySelect,
  properties = [],
  locationMeta,
  isLoading,
  locationError,
  onSearch,
  activeFilters = {},
  savedPropertyIds,
  onToggleSave,
  viewMode = 'list',
  onViewModeChange,
  sortBy = 'newest',
  onSortChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const headlineCity = locationMeta?.city || 'Your Area';
  const headlineLocality = locationMeta?.locality;
  const listingsCount = locationMeta?.total ?? properties.length;
  const notFound = Boolean(locationMeta?.notFound) && !isLoading;
  const isMapView = viewMode === 'map';
  const [minPrice, setMinPrice] = useState(activeFilters.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(activeFilters.maxPrice || '');
  const [minArea, setMinArea] = useState(activeFilters.minArea || '');
  const [maxArea, setMaxArea] = useState(activeFilters.maxArea || '');
  const [selectedBhk, setSelectedBhk] = useState(activeFilters.bhk || '');
  const [selectedType, setSelectedType] = useState(activeFilters.selectedType || '');
  const [selectedAmenities, setSelectedAmenities] = useState(activeFilters.amenities || []);
  const [furnishing, setFurnishing] = useState(activeFilters.furnishing || '');
  const [postedBy, setPostedBy] = useState(activeFilters.postedBy || '');
  const [verifiedOnly, setVerifiedOnly] = useState(Boolean(activeFilters.verifiedOnly));
  const isHydratingRef = useRef(false);
  const lastAutoFiltersRef = useRef('');

  const amenityOptions = ['Parking', 'Lift', 'Gym', 'Pool', 'Security', 'Power Backup'];
  const intentOptions = [
    { key: 'buy', label: 'Buy' },
    { key: 'rent', label: 'Rent' },
    { key: 'pg', label: 'PG' },
    { key: 'commercial', label: 'Commercial' },
  ];
  const propertyTypeOptions = [
    { label: 'Apartment', value: 'Apartment' },
    { label: 'Villa', value: 'Villa' },
    { label: 'Builder Floor', value: 'Builder Floor' },
    { label: 'Plots / Land', value: 'Plot / Land' },
  ];
  const bhkOptions = [
    { label: '1 RK', value: 1 },
    { label: '1 BHK', value: 1 },
    { label: '2 BHK', value: 2 },
    { label: '3 BHK', value: 3 },
    { label: '4+ BHK', value: 4 },
  ];

  const locationLabel = headlineLocality
    ? `${headlineLocality}${headlineCity ? `, ${headlineCity}` : ''}`
    : headlineCity;

  const activeIntent = activeFilters.propertyCategory === 'commercial'
    ? 'commercial'
    : activeFilters.lookingTo || null;

  const intentLabel = activeFilters.lookingTo
    ? activeFilters.lookingTo.toUpperCase()
    : activeFilters.propertyCategory === 'commercial'
      ? 'COMMERCIAL'
      : activeFilters.propertyCategory === 'project'
        ? 'PROJECTS'
        : '';

  const mapPoints = useMemo(() => {
    const points = properties
      .map((property) => {
        const coords = property?.raw?.geo?.coordinates;
        if (!coords || coords.length < 2) return null;
        const [lng, lat] = coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          id: property.id,
          title: property.title,
          price: property.price,
          lat,
          lng,
          property,
        };
      })
      .filter(Boolean);

    if (!points.length) return [];

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return points.map((point) => {
      const x = maxLng === minLng ? 50 : ((point.lng - minLng) / (maxLng - minLng)) * 100;
      const y = maxLat === minLat ? 50 : (1 - (point.lat - minLat) / (maxLat - minLat)) * 100;
      return { ...point, x, y };
    });
  }, [properties]);

  const pageNumbers = () => {
    const total = Math.max(totalPages || 1, 1);
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(total, start + 4);
    const pages = [];

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (start > 1) {
      pages.unshift(1);
      if (start > 2) {
        pages.splice(1, 0, 'ellipsis');
      }
    }

    if (end < total) {
      if (end < total - 1) {
        pages.push('ellipsis');
      }
      pages.push(total);
    }

    return pages;
  };

  const handleIntentChange = (intentKey) => {
    if (!onSearch) return;
    const nextFilters = { ...activeFilters };

    if (intentKey === 'commercial') {
      nextFilters.propertyCategory = 'commercial';
      delete nextFilters.lookingTo;
    } else {
      nextFilters.propertyCategory = 'residential';
      nextFilters.lookingTo = intentKey;
    }

    onSearch(nextFilters);
  };

  const stableStringify = (value) => {
    if (Array.isArray(value)) {
      return `[${value.slice().sort().map((item) => stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map((key) => `"${key}":${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
  };

  useEffect(() => {
    isHydratingRef.current = true;
    setMinPrice(activeFilters.minPrice || '');
    setMaxPrice(activeFilters.maxPrice || '');
    setMinArea(activeFilters.minArea || '');
    setMaxArea(activeFilters.maxArea || '');
    setSelectedBhk(activeFilters.bhk || '');
    setSelectedType(activeFilters.selectedType || '');
    setSelectedAmenities(activeFilters.amenities || []);
    setFurnishing(activeFilters.furnishing || '');
    setPostedBy(activeFilters.postedBy || '');
    setVerifiedOnly(Boolean(activeFilters.verifiedOnly));
    lastAutoFiltersRef.current = stableStringify(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    if (!onSearch) return;
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }

    const nextFilters = {
      ...activeFilters,
      minPrice: minPrice !== '' ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== '' ? Number(maxPrice) : undefined,
      minArea: minArea !== '' ? Number(minArea) : undefined,
      maxArea: maxArea !== '' ? Number(maxArea) : undefined,
      bhk: selectedBhk !== '' ? Number(selectedBhk) : undefined,
      selectedType: selectedType || undefined,
      amenities: selectedAmenities,
      furnishing: furnishing || undefined,
      postedBy: postedBy || undefined,
      verifiedOnly: verifiedOnly ? 'true' : undefined,
    };

    const signature = stableStringify(nextFilters);
    if (signature === lastAutoFiltersRef.current) {
      return undefined;
    }

    lastAutoFiltersRef.current = signature;
    const timer = setTimeout(() => {
      onSearch(nextFilters);
    }, 250);

    return () => clearTimeout(timer);
  }, [
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    selectedBhk,
    selectedType,
    selectedAmenities,
    furnishing,
    postedBy,
    verifiedOnly,
    activeFilters,
    onSearch,
  ]);

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) => (
      prev.includes(amenity)
        ? prev.filter((item) => item !== amenity)
        : [...prev, amenity]
    ));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pt-32 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* Editorial Sidebar Filters */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-32">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{headlineCity}</h1>
            <p className="text-slate-500 font-medium mb-6">
              {headlineLocality ? `${headlineLocality} • ` : ''}{listingsCount} Premium Properties
            </p>
            {locationError && (
              <p className="text-xs text-slate-400 font-semibold mb-6">{locationError}</p>
            )}

            {notFound && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 mb-6">
                <p className="font-semibold">
                  No listings found{locationLabel ? ` in ${locationLabel}` : ''}
                  {intentLabel ? ` for ${intentLabel}` : ''}.
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  Try a nearby location or clear filters to see more properties.
                </p>
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => onSearch?.({})}
                >
                  Clear filters
                </Button>
              </div>
            )}

            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-4 overscroll-contain">
              <div className="space-y-8 pr-2">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Budget Range
                </h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    placeholder="Min"
                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    placeholder="Max"
                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-3">Prices are in INR</p>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Area Range</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    value={minArea}
                    onChange={(event) => setMinArea(event.target.value)}
                    placeholder="Min sq ft"
                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    value={maxArea}
                    onChange={(event) => setMaxArea(event.target.value)}
                    placeholder="Max sq ft"
                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Bedrooms</h3>
                <div className="flex flex-wrap gap-2">
                  {bhkOptions.map((bhk) => (
                    <button
                      key={bhk.label}
                      onClick={() => setSelectedBhk(selectedBhk === bhk.value ? '' : bhk.value)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                        selectedBhk === bhk.value
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700'
                      }`}
                    >
                      {bhk.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Property Type</h3>
                <div className="space-y-3">
                  {propertyTypeOptions.map((type) => (
                    <label key={type.value} className="flex items-center gap-3 text-slate-700 font-medium cursor-pointer group">
                      <input
                        type="radio"
                        name="propertyType"
                        value={type.value}
                        checked={selectedType === type.value}
                        onChange={() => setSelectedType(type.value)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      {type.label}
                    </label>
                  ))}
                  <button
                    onClick={() => setSelectedType('')}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-900"
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Furnishing</h3>
                <div className="space-y-3">
                  {['unfurnished', 'semi-furnished', 'fully-furnished'].map((type) => (
                    <label key={type} className="flex items-center gap-3 text-slate-700 font-medium cursor-pointer group capitalize">
                      <input
                        type="radio"
                        name="furnishingType"
                        value={type}
                        checked={furnishing === type}
                        onChange={() => setFurnishing(type)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      {type.replace('-', ' ')}
                    </label>
                  ))}
                  <button
                    onClick={() => setFurnishing('')}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-900"
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Posted By</h3>
                <div className="space-y-3">
                  {['owner', 'broker', 'builder'].map((type) => (
                    <label key={type} className="flex items-center gap-3 text-slate-700 font-medium cursor-pointer group capitalize">
                      <input
                        type="radio"
                        name="postedBy"
                        value={type}
                        checked={postedBy === type}
                        onChange={() => setPostedBy(type)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      {type}
                    </label>
                  ))}
                  <button
                    onClick={() => setPostedBy('')}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-900"
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-4">Amenities</h3>
                <div className="space-y-3">
                  {amenityOptions.map((amenity) => (
                    <label key={amenity} className="flex items-center gap-3 text-slate-700 font-medium cursor-pointer group">
                      <input
                        type="checkbox"
                        value={amenity}
                        checked={selectedAmenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      {amenity}
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <label className="flex items-center gap-3 text-slate-700 font-medium cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(event) => setVerifiedOnly(event.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  Verified Listings Only
                </label>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Main Listing Grid */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mr-2">
              Looking to
            </span>
            {intentOptions.map((intent) => (
              <button
                key={intent.key}
                type="button"
                onClick={() => handleIntentChange(intent.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeIntent === intent.key
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {intent.label}
              </button>
            ))}
          </div>
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onViewModeChange?.('map')}
                className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                  isMapView
                    ? 'bg-slate-900 text-white'
                    : 'bg-white/80 backdrop-blur-md text-slate-900 border border-slate-200'
                }`}
              >
                Map View
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange?.('list')}
                className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                  !isMapView
                    ? 'bg-slate-900 text-white'
                    : 'bg-white/80 backdrop-blur-md text-slate-900 border border-slate-200'
                }`}
              >
                List View
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500 hidden sm:block">Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => onSortChange?.(event.target.value)}
                className="bg-slate-50 border-none rounded-full px-5 py-2.5 text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {isMapView && (
            <div className="mb-8 rounded-3xl border border-slate-100 bg-white overflow-hidden">
              <div className="relative h-64 sm:h-72 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_55%)]" />
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,_rgba(255,255,255,0.15)_1px,_transparent_1px),_linear-gradient(180deg,_rgba(255,255,255,0.15)_1px,_transparent_1px)] bg-[size:40px_40px]" />
                {mapPoints.length ? (
                  mapPoints.slice(0, 24).map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => onPropertySelect?.(point.property)}
                      className="absolute group -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    >
                      <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.15)] block" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {point.price || 'View'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/70">
                    Map view needs listings with coordinates.
                  </div>
                )}
                <div className="absolute bottom-4 left-4 text-xs font-semibold text-white/80">
                  {locationLabel || 'Your area'}
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm font-semibold text-slate-800">{listingsCount} listings mapped</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tap a pin to jump to a property card.
                </p>
              </div>
            </div>
          )}

          <motion.div 
            variants={staggerContainer} initial="hidden" animate="show"
            className={`grid gap-8 ${
              isMapView
                ? 'grid-cols-1'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2'
            }`}
          >
            {notFound ? (
              <div className="text-slate-500 font-semibold">
                No listings match your search. Try another locality or clear filters.
              </div>
            ) : isLoading && !properties.length ? (
              <div className="text-slate-400 font-semibold">Loading listings near you...</div>
            ) : properties.length ? (
              properties.map(prop => (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  onClick={onPropertySelect}
                  isSaved={savedPropertyIds?.has(String(prop.id))}
                  onToggleSave={onToggleSave}
                />
              ))
            ) : (
              <div className="text-slate-500 font-semibold">
                No listings found with the current filters.
              </div>
            )}
          </motion.div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-16">
              <button
                type="button"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 transition-colors ${
                  currentPage <= 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'hover:bg-slate-50 text-slate-500'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {pageNumbers().map((page, index) => (
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="text-slate-400 font-bold px-2">...</span>
                ) : (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => onPageChange?.(page)}
                    className={`w-12 h-12 flex items-center justify-center rounded-full font-bold transition-colors ${
                      page === currentPage
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
              <button
                type="button"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 transition-colors ${
                  currentPage >= totalPages
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'hover:bg-slate-50 text-slate-500'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ListingsPage;
