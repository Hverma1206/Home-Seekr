import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Home, Plus, Minus, Layers, MapPin, Building2, ExternalLink, ChevronUp, ChevronDown, Loader2, LocateFixed,
  SlidersHorizontal, Navigation, Box, Check, BedDouble, Maximize,
} from 'lucide-react';
import { societyService } from '../services/societyService';
import {
  createMap, addSocietyLayers, addBaseLayers, setBaseMode, setStates, setFlag, showYou,
  placeSocieties, buildSocietyGeoJSON, SOCIETY_LAYERS, BASE_MODES, BASE_MODE_LABELS,
} from '../components/map3d/societyMap';
import {
  MODES, BUDGETS, TYPES, SORTS, EMPTY_FILTERS, isRental, typeOf, bhkBase, bhkOrder, money, rangeText,
  filterSocieties, priceLabel, sortResults, activeFilterCount,
} from '../components/map3d/societyFilters';

const CITY = 'Gurugram';
const PITCH_3D = 55;
const FALLBACK_CAMERA = { center: [77.04, 28.44], zoom: 11.6, pitch: PITCH_3D, bearing: 0 };
const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
const STYLE_KEY = 'estatehub.map3d.style';
const KIND_LABEL = { society: 'Society', area: 'Independent homes', project: 'New project' };
const STATUS_LABEL = { pre_launch: 'Pre-launch', ongoing: 'Under construction', completed: 'Ready to move', delayed: 'Delayed' };

const isMobile = () => window.matchMedia?.('(max-width: 767px)').matches;
const canUseWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};
const savedStyle = () => {
  try {
    const value = localStorage.getItem(STYLE_KEY);
    return BASE_MODES.includes(value) ? value : 'light';
  } catch {
    return 'light';
  }
};

// Leaves room for the panels: the filter sidebar on the left, the society card on the right, or the bottom sheet on phones
const viewPadding = (cardOpen) => (isMobile()
  ? { top: 70, bottom: Math.round(window.innerHeight * (cardOpen ? 0.6 : 0.42)), left: 30, right: 70 }
  : { top: 70, bottom: 70, left: 430, right: cardOpen ? 460 : 90 });

// Middle 90% of values: a couple of far-out societies (Sohna) should not shrink the whole city to dots
const trimmedRange = (values, trim) => {
  const sorted = [...values].sort((a, b) => a - b);
  const cut = trim ? Math.floor(sorted.length * 0.05) : 0;
  return [sorted[cut], sorted[sorted.length - 1 - cut]];
};

const cameraFor = (map, societies, { trim = false, maxZoom = 13.2 } = {}) => {
  if (!societies.length) return FALLBACK_CAMERA;
  const [minLng, maxLng] = trimmedRange(societies.map((s) => s.lng), trim);
  const [minLat, maxLat] = trimmedRange(societies.map((s) => s.lat), trim);
  try {
    const cam = map.cameraForBounds([[minLng, minLat], [maxLng, maxLat]], { padding: viewPadding(false), maxZoom });
    return cam ? { center: cam.center, zoom: cam.zoom, pitch: PITCH_3D, bearing: 0 } : FALLBACK_CAMERA;
  } catch {
    return FALLBACK_CAMERA;
  }
};

// ---------- small pieces in RealtyHub's style ----------
const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors duration-150 ${
      active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
    }`}
  >
    {children}
  </button>
);

const FilterSection = ({ title, children }) => (
  <section className="py-4 border-b border-slate-100 last:border-b-0">
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </section>
);

const ControlButton = ({ label, onClick, children, disabled, active }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={`w-11 h-11 flex items-center justify-center rounded-full border shadow-lg shadow-slate-900/10 text-sm font-black transition-colors duration-150 disabled:opacity-40 ${
      active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50'
    }`}
  >
    {children}
  </button>
);

const Stat = ({ label, value, note }) => (
  <div className="rounded-2xl bg-slate-50 p-3">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-slate-900">{value || '—'}</p>
    {note && <p className="text-xs font-medium text-slate-500 mt-0.5">{note}</p>}
  </div>
);

const Thumb = ({ src, className }) => {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover bg-slate-100 ${className}`} />
  ) : (
    <div className={`bg-slate-100 flex items-center justify-center text-slate-400 ${className}`}><Building2 className="w-5 h-5" /></div>
  );
};

