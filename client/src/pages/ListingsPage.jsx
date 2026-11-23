import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, LayoutGrid, Map as MapIcon, SearchX, Info } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';

const INTENTS = [
  { key: '', label: 'All' },
  { key: 'buy', label: 'Buy' },
  { key: 'rent', label: 'Rent' },
  { key: 'pg', label: 'PG' },
  { key: 'commercial', label: 'Commercial' },
];

const BUDGET_PRESETS = {
  buy: [
    { label: 'Under ₹50 L', max: 5000000 },
    { label: '₹50 L – 1 Cr', min: 5000000, max: 10000000 },
    { label: '₹1 – 2 Cr', min: 10000000, max: 20000000 },
    { label: '₹2 – 5 Cr', min: 20000000, max: 50000000 },
    { label: '₹5 Cr+', min: 50000000 },
  ],
  rent: [
    { label: 'Under ₹15K', max: 15000 },
    { label: '₹15K – 30K', min: 15000, max: 30000 },
    { label: '₹30K – 50K', min: 30000, max: 50000 },
    { label: '₹50K – 1 L', min: 50000, max: 100000 },
    { label: '₹1 L+', min: 100000 },
  ],
};

const BHK_OPTIONS = [
  { label: '1 RK / 1 BHK', value: 1 },
  { label: '2 BHK', value: 2 },
  { label: '3 BHK', value: 3 },
  { label: '4+ BHK', value: 4 },
];

const TYPE_OPTIONS = [
  { label: 'Apartment', value: 'Apartment' },
  { label: 'Builder Floor', value: 'Builder Floor' },
  { label: 'Villa / House', value: 'Villa' },
  { label: 'Plot / Land', value: 'Plot / Land' },
];

const FURNISHING_OPTIONS = [
  { label: 'Unfurnished', value: 'unfurnished' },
  { label: 'Semi-furnished', value: 'semi-furnished' },
  { label: 'Fully furnished', value: 'fully-furnished' },
];

const POSTED_BY_OPTIONS = [
  { label: 'Owner', value: 'owner' },
  { label: 'Agent', value: 'broker' },
  { label: 'Builder', value: 'builder' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low–High' },
  { value: 'price_desc', label: 'Price: High–Low' },
];

const toNum = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatRupees = (value) => {
  const n = toNum(value);
  if (n === undefined) return '';
  if (n >= 10000000) return `₹${+(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${+(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${+(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const formatRange = (min, max, format) => {
  const a = format(min);
  const b = format(max);
  if (a && b) return `${a} – ${b}`;
  if (a) return `${a}+`;
  if (b) return `Under ${b}`;
  return '';
};

const formatSqFt = (value) => (toNum(value) === undefined ? '' : `${toNum(value).toLocaleString('en-IN')} sq.ft`);

const labelOf = (options, value) => options.find((option) => String(option.value) === String(value))?.label || value;

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors duration-150 ${
      active
        ? 'bg-slate-900 border-slate-900 text-white'
        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
    }`}
  >
    {children}
  </button>
);

const FilterSection = ({ title, children }) => (
  <section className="py-5 border-b border-slate-100 last:border-b-0">
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</h3>
    {children}
  </section>
);

// Min/max inputs: typing stays instant locally and the search runs once the user pauses
const RangeInputs = ({ min, max, onCommit, placeholders, format }) => {
  const [draft, setDraft] = useState({ min: min ?? '', max: max ?? '' });
  const [synced, setSynced] = useState({ min, max });

  // Filters changed from outside (a preset, "Clear all"): show the new values
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max });
    setDraft({ min: min ?? '', max: max ?? '' });
  }

  const commit = useEffectEvent((nextMin, nextMax) => onCommit(nextMin, nextMax));

  useEffect(() => {
    const nextMin = toNum(draft.min);
    const nextMax = toNum(draft.max);
    if (nextMin === toNum(min) && nextMax === toNum(max)) return undefined;
    const timer = setTimeout(() => commit(nextMin, nextMax), 500);
    return () => clearTimeout(timer);
  }, [draft, min, max]);

  const field = (key, placeholder) => (
    <input
      type="text"
      inputMode="numeric"
      value={draft[key]}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
        setDraft((prev) => ({ ...prev, [key]: digits }));
      }}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-900 focus:bg-white transition-colors"
    />
  );

  const preview = formatRange(draft.min, draft.max, format);

  return (
    <div>
      <div className="flex items-center gap-2">
        {field('min', placeholders[0])}
        <span className="text-slate-300">–</span>
        {field('max', placeholders[1])}
      </div>
      {preview && <p className="text-xs text-slate-500 font-medium mt-2">{preview}</p>}
    </div>
  );
};

const FilterPanel = ({ filters, intent, update }) => {
  const budgetKind = intent === 'rent' || intent === 'pg' ? 'rent' : 'buy';
  const presets = intent ? BUDGET_PRESETS[budgetKind] : null;
  const minPrice = toNum(filters.minPrice);
  const maxPrice = toNum(filters.maxPrice);

  return (
    <div>
      <FilterSection title={budgetKind === 'rent' ? 'Monthly rent' : 'Budget'}>
        {presets && (
          <div className="flex flex-wrap gap-2 mb-3">
            {presets.map((preset) => {
              const active = minPrice === preset.min && maxPrice === preset.max;
              return (
                <Chip
                  key={preset.label}
                  active={active}
                  onClick={() => update(active
                    ? { minPrice: undefined, maxPrice: undefined }
                    : { minPrice: preset.min, maxPrice: preset.max })}
                >
                  {preset.label}
                </Chip>
              );
            })}
          </div>
        )}
        <RangeInputs
          min={minPrice}
          max={maxPrice}
          placeholders={['Min ₹', 'Max ₹']}
          format={formatRupees}
          onCommit={(min, max) => update({ minPrice: min, maxPrice: max })}
        />
      </FilterSection>

      <FilterSection title="Bedrooms">
        <div className="flex flex-wrap gap-2">
          {BHK_OPTIONS.map((option) => {
            const active = toNum(filters.bhk) === option.value;
            return (
              <Chip key={option.value} active={active} onClick={() => update({ bhk: active ? undefined : option.value })}>
                {option.label}
              </Chip>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Property type">
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((option) => {
            const active = filters.selectedType === option.value;
            return (
              <Chip key={option.value} active={active} onClick={() => update({ selectedType: active ? undefined : option.value })}>
                {option.label}
              </Chip>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Furnishing">
        <div className="flex flex-wrap gap-2">
          {FURNISHING_OPTIONS.map((option) => {
            const active = filters.furnishing === option.value;
            return (
              <Chip key={option.value} active={active} onClick={() => update({ furnishing: active ? undefined : option.value })}>
                {option.label}
              </Chip>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Posted by">
        <div className="flex flex-wrap gap-2">
          {POSTED_BY_OPTIONS.map((option) => {
            const active = filters.postedBy === option.value;
            return (
              <Chip key={option.value} active={active} onClick={() => update({ postedBy: active ? undefined : option.value })}>
                {option.label}
              </Chip>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Area">
        <RangeInputs
          min={toNum(filters.minArea)}
          max={toNum(filters.maxArea)}
          placeholders={['Min sq.ft', 'Max sq.ft']}
          format={formatSqFt}
          onCommit={(min, max) => update({ minArea: min, maxArea: max })}
        />
      </FilterSection>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="rounded-3xl p-2.5 border border-slate-100 animate-pulse" aria-hidden="true">
    <div className="h-56 rounded-[1.25rem] bg-slate-100 mb-4" />
    <div className="px-2.5 pb-2 space-y-3">
      <div className="h-5 w-3/4 rounded-full bg-slate-100" />
      <div className="h-4 w-1/2 rounded-full bg-slate-100" />
      <div className="h-4 w-2/3 rounded-full bg-slate-100 mt-5" />
    </div>
  </div>
);

const ListingsPage = ({
  onPropertySelect,
  properties = [],
  locationMeta,
  isLoading,
  locationError,
  onFiltersChange,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filters = activeFilters;
  const isMapView = viewMode === 'map';
  const total = locationMeta?.total ?? properties.length;
  const intent = filters.propertyCategory === 'commercial' ? 'commercial' : filters.lookingTo || '';
  const isRefreshing = isLoading && properties.length > 0;
  const isFirstLoad = isLoading && properties.length === 0;

  // Merge a patch into the filters; undefined/empty values remove the filter
  const update = (patch) => {
    const next = { ...filters, ...patch };
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) delete next[key];
    });
    onFiltersChange?.(next);
  };

  const setIntent = (key) => {
    if (key === intent) return;
    const wasRent = intent === 'rent' || intent === 'pg';
    const isRent = key === 'rent' || key === 'pg';
    // Sale budgets and monthly rents are different scales, so a budget doesn't survive the switch
    const resetBudget = wasRent !== isRent || !key || key === 'commercial'
      ? { minPrice: undefined, maxPrice: undefined }
      : {};
    if (!key) {
      update({ lookingTo: undefined, propertyCategory: undefined, ...resetBudget });
    } else if (key === 'commercial') {
      update({ lookingTo: undefined, propertyCategory: 'commercial', ...resetBudget });
    } else {
      update({ lookingTo: key, propertyCategory: 'residential', ...resetBudget });
    }
  };

  const activeChips = useMemo(() => {
    const chips = [];
    const add = (key, label, patch) => chips.push({ key, label, patch });
    const intentKind = intent === 'rent' || intent === 'pg' ? 'rent' : 'buy';

    if (filters.locality) add('locality', filters.locality, { locality: undefined });
    if (filters.city && !filters.locality) add('city', filters.city, { city: undefined });
    if (filters.minPrice || filters.maxPrice) {
      const preset = BUDGET_PRESETS[intentKind].find(
        (p) => p.min === toNum(filters.minPrice) && p.max === toNum(filters.maxPrice),
      );
      add('price', preset?.label || formatRange(filters.minPrice, filters.maxPrice, formatRupees), { minPrice: undefined, maxPrice: undefined });
    }
    if (filters.bhk) add('bhk', labelOf(BHK_OPTIONS, filters.bhk), { bhk: undefined });
    if (filters.selectedType) add('type', labelOf(TYPE_OPTIONS, filters.selectedType), { selectedType: undefined });
    if (filters.furnishing) add('furnishing', labelOf(FURNISHING_OPTIONS, filters.furnishing), { furnishing: undefined });
    if (filters.postedBy) add('postedBy', `By ${labelOf(POSTED_BY_OPTIONS, filters.postedBy).toLowerCase()}`, { postedBy: undefined });
    if (filters.minArea || filters.maxArea) add('area', formatRange(filters.minArea, filters.maxArea, formatSqFt), { minArea: undefined, maxArea: undefined });
    if (Array.isArray(filters.amenities) && filters.amenities.length) add('amenities', filters.amenities.join(', '), { amenities: undefined });
    if (filters.verifiedOnly) add('verified', 'Verified only', { verifiedOnly: undefined });
    return chips;
  }, [filters, intent]);

  const clearAll = () => {
    const keep = {};
    if (filters.lookingTo) keep.lookingTo = filters.lookingTo;
    if (filters.propertyCategory) keep.propertyCategory = filters.propertyCategory;
    onFiltersChange?.(keep);
  };

  // Drawer: lock page scroll and close on Escape
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const fallbackFrom = locationMeta?.fallbackFrom;
  const placeLabel = filters.locality
    ? `${filters.locality}${locationMeta?.city ? `, ${locationMeta.city}` : ''}`
    : locationMeta?.city;
  const intentLabel = {
    buy: 'for sale',
    rent: 'for rent',
    pg: 'PG / co-living',
    commercial: 'commercial',
  }[intent];
  const headline = fallbackFrom || !placeLabel ? 'All properties' : `Properties in ${placeLabel}`;

  const mapPoints = useMemo(() => {
    const points = properties
      .map((property) => {
        const coords = property?.raw?.geo?.coordinates;
        if (!coords || coords.length < 2) return null;
        const [lng, lat] = coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { id: property.id, price: property.price, lat, lng, property };
      })
      .filter(Boolean);
    if (!points.length) return [];
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    return points.map((p) => ({
      ...p,
      x: maxLng === minLng ? 50 : 6 + ((p.lng - minLng) / (maxLng - minLng)) * 88,
      y: maxLat === minLat ? 50 : 8 + (1 - (p.lat - minLat) / (maxLat - minLat)) * 84,
    }));
  }, [properties]);

  const pageNumbers = useMemo(() => {
    const last = Math.max(totalPages || 1, 1);
    const start = Math.max(1, Math.min(currentPage - 2, last - 4));
    const end = Math.min(last, start + 4);
    const pages = [];
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (start > 1) pages.unshift(1, ...(start > 2 ? ['gap-start'] : []));
    if (end < last) pages.push(...(end < last - 1 ? ['gap-end'] : []), last);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pt-28 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 overflow-x-clip"
    >
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">{headline}</h1>
        <p className="text-slate-500 font-medium mt-1" aria-live="polite">
          {isFirstLoad
            ? 'Finding properties…'
            : `${total.toLocaleString('en-IN')} ${total === 1 ? 'property' : 'properties'}${intentLabel ? ` ${intentLabel}` : ''}`}
        </p>
        {fallbackFrom && !isFirstLoad && (
          <p className="mt-3 flex w-fit max-w-full items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            No listings in {fallbackFrom} yet, so we're showing properties from all cities.
          </p>
        )}
        {locationError && !fallbackFrom && (
          <p className="text-xs text-slate-400 font-semibold mt-2">{locationError}</p>
        )}

        {/* Intent */}
        <div role="tablist" aria-label="Looking to" className="mt-5 inline-flex flex-wrap gap-1 p-1 bg-slate-100 rounded-2xl">
          {INTENTS.map((option) => (
            <button
              key={option.key || 'all'}
              type="button"
              role="tab"
              aria-selected={intent === option.key}
              onClick={() => setIntent(option.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors duration-150 ${
                intent === option.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex gap-10">
        {/* Desktop filters */}
        <aside className="hidden lg:block w-72 shrink-0" aria-label="Filters">
          <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain pr-3 -mr-3">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </h2>
              {activeChips.length > 0 && (
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-emerald-600 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel filters={filters} intent={intent} update={update} />
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="sticky top-[5.25rem] z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 bg-white/95 border-b border-slate-100 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-sm font-bold text-slate-800 hover:border-slate-400"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeChips.length > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] flex items-center justify-center">
                    {activeChips.length}
                  </span>
                )}
              </button>

              <div className="ml-auto flex items-center gap-2 min-w-0">
                <div className="hidden sm:inline-flex p-1 bg-slate-100 rounded-full" role="group" aria-label="View">
                  {[
                    { mode: 'list', label: 'List', icon: <LayoutGrid className="w-4 h-4" /> },
                    { mode: 'map', label: 'Map', icon: <MapIcon className="w-4 h-4" /> },
                  ].map(({ mode, label, icon }) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={viewMode === mode}
                      onClick={() => onViewModeChange?.(mode)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-150 ${
                        viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {icon}
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="listings-sort">Sort by</label>
                <select
                  id="listings-sort"
                  value={sortBy}
                  onChange={(e) => onSortChange?.(e.target.value)}
                  className="bg-slate-100 rounded-full pl-4 pr-8 py-2 text-sm font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => update(chip.patch)}
                    aria-label={`Remove filter ${chip.label}`}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors duration-150"
                  >
                    {chip.label}
                    <X className="w-3.5 h-3.5" />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="text-xs font-bold text-slate-500 hover:text-slate-900 px-1">
                  Clear all
                </button>
              </div>
            )}

            {/* Refresh indicator: results stay on screen while the next set loads */}
            <div className={`absolute left-0 right-0 bottom-0 h-0.5 overflow-hidden transition-opacity duration-200 ${isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
              <div className="h-full w-1/3 bg-emerald-500 animate-[listings-progress_1s_ease-in-out_infinite]" />
            </div>
          </div>

          {isMapView && properties.length > 0 && (
            <div className="mb-8 rounded-3xl border border-slate-100 overflow-hidden">
              <div className="relative h-72 bg-slate-900">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,_rgba(255,255,255,0.4)_1px,_transparent_1px),_linear-gradient(180deg,_rgba(255,255,255,0.4)_1px,_transparent_1px)] bg-[size:40px_40px]" />
                {mapPoints.length ? (
                  mapPoints.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => onPropertySelect?.(point.property)}
                      className="absolute group -translate-x-1/2 -translate-y-1/2 p-1.5"
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      aria-label={`Open property at ${point.price}`}
                    >
                      <span className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 block" />
                      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150">
                        {point.price}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/70">
                    These listings don't have map locations yet.
                  </div>
                )}
              </div>
              <p className="px-5 py-3 text-xs text-slate-500">
                {mapPoints.length} of {properties.length} listings on this page have a location. Tap a pin to open it.
              </p>
            </div>
          )}

          {isFirstLoad ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : properties.length ? (
            <div
              className={`grid gap-6 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 transition-opacity duration-200 ${
                isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'
              }`}
              aria-busy={isRefreshing}
            >
              {properties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  index={index}
                  property={property}
                  onClick={onPropertySelect}
                  isSaved={savedPropertyIds?.has(String(property.id))}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-20 px-6 rounded-3xl border border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <SearchX className="w-6 h-6 text-slate-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">No properties match these filters</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Try removing a filter or widening your budget.
              </p>
              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-5 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && properties.length > 0 && (
            <nav className="flex justify-center items-center gap-1.5 mt-14" aria-label="Pagination">
              <button
                type="button"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {pageNumbers.map((page) => (
                typeof page === 'string' ? (
                  <span key={page} className="w-8 text-center text-slate-400 font-bold">…</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => onPageChange?.(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-colors duration-150 ${
                      page === currentPage ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
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
                aria-label="Next page"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <Motion.div
              className="absolute inset-0 bg-slate-900/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
            />
            <Motion.div
              className="absolute inset-x-0 bottom-0 max-h-[88dvh] flex flex-col bg-white rounded-t-3xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
                <h2 className="font-black text-lg text-slate-900">Filters</h2>
                <div className="flex items-center gap-3">
                  {activeChips.length > 0 && (
                    <button type="button" onClick={clearAll} className="text-sm font-semibold text-emerald-600">
                      Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close filters"
                    className="p-2 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5">
                <FilterPanel filters={filters} intent={intent} update={update} />
              </div>
              <div className="shrink-0 p-4 border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full py-3.5 rounded-full bg-slate-900 text-white font-bold"
                >
                  {isLoading ? 'Updating…' : `Show ${total.toLocaleString('en-IN')} ${total === 1 ? 'property' : 'properties'}`}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

export default ListingsPage;