export default function Societies3DPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overviewRef = useRef(FALLBACK_CAMERA);
  const prevSelectedRef = useRef(null);
  const prevHoverRef = useRef(null);
  const searchRef = useRef(null);
  const youRef = useRef(null);
  const listRef = useRef(null);
  const baseModeRef = useRef(savedStyle());
  const filtersSeenRef = useRef(null);

  const [webglOk] = useState(canUseWebGL);
  const [societies, setSocieties] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('relevant');
  const [showFilters, setShowFilters] = useState(() => !isMobile());
  const [selectedId, setSelectedId] = useState(null);
  const [hover, setHover] = useState(null); // { sid, x, y, from: 'map' | 'list' }
  const [baseMode, setBaseModeState] = useState(savedStyle);
  const [styleMenu, setStyleMenu] = useState(false);
  const [is3d, setIs3d] = useState(true);
  const [bearing, setBearing] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState('');

  // Layers are added by the effect below in the same commit, before the effects that colour them run
  const layersReady = mapReady && loadState === 'ready';
  const byId = useMemo(() => new Map(societies.map((s) => [s.id, s])), [societies]);
  const selected = selectedId ? byId.get(selectedId) || null : null;
  const hovered = hover?.from === 'map' ? byId.get(hover.sid) : null;
  const results = useMemo(() => filterSocieties(societies, filters), [societies, filters]);
  const sorted = useMemo(() => sortResults(results, sort), [results, sort]);
  const matchById = useMemo(() => new Map(results.map((r) => [r.society.id, r])), [results]);
  const bhkOptions = useMemo(
    () => [...new Set(societies.flatMap((s) => [...s.listings.map((l) => bhkBase(l.bhk)), ...(s.project?.configurations || []).map((c) => bhkBase(c.type))]).filter(Boolean))]
      .sort((a, b) => bhkOrder(a) - bhkOrder(b)),
    [societies],
  );
  const totals = useMemo(() => societies.reduce((t, s) => ({
    buy: t.buy + s.buy.count, rent: t.rent + s.rent.count, projects: t.projects + (s.project ? 1 : 0),
  }), { buy: 0, rent: 0, projects: 0 }), [societies]);
  const filterCount = activeFilterCount(filters);
  const budgets = BUDGETS[filters.mode] || [];

  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const toggleIn = (key, value) => setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const setMode = (mode) => setFilters((f) => ({ ...f, mode, budget: '' })); // budget bands differ for buy and rent
  const clearAll = () => setFilters((f) => ({ ...EMPTY_FILTERS, mode: f.mode }));

  // Societies from our database
  useEffect(() => {
    let active = true;
    societyService.getSocieties(CITY)
      .then((list) => {
        if (!active) return;
        setSocieties(placeSocieties(list).map((s) => ({ ...s, priceLabel: priceLabel(s) })));
        setLoadState('ready');
      })
      .catch((error) => {
        console.error('Error loading societies:', error);
        if (active) setLoadState('error');
      });
    return () => { active = false; };
  }, [reloadKey]);

  // The map itself: created once, removed when the page closes
  useEffect(() => {
    if (!webglOk || !containerRef.current) return undefined;
    const map = createMap(containerRef.current);
    mapRef.current = map;
    if (import.meta.env.DEV) window.__map3d = map; // for poking at the map from the console while developing
    map.once('style.load', () => setMapReady(true));
    map.on('rotate', () => setBearing(Math.round(map.getBearing())));
    map.on('pitchend', () => setIs3d(map.getPitch() > 5));
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [webglOk]);

  // Draw the societies once both the map and the data are in, then fly in from the globe
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || loadState !== 'ready' || !map) return undefined;

    const { shapes, points } = buildSocietyGeoJSON(societies);
    const fresh = !map.getSource('shapes');
    if (fresh) {
      addSocietyLayers(map, shapes, points);
      addBaseLayers(map);
      setBaseMode(map, baseModeRef.current);
    } else {
      map.getSource('shapes').setData(shapes);
      map.getSource('pts').setData(points);
    }

    const societyAt = (point) => map.queryRenderedFeatures(point, { layers: SOCIETY_LAYERS })[0]?.properties?.sid || null;
    const onClick = (e) => {
      setStyleMenu(false);
      setSelectedId(societyAt(e.point));
    };
    const onMove = (e) => {
      const sid = societyAt(e.point);
      map.getCanvas().style.cursor = sid ? 'pointer' : '';
      setHover(sid ? { sid, x: e.point.x, y: e.point.y, from: 'map' } : null);
    };
    const onLeave = () => setHover(null);
    map.on('click', onClick);
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    map.on('dragstart', onLeave);

    if (fresh) {
      overviewRef.current = cameraFor(map, societies, { trim: true });
      // flyTo without `essential` jumps straight there for visitors who ask for reduced motion
      setTimeout(() => mapRef.current?.flyTo({ ...overviewRef.current, padding: NO_PADDING, duration: 3800, curve: 1.6 }), 250);
    }

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
      map.off('dragstart', onLeave);
    };
  }, [mapReady, loadState, societies]);

  // Light up what the filters match, dim the rest
  useEffect(() => {
    const map = mapRef.current;
    if (!layersReady || !map) return;
    setStates(map, societies.map((s) => [s.id, matchById.has(s.id) ? 'match' : 'no']));
  }, [layersReady, matchById, societies]);

  // The camera follows the filters (not the search box, which would jump around while typing)
  useEffect(() => {
    const map = mapRef.current;
    const key = JSON.stringify([filters.mode, filters.bhks, filters.types, filters.budget]);
    if (!layersReady || !map) return;
    if (filtersSeenRef.current === null) { filtersSeenRef.current = key; return; }
    if (filtersSeenRef.current === key) return;
    filtersSeenRef.current = key;
    const list = results.map((r) => r.society);
    if (!list.length || selectedId) return;
    const cam = list.length === societies.length ? overviewRef.current : cameraFor(map, list, { trim: list.length > 20, maxZoom: 14.5 });
    map.flyTo({ ...cam, pitch: map.getPitch() > 5 ? PITCH_3D : 0, bearing: map.getBearing(), padding: NO_PADDING, duration: 1400 });
  }, [layersReady, filters, results, societies.length, selectedId]);

  // Hover from either side lights the society on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!layersReady || !map) return;
    const sid = hover?.sid || null;
    if (sid === prevHoverRef.current) return;
    setFlag(map, 'hover', sid, prevHoverRef.current);
    prevHoverRef.current = sid;
  }, [layersReady, hover]);

  // Selected society: paint it dark and glide to it at a slight angle
  useEffect(() => {
    const map = mapRef.current;
    if (!layersReady || !map) return;
    setFlag(map, 'sel', selected?.id || null, prevSelectedRef.current);
    prevSelectedRef.current = selected?.id || null;
    if (!selected) return;
    map.flyTo({
      center: [selected.lng, selected.lat],
      zoom: isMobile() ? 15 : 15.8,
      pitch: map.getPitch() > 5 ? 60 : 0,
      bearing: -18,
      padding: viewPadding(true),
      duration: 2000,
    });
    listRef.current?.querySelector(`[data-sid="${CSS.escape(selected.id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [layersReady, selected]);

  // If the visitor already allowed location (the home page asks), show the blue dot without moving the camera
  useEffect(() => {
    if (!mapReady || !navigator.geolocation || !navigator.permissions?.query) return undefined;
    let active = true;
    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      if (!active || status.state !== 'granted') return;
      navigator.geolocation.getCurrentPosition((p) => {
        if (active && mapRef.current) youRef.current = showYou(mapRef.current, [p.coords.longitude, p.coords.latitude], youRef.current);
      }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    }).catch(() => {});
    return () => { active = false; };
  }, [mapReady]);

  // Short messages (e.g. location denied) fade on their own
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // "/" jumps to search, Escape closes the card or menu
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setSheetOpen(true);
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setStyleMenu(false);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goHome = () => {
    setSelectedId(null);
    mapRef.current?.flyTo({ ...overviewRef.current, pitch: is3d ? PITCH_3D : 0, padding: NO_PADDING, duration: 1800 });
  };
  const toggleTilt = () => {
    mapRef.current?.easeTo({ pitch: is3d ? 0 : PITCH_3D, duration: 800 });
    setIs3d(!is3d);
  };
  const pickStyle = (mode) => {
    if (mapRef.current && layersReady) setBaseMode(mapRef.current, mode);
    baseModeRef.current = mode;
    setBaseModeState(mode);
    setStyleMenu(false);
    try { localStorage.setItem(STYLE_KEY, mode); } catch { /* private mode: the choice just isn't remembered */ }
  };
  const locateMe = () => {
    if (!navigator.geolocation) {
      setNotice('Your browser cannot share your location.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((p) => {
      setLocating(false);
      const map = mapRef.current;
      if (!map) return;
      const at = [p.coords.longitude, p.coords.latitude];
      youRef.current = showYou(map, at, youRef.current);
      setSelectedId(null);
      map.flyTo({ center: at, zoom: 15, pitch: is3d ? PITCH_3D : 0, bearing: 0, padding: NO_PADDING, duration: 2000 });
    }, (error) => {
      setLocating(false);
      setNotice(error.code === 1 ? 'Location permission is off. Allow it in your browser to see where you are.' : 'Could not get your location.');
    }, { enableHighAccuracy: true, timeout: 10000 });
  };
  const retry = () => {
    setLoadState('loading');
    setReloadKey((k) => k + 1);
  };
  const select = (id) => {
    setSelectedId(id);
    if (isMobile()) setSheetOpen(false);
  };

  // Matching homes first in the card
  const selectedMatch = selected ? matchById.get(selected.id) : null;
  const selectedListings = selected
    ? [...selected.listings].sort((a, b) => Number(selectedMatch?.homeIds.has(b.id) || 0) - Number(selectedMatch?.homeIds.has(a.id) || 0))
    : [];
  const mapsUrl = selected
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name}, ${selected.locality}, ${selected.city}`)}`
    : '';
  const headline = selected
    ? selected.project?.priceMin
      ? rangeText(selected.project.priceMin, selected.project.priceMax)
      : selected.buy.min ? rangeText(selected.buy.min, selected.buy.max) : selected.rent.min ? rangeText(selected.rent.min, selected.rent.max, '/mo') : 'Price on request'
    : '';

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* MapLibre's unlayered CSS sets position: relative on the map div, which beats Tailwind's layered utilities,
          so the positioning lives on a wrapper */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" aria-label={`3D map of societies in ${CITY}`} role="region" />
      </div>

      {!webglOk && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center md:pl-[420px]">
          <p className="max-w-sm text-sm font-medium text-slate-600">
            Your browser could not start WebGL, so the 3D map is off. You can still browse every society in the list.
          </p>
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-30 hidden md:block rounded-2xl bg-white border border-slate-100 px-3.5 py-2.5 shadow-xl shadow-slate-900/10"
          style={{ left: hover.x + 16, top: hover.y + 16 }}
        >
          <p className="text-sm font-black text-slate-900">{hovered.name}</p>
          <p className="text-xs font-semibold text-slate-500">
            {hovered.locality} · <span className="text-emerald-600">{hovered.priceLabel}</span>
          </p>
        </div>
      )}

      {/* Loading / error / notices */}
      {(loadState !== 'ready' || notice) && (
        <div role="status" className="absolute left-1/2 top-5 z-40 -translate-x-1/2 max-w-[90vw] flex items-center gap-3 rounded-full bg-white border border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xl shadow-slate-900/10 md:ml-[200px]">
          {notice || (loadState === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Loading societies…</>
          ) : (
            <>
              <span>Could not load societies.</span>
              <button type="button" onClick={retry} className="font-bold text-emerald-600 hover:underline">Retry</button>
            </>
          ))}
        </div>
      )}

      {/* ---------- Filter sidebar (bottom sheet on phones) ---------- */}
      <aside
        aria-label="Search and filters"
        className={`absolute z-20 inset-x-0 bottom-0 flex flex-col bg-white rounded-t-3xl shadow-2xl shadow-slate-900/20 md:inset-x-auto md:left-4 md:top-4 md:bottom-4 md:w-[400px] md:rounded-3xl md:border md:border-slate-100 ${
          sheetOpen ? 'max-h-[78dvh]' : 'max-h-[46dvh]'
        } md:max-h-none`}
      >
        <button
          type="button"
          className="md:hidden flex justify-center pt-2.5 pb-1"
          aria-label={sheetOpen ? 'Show less' : 'Show more'}
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(!sheetOpen)}
        >
          <span className="w-10 h-1.5 rounded-full bg-slate-200" />
        </button>

        <div className="px-5 pt-2 md:pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="RealtyHub home" onClick={() => navigate('/')} className="flex items-center gap-2 group">
              <span className="p-2 rounded-full bg-slate-900 text-white"><Home className="w-4 h-4" /></span>
              <span className="text-lg font-bold tracking-tighter text-slate-900">RealtyHub.</span>
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <Box className="w-3.5 h-3.5" /> 3D view
            </span>
          </div>

          <h1 className="hidden md:block mt-4 text-3xl font-black tracking-tighter text-slate-900">{CITY} in 3D</h1>
          <p className="hidden md:block text-sm font-medium text-slate-500" aria-live="polite">
            {loadState === 'ready'
              ? `${societies.length} societies · ${totals.buy} for sale · ${totals.rent} for rent`
              : 'Finding societies…'}
          </p>

          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              onFocus={() => setSheetOpen(true)}
              placeholder="Search a society or sector"
              aria-label="Search societies"
              autoComplete="off"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-900 focus:bg-white transition-colors"
            />
            <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5">/</kbd>
          </div>

          <div role="tablist" aria-label="Looking to" className="mt-3 grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={filters.mode === m.id}
                onClick={() => setMode(m.id)}
                className={`py-2 rounded-xl text-sm font-bold transition-colors duration-150 ${
                  filters.mode === m.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5">
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className="font-black text-slate-900 flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {filterCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] flex items-center justify-center">{filterCount}</span>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {(filterCount > 0 || filters.query) && (
              <button type="button" onClick={clearAll} className="text-sm font-semibold text-emerald-600 hover:underline">Clear all</button>
            )}
          </div>

          {showFilters && (
            <div>
              {budgets.length > 0 && (
                <FilterSection title={filters.mode === 'rent' ? 'Monthly rent' : 'Budget'}>
                  {budgets.map((b) => (
                    <Chip key={b.id} active={filters.budget === b.id} onClick={() => update({ budget: filters.budget === b.id ? '' : b.id })}>{b.label}</Chip>
                  ))}
                </FilterSection>
              )}
              {bhkOptions.length > 0 && (
                <FilterSection title="BHK">
                  {bhkOptions.map((b) => (
                    <Chip key={b} active={filters.bhks.includes(b)} onClick={() => toggleIn('bhks', b)}>{b}</Chip>
                  ))}
                </FilterSection>
              )}
              <FilterSection title="Property type">
                {TYPES.map((t) => (
                  <Chip key={t} active={filters.types.includes(t)} onClick={() => toggleIn('types', t)}>{t}</Chip>
                ))}
              </FilterSection>
            </div>
          )}

          <div className="sticky top-0 z-10 -mx-5 px-5 py-3 mt-1 bg-white/95 backdrop-blur border-y border-slate-100 flex items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-900">
              {results.length} <span className="font-semibold text-slate-500">of {societies.length} societies</span>
            </p>
            <label className="sr-only" htmlFor="map3d-sort">Sort by</label>
            <select
              id="map3d-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-slate-100 rounded-full pl-3.5 pr-7 py-1.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            >
              {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          <ul className="py-3 space-y-2">
            {sorted.map(({ society: s, homeIds, project }) => {
              const isSel = selectedId === s.id;
              const isHover = hover?.sid === s.id;
              const bhks = [...new Set(s.listings.map((l) => bhkBase(l.bhk)).filter(Boolean))].sort((a, b) => bhkOrder(a) - bhkOrder(b));
              return (
                <li key={s.id} data-sid={s.id}>
                  <button
                    type="button"
                    onClick={() => select(s.id)}
                    onMouseEnter={() => setHover({ sid: s.id, from: 'list' })}
                    onMouseLeave={() => setHover(null)}
                    className={`w-full flex gap-3 p-2 rounded-2xl border text-left transition-[box-shadow,border-color] duration-200 ${
                      isSel ? 'border-slate-900 shadow-lg shadow-slate-200/70' : isHover ? 'border-emerald-300 shadow-md shadow-slate-200/60' : 'border-slate-100 hover:shadow-md hover:shadow-slate-200/60'
                    }`}
                  >
                    <Thumb src={s.image} className="w-20 h-20 rounded-xl shrink-0" />
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2">{s.name}</p>
                        {s.project && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Project</span>}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {s.locality}
                      </p>
                      <p className="mt-1.5 text-sm font-black text-slate-900">{s.priceLabel}</p>
                      <p className="text-[11px] font-semibold text-slate-400 truncate">
                        {[
                          homeIds.size ? `${homeIds.size} ${homeIds.size === 1 ? 'home' : 'homes'}` : project ? 'New launch' : '',
                          bhks.slice(0, 4).join(', '),
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {loadState === 'ready' && !results.length && (
              <li className="flex flex-col items-center text-center py-10 px-4 rounded-3xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-900">{societies.length ? 'No society matches these filters' : `No societies in ${CITY} yet`}</p>
                {societies.length > 0 && (
                  <button type="button" onClick={clearAll} className="mt-3 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-700">Clear filters</button>
                )}
              </li>
            )}
          </ul>
          <p className="hidden md:block pb-5 text-[11px] leading-relaxed font-medium text-slate-400">
            Prices and homes are live RealtyHub listings. Building shapes are illustrative; heights follow the listed floor count where we have it.
            Right-drag to turn the city in 3D.
          </p>
        </div>
      </aside>

      {/* ---------- Society card ---------- */}
      {selected && (
        <article
          aria-label={selected.name}
          className="absolute z-30 inset-x-0 bottom-0 max-h-[72dvh] rounded-t-3xl md:inset-x-auto md:right-4 md:top-4 md:bottom-auto md:w-[420px] md:max-h-[calc(100%-2rem)] md:rounded-3xl flex flex-col bg-white shadow-2xl shadow-slate-900/20 md:border md:border-slate-100 overflow-hidden"
        >
          <div className="overflow-y-auto overscroll-contain">
            <div className="relative p-2.5 pb-0">
              <div className="relative h-48 rounded-[1.25rem] overflow-hidden bg-slate-100">
                <Thumb src={selected.image} className="w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/0 to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-slate-800 text-[10px] font-bold uppercase tracking-wide">
                  {KIND_LABEL[selected.kind]}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="absolute bottom-3 left-4 right-4 text-2xl font-black text-white tracking-tight">{headline}</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h2 className="text-2xl font-black tracking-tighter text-slate-900 leading-tight">{selected.name}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <MapPin className="w-4 h-4" /> {[selected.locality, selected.city].filter(Boolean).join(', ')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selected.project && (
                  <>
                    <Stat label="Developer" value={selected.project.developer || '—'} note={selected.project.totalUnits ? `${selected.project.totalUnits} units` : ''} />
                    <Stat
                      label="Status"
                      value={STATUS_LABEL[selected.project.status] || selected.project.status}
                      note={selected.project.possessionDate ? `Possession ${new Date(selected.project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}
                    />
                  </>
                )}
                {(selected.buy.count > 0 || !selected.project) && (
                  <Stat label="For sale" value={selected.buy.count ? rangeText(selected.buy.min, selected.buy.max) : 'None listed'} note={`${selected.buy.count} ${selected.buy.count === 1 ? 'home' : 'homes'}`} />
                )}
                {(selected.rent.count > 0 || !selected.project) && (
                  <Stat label="For rent" value={selected.rent.count ? rangeText(selected.rent.min, selected.rent.max, '/mo') : 'None listed'} note={`${selected.rent.count} ${selected.rent.count === 1 ? 'home' : 'homes'}`} />
                )}
              </div>

              {selected.bhks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.bhks.map((b) => (
                    <span key={b} className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">{b}</span>
                  ))}
                </div>
              )}

              {selected.project?.configurations?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Configurations</h3>
                  <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {selected.project.configurations.map((c) => (
                      <li key={c.type} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                        <span className="font-bold text-slate-900">{c.type}<span className="font-medium text-slate-500">{c.minArea ? ` · ${c.minArea}–${c.maxArea} sq.ft` : ''}</span></span>
                        <span className="font-black text-slate-900 text-right">{rangeText(c.priceMin, c.priceMax)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.amenities.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.amenities.map((a) => (
                      <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-600">
                        <Check className="w-3 h-3 text-emerald-500" /> {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedListings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Homes listed here ({selectedListings.length})</h3>
                  <ul className="space-y-2">
                    {selectedListings.map((l) => {
                      const rental = isRental(l);
                      const dim = filterCount > 0 && selectedMatch && !selectedMatch.homeIds.has(l.id);
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => navigate(`/property/${l.id}`)}
                            className={`w-full flex items-center gap-3 p-2 rounded-2xl border border-slate-100 text-left hover:shadow-md hover:shadow-slate-200/60 hover:border-slate-200 transition-[box-shadow,border-color] ${dim ? 'opacity-50' : ''}`}
                          >
                            <Thumb src={l.image} className="w-14 h-14 rounded-xl shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-slate-900">
                                {l.price ? money(l.price) : 'Price on request'}
                                {l.price && rental && <span className="text-xs font-semibold text-slate-500">/month</span>}
                              </p>
                              <p className="text-xs font-semibold text-slate-600 truncate">{l.title}</p>
                              <p className="mt-0.5 flex items-center gap-2.5 text-[11px] font-semibold text-slate-400">
                                {l.bhk && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{l.bhk}</span>}
                                {l.area && <span className="flex items-center gap-1"><Maximize className="w-3 h-3" />{l.area}</span>}
                              </p>
                            </div>
                            <span className={`shrink-0 self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${rental ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {rental ? 'Rent' : typeOf(l.type) === 'Plot' ? 'Plot' : 'Buy'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 p-4 border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {selected.project ? (
              <button type="button" onClick={() => navigate(`/projects/${selected.project.id}`)} className="flex-1 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
                View project
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/listings', { state: { filters: { city: selected.city, locality: selected.locality } } })}
                className="flex-1 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-colors truncate px-4"
              >
                All homes in {selected.locality}
              </button>
            )}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-3 rounded-full border border-slate-200 text-sm font-bold text-slate-800 hover:border-slate-900 transition-colors"
            >
              Directions <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </article>
      )}

      {/* ---------- Map controls ---------- */}
      {webglOk && (
        <div
          className={`absolute z-20 right-3 top-3 flex flex-col gap-2 md:top-auto md:bottom-6 transition-[right] duration-300 ${
            selected ? 'md:right-[452px]' : 'md:right-5'
          }`}
        >
          <div className="relative">
            <ControlButton label={`Map style: ${BASE_MODE_LABELS[baseMode]}`} onClick={() => setStyleMenu(!styleMenu)} disabled={!layersReady} active={styleMenu}>
              <Layers className="w-4 h-4" />
            </ControlButton>
            {styleMenu && (
              <div className="absolute right-full mr-2 top-0 md:top-auto md:bottom-0 w-40 rounded-2xl bg-white border border-slate-100 p-1.5 shadow-xl shadow-slate-900/10" role="menu">
                {BASE_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="menuitemradio"
                    aria-checked={baseMode === mode}
                    onClick={() => pickStyle(mode)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold ${baseMode === mode ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {BASE_MODE_LABELS[mode]} {baseMode === mode && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ControlButton label="Show my location" onClick={locateMe} disabled={!mapReady || locating}>
            {locating ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <LocateFixed className="w-4 h-4" />}
          </ControlButton>
          <ControlButton label={bearing ? 'Point north' : 'North is up'} onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 600 })} disabled={!mapReady}>
            <Navigation className="w-4 h-4 transition-transform" style={{ transform: `rotate(${-bearing}deg)` }} />
          </ControlButton>
          <ControlButton label="Show all societies" onClick={goHome} disabled={!layersReady}>
            <Home className="w-4 h-4" />
          </ControlButton>
          <ControlButton label={is3d ? 'Switch to flat map' : 'Switch to 3D'} onClick={toggleTilt} disabled={!mapReady}>
            {is3d ? '2D' : '3D'}
          </ControlButton>
          <div className="flex flex-col rounded-full bg-white border border-slate-100 shadow-lg shadow-slate-900/10 overflow-hidden">
            <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => mapRef.current?.zoomIn()} disabled={!mapReady} className="w-11 h-11 flex items-center justify-center text-slate-800 hover:bg-slate-50 disabled:opacity-40">
              <Plus className="w-4 h-4" />
            </button>
            <span className="h-px bg-slate-100 mx-2" />
            <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => mapRef.current?.zoomOut()} disabled={!mapReady} className="w-11 h-11 flex items-center justify-center text-slate-800 hover:bg-slate-50 disabled:opacity-40">
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
