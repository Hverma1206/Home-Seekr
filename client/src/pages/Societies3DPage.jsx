import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, X, Home, Plus, Minus, Layers, MapPin, Building2, ExternalLink, ChevronUp, ChevronDown, Loader2, Box, LocateFixed,
} from 'lucide-react';
import { societyService } from '../services/societyService';
import { formatPrice } from '../services/propertyService';
import {
  createMap, addSocietyLayers, addBaseLayers, setBaseMode, startPulse, setStates, setFlag, showYou,
  placeSocieties, buildSocietyGeoJSON, SOCIETY_LAYERS, BASE_MODES, BASE_MODE_LABELS,
} from '../components/map3d/societyMap';

const CITY = 'Gurugram';
const PITCH_3D = 55;
const FALLBACK_CAMERA = { center: [77.04, 28.44], zoom: 11.6, pitch: PITCH_3D, bearing: 0 };
const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
const MODES = [
  { id: 'all', label: 'All' },
  { id: 'buy', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'projects', label: 'Projects' },
];
const KIND_LABEL = { society: 'Society', area: 'Independent homes', project: 'New project' };
const STATUS_LABEL = { pre_launch: 'Pre-launch', ongoing: 'Under construction', completed: 'Ready to move', delayed: 'Delayed' };

const money = (n) => (n ? formatPrice(String(Math.round(n))) : '');
const rangeText = (r, suffix = '') => {
  if (!r?.count) return '';
  if (!r.min) return 'Price on request';
  return `${r.min === r.max ? money(r.min) : `${money(r.min)} – ${money(r.max)}`}${suffix}`;
};
const bhkOrder = (b) => (/rk/i.test(b) ? 0.5 : parseFloat(b) || 99);
// "3 BHK + Servant" and "3 BHK + Study" filter as "3 BHK"; the card keeps the full label
const bhkBase = (b) => (/rk/i.test(b) ? '1 RK' : parseFloat(b) ? `${parseFloat(b)} BHK` : '');
const isMobile = () => window.matchMedia?.('(max-width: 767px)').matches;
const canUseWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const matchesFilters = (s, { mode, bhk, query }) => {
  if (mode === 'buy' && !s.buy.count) return false;
  if (mode === 'rent' && !s.rent.count) return false;
  if (mode === 'projects' && !s.project) return false;
  if (bhk && !s.bhks.some((b) => bhkBase(b) === bhk)) return false;
  const q = query.trim().toLowerCase();
  return !q || `${s.name} ${s.locality}`.toLowerCase().includes(q);
};

const summary = (s) => [
  s.buy.count ? (s.buy.min ? `Buy from ${money(s.buy.min)}` : 'For sale · price on request') : '',
  s.rent.count ? (s.rent.min ? `Rent from ${money(s.rent.min)}/mo` : 'For rent · price on request') : '',
  s.project?.priceMin ? `From ${money(s.project.priceMin)}` : '',
].filter(Boolean).join(' · ');

// Middle 90% of values: a couple of far-out societies (Sohna) should not shrink the whole city to dots
const trimmedRange = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * 0.05);
  return [sorted[cut], sorted[sorted.length - 1 - cut]];
};

// Frame the bulk of the societies, leaving room for the panels
const overviewCamera = (map, societies) => {
  if (!societies.length) return FALLBACK_CAMERA;
  const [minLng, maxLng] = trimmedRange(societies.map((s) => s.lng));
  const [minLat, maxLat] = trimmedRange(societies.map((s) => s.lat));
  const padding = isMobile()
    ? { top: 70, bottom: Math.round(window.innerHeight * 0.45), left: 24, right: 24 }
    : { top: 60, bottom: 60, left: 420, right: 60 };
  try {
    const cam = map.cameraForBounds([[minLng, minLat], [maxLng, maxLat]], { padding, maxZoom: 13 });
    return cam ? { center: cam.center, zoom: cam.zoom, pitch: PITCH_3D, bearing: 0 } : FALLBACK_CAMERA;
  } catch {
    return FALLBACK_CAMERA;
  }
};

const ControlButton = ({ label, onClick, children, disabled }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="h-10 min-w-10 px-2.5 flex items-center justify-center gap-1.5 rounded-full bg-[#0c0c0f]/85 backdrop-blur-xl border border-white/10 text-slate-100 text-xs font-semibold shadow-xl hover:bg-[#25252b] disabled:opacity-40 transition-colors"
  >
    {children}
  </button>
);

const Stat = ({ label, value, note }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-amber-100">{value || '—'}</p>
    {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
  </div>
);

export default function Societies3DPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overviewRef = useRef(FALLBACK_CAMERA);
  const prevSelectedRef = useRef(null);
  const prevHoverRef = useRef(null);
  const searchRef = useRef(null);
  const youRef = useRef(null);

  const [webglOk] = useState(canUseWebGL);
  const [societies, setSocieties] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState('all');
  const [bhk, setBhk] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [hover, setHover] = useState(null);
  const [baseMode, setBaseModeState] = useState('night');
  const [is3d, setIs3d] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState('');

  // Layers are added by the effect below in the same commit, before the effects that colour them run
  const layersReady = mapReady && loadState === 'ready';
  const byId = useMemo(() => new Map(societies.map((s) => [s.id, s])), [societies]);
  const selected = selectedId ? byId.get(selectedId) || null : null;
  const hovered = hover ? byId.get(hover.sid) : null;
  const matches = useMemo(() => societies.filter((s) => matchesFilters(s, { mode, bhk, query })), [societies, mode, bhk, query]);
  const bhkOptions = useMemo(() => [...new Set(societies.flatMap((s) => s.bhks.map(bhkBase)).filter(Boolean))].sort((a, b) => bhkOrder(a) - bhkOrder(b)), [societies]);
  const totals = useMemo(() => societies.reduce((t, s) => ({ buy: t.buy + s.buy.count, rent: t.rent + s.rent.count }), { buy: 0, rent: 0 }), [societies]);

  // Societies from our database
  useEffect(() => {
    let active = true;
    societyService.getSocieties(CITY)
      .then((list) => {
        if (!active) return;
        setSocieties(placeSocieties(list));
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
    map.once('style.load', () => setMapReady(true));
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
    } else {
      map.getSource('shapes').setData(shapes);
      map.getSource('pts').setData(points);
    }
    const stopPulse = startPulse(map);

    const societyAt = (point) => map.queryRenderedFeatures(point, { layers: SOCIETY_LAYERS })[0]?.properties?.sid || null;
    const setHovered = (sid) => {
      if (sid === prevHoverRef.current) return;
      setFlag(map, 'hover', sid, prevHoverRef.current);
      prevHoverRef.current = sid;
    };
    const onClick = (e) => setSelectedId(societyAt(e.point));
    const onMove = (e) => {
      const sid = societyAt(e.point);
      map.getCanvas().style.cursor = sid ? 'pointer' : '';
      setHovered(sid);
      setHover(sid ? { sid, x: e.point.x, y: e.point.y } : null);
    };
    const onLeave = () => { setHovered(null); setHover(null); };
    map.on('click', onClick);
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    map.on('dragstart', onLeave);

    if (fresh) {
      overviewRef.current = overviewCamera(map, societies);
      // flyTo without `essential` jumps straight there for visitors who ask for reduced motion
      setTimeout(() => mapRef.current?.flyTo({ ...overviewRef.current, padding: NO_PADDING, duration: 4200, curve: 1.6 }), 250);
    }

    return () => {
      stopPulse();
      map.off('click', onClick);
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
      map.off('dragstart', onLeave);
    };
  }, [mapReady, loadState, societies]);

  // Highlight what the filters match, dim the rest
  useEffect(() => {
    const map = mapRef.current;
    if (!layersReady || !map) return;
    const ids = new Set(matches.map((s) => s.id));
    setStates(map, societies.map((s) => [s.id, ids.has(s.id) ? 'match' : 'no']));
  }, [layersReady, matches, societies]);

  // Selected society: paint it white and fly to it
  useEffect(() => {
    const map = mapRef.current;
    if (!layersReady || !map) return;
    setFlag(map, 'sel', selected?.id || null, prevSelectedRef.current);
    prevSelectedRef.current = selected?.id || null;
    if (!selected) return;
    const padding = isMobile()
      ? { top: 40, bottom: Math.round(window.innerHeight * 0.55), left: 0, right: 0 }
      : { top: 40, bottom: 40, left: 380, right: 400 };
    map.flyTo({
      center: [selected.lng, selected.lat],
      zoom: isMobile() ? 15 : 15.8,
      pitch: map.getPitch() > 5 ? PITCH_3D : 0,
      bearing: 0,
      padding,
      duration: 2200,
    });
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

  // "/" jumps to search, Escape closes the society card
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setPanelOpen(true);
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goHome = () => {
    setSelectedId(null);
    mapRef.current?.flyTo({ ...overviewRef.current, pitch: is3d ? PITCH_3D : 0, padding: NO_PADDING, duration: 2000 });
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
  const toggleTilt = () => {
    mapRef.current?.easeTo({ pitch: is3d ? 0 : PITCH_3D, duration: 800 });
    setIs3d(!is3d);
  };
  const cycleBase = () => {
    const next = BASE_MODES[(BASE_MODES.indexOf(baseMode) + 1) % BASE_MODES.length];
    if (mapRef.current) setBaseMode(mapRef.current, next);
    setBaseModeState(next);
  };
  const retry = () => {
    setLoadState('loading');
    setReloadKey((k) => k + 1);
  };
  const clearFilters = () => {
    setMode('all');
    setBhk('');
    setQuery('');
  };

  const filtered = mode !== 'all' || bhk || query;
  const mapsUrl = selected
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name}, ${selected.locality}, ${selected.city}`)}`
    : '';

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050506] text-slate-100 font-sans">
      {/* MapLibre's unlayered CSS sets position: relative on the map div, which beats Tailwind's layered utilities,
          so the positioning lives on a wrapper */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" aria-label={`3D map of societies in ${CITY}`} role="region" />
      </div>

      {!webglOk && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
          <p className="max-w-sm text-sm text-slate-300">
            Your browser could not start WebGL, so the 3D map is off. You can still browse every society in the list.
          </p>
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-30 hidden md:block rounded-xl bg-[#0c0c0f]/90 border border-white/10 px-3 py-2 shadow-2xl backdrop-blur"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="text-sm font-semibold text-white">{hovered.name}</p>
          <p className="text-[11px] text-slate-400">{[hovered.locality, summary(hovered)].filter(Boolean).join(' · ')}</p>
        </div>
      )}

      {/* Loading / error */}
      {loadState !== 'ready' && (
        <div className="absolute left-1/2 top-6 z-30 -translate-x-1/2 flex items-center gap-3 rounded-full bg-[#0c0c0f]/90 border border-white/10 px-4 py-2.5 text-sm shadow-2xl backdrop-blur">
          {loadState === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin text-amber-200" /> Loading societies…</>
          ) : (
            <>
              <span>Could not load societies.</span>
              <button type="button" onClick={retry} className="font-semibold text-amber-200 hover:underline">Retry</button>
            </>
          )}
        </div>
      )}

      {notice && (
        <div role="status" className="absolute left-1/2 bottom-24 md:bottom-28 z-30 -translate-x-1/2 max-w-[90vw] rounded-full bg-[#0c0c0f]/90 border border-white/10 px-4 py-2.5 text-sm shadow-2xl backdrop-blur">
          {notice}
        </div>
      )}

      {/* Mobile back button */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="md:hidden absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-[#0c0c0f]/85 border border-white/10 px-3.5 py-2 text-sm font-semibold backdrop-blur-xl shadow-xl"
      >
        <ArrowLeft className="w-4 h-4" /> RealtyHub
      </button>

      {/* Search + filters + results */}
      <aside
        className={`absolute z-10 inset-x-3 bottom-3 md:inset-x-auto md:left-4 md:top-4 md:bottom-4 md:w-[360px] flex flex-col rounded-3xl bg-[#0c0c0f]/85 backdrop-blur-xl border border-white/10 shadow-2xl ${panelOpen ? 'max-h-[58vh] md:max-h-none' : ''}`}
      >
        <div className="p-4 pb-3 md:p-5 md:pb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> RealtyHub
            </button>
            <span className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" /> 3D view
            </span>
            <button
              type="button"
              className="md:hidden p-1 text-slate-300"
              aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen(!panelOpen)}
            >
              {panelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-white">Every society in {CITY}</h1>
          <p className="mt-1 text-xs text-slate-400 hidden md:block">
            {loadState === 'ready'
              ? `${societies.length} societies · ${totals.buy} homes for sale · ${totals.rent} for rent, live from RealtyHub`
              : 'Live from RealtyHub listings'}
          </p>
        </div>

        {panelOpen && (
          <>
            <div className="px-5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a society or sector"
                  aria-label="Search societies"
                  autoComplete="off"
                  className="w-full rounded-full bg-white/5 border border-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-200/60"
                />
                <kbd className="hidden md:block absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 border border-white/10 rounded px-1.5">/</kbd>
              </div>

              <div className="flex gap-1 rounded-full bg-white/5 border border-white/10 p-1" role="group" aria-label="Show">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${mode === m.id ? 'bg-amber-100 text-slate-900' : 'text-slate-300 hover:text-white'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {bhkOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="BHK">
                  {bhkOptions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={bhk === b}
                      onClick={() => setBhk(bhk === b ? '' : b)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${bhk === b ? 'border-amber-200 bg-amber-200/15 text-amber-100' : 'border-white/10 text-slate-300 hover:border-white/30'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end justify-between border-t border-white/10 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Matching societies</p>
                  <p className="text-3xl font-light text-amber-100 leading-tight">
                    {matches.length}<span className="text-sm text-slate-500"> / {societies.length}</span>
                  </p>
                </div>
                {filtered && (
                  <button type="button" onClick={clearFilters} className="text-xs font-semibold text-slate-400 hover:text-white">Clear filters</button>
                )}
              </div>
            </div>

            <ul className="mt-2 flex-1 overflow-y-auto px-3 pb-3 min-h-0">
              {matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    onMouseEnter={() => mapRef.current && layersReady && setFlag(mapRef.current, 'hover', s.id, null)}
                    onMouseLeave={() => mapRef.current && layersReady && setFlag(mapRef.current, 'hover', null, s.id)}
                    className={`w-full text-left rounded-2xl px-3 py-2.5 transition-colors ${selectedId === s.id ? 'bg-amber-100/10 ring-1 ring-amber-200/40' : 'hover:bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                      {s.project && <span className="shrink-0 text-[10px] rounded-full bg-emerald-400/15 text-emerald-300 px-2 py-0.5">Project</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{[s.locality, summary(s)].filter(Boolean).join(' · ')}</p>
                  </button>
                </li>
              ))}
              {loadState === 'ready' && !matches.length && (
                <li className="px-3 py-6 text-center text-sm text-slate-400">
                  {societies.length ? 'No society matches these filters.' : `No societies with a location in ${CITY} yet.`}
                </li>
              )}
            </ul>
            <p className="hidden md:block px-5 pb-4 text-[10px] leading-relaxed text-slate-500">
              Prices and homes are live RealtyHub listings. Tower shapes are illustrative; heights follow the listed floor count where we have it.
            </p>
          </>
        )}
      </aside>

      {/* Society card */}
      {selected && (
        <article
          className="absolute z-20 inset-x-3 bottom-3 max-h-[72vh] md:inset-x-auto md:right-4 md:top-4 md:bottom-auto md:w-[380px] md:max-h-[calc(100%-7rem)] overflow-y-auto rounded-3xl bg-[#0c0c0f]/92 backdrop-blur-xl border border-white/10 shadow-2xl"
          aria-label={selected.name}
        >
          <div className="relative">
            {selected.image ? (
              <img src={selected.image} alt="" className="h-36 w-full object-cover rounded-t-3xl opacity-80" />
            ) : (
              <div className="h-16" />
            )}
            <div className="absolute inset-0 rounded-t-3xl bg-gradient-to-b from-transparent to-[#0c0c0f]" />
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 -mt-6 relative space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/80">{KIND_LABEL[selected.kind]}</p>
              <h2 className="text-xl font-semibold text-white leading-snug">{selected.name}</h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5" /> {[selected.locality, selected.city].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {selected.project ? (
                <>
                  <Stat
                    label="Price"
                    value={rangeText({ count: selected.project.priceMin ? 1 : 0, min: selected.project.priceMin, max: selected.project.priceMax || selected.project.priceMin })}
                    note={selected.project.developer}
                  />
                  <Stat
                    label="Status"
                    value={STATUS_LABEL[selected.project.status] || selected.project.status}
                    note={selected.project.possessionDate ? `Possession ${new Date(selected.project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}
                  />
                </>
              ) : null}
              {(selected.buy.count > 0 || !selected.project) && (
                <Stat label="Buy" value={rangeText(selected.buy)} note={`${selected.buy.count} for sale`} />
              )}
              {(selected.rent.count > 0 || !selected.project) && (
                <Stat label="Rent" value={rangeText(selected.rent, '/mo')} note={`${selected.rent.count} for rent`} />
              )}
            </div>

            {selected.bhks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.bhks.map((b) => (
                  <span key={b} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-slate-300">{b}</span>
                ))}
              </div>
            )}

            {selected.project?.configurations?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-1.5">Configurations</p>
                <ul className="space-y-1">
                  {selected.project.configurations.map((c) => (
                    <li key={c.type} className="flex justify-between text-xs text-slate-300">
                      <span>{c.type}{c.minArea ? ` · ${c.minArea}–${c.maxArea} sq.ft` : ''}</span>
                      <span className="text-amber-100">{rangeText({ count: c.priceMin ? 1 : 0, min: c.priceMin, max: c.priceMax || c.priceMin })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.amenities.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-1.5">Amenities</p>
                <p className="text-xs text-slate-300">{selected.amenities.join(' · ')}</p>
              </div>
            )}

            {selected.listings.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-1.5">Homes listed here ({selected.listings.length})</p>
                <ul className="space-y-1.5">
                  {selected.listings.map((l) => {
                    const rental = l.lookingTo === 'rent' || l.lookingTo === 'pg';
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/property/${l.id}`)}
                          className="w-full flex items-center gap-3 rounded-2xl bg-white/5 border border-white/5 p-2 text-left hover:border-amber-200/40 transition-colors"
                        >
                          {l.image ? (
                            <img src={l.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" loading="lazy" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-slate-500" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{l.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{[l.bhk, l.area, l.furnishing].filter(Boolean).join(' · ')}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-amber-100">{l.price ? `${money(l.price)}${rental ? '/mo' : ''}` : 'On request'}</p>
                            <p className="text-[10px] text-slate-500">{rental ? 'Rent' : 'Buy'}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {selected.project && (
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${selected.project.id}`)}
                  className="rounded-full bg-amber-100 text-slate-900 px-4 py-2 text-xs font-semibold hover:bg-white"
                >
                  View project
                </button>
              )}
              {selected.locality && (
                <button
                  type="button"
                  onClick={() => navigate('/listings', { state: { filters: { city: selected.city, locality: selected.locality } } })}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  All homes in {selected.locality}
                </button>
              )}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Google Maps <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </article>
      )}

      {/* Map controls */}
      {webglOk && (
        <div className="absolute z-10 right-3 top-3 flex flex-col gap-2 md:top-auto md:right-4 md:bottom-10 md:flex-row">
          <ControlButton label={`Map style: ${BASE_MODE_LABELS[baseMode]}`} onClick={cycleBase} disabled={!layersReady}>
            <Layers className="w-4 h-4" /><span className="hidden md:inline">{BASE_MODE_LABELS[baseMode]}</span>
          </ControlButton>
          <ControlButton label="Show my location" onClick={locateMe} disabled={!mapReady || locating}>
            {locating ? <Loader2 className="w-4 h-4 animate-spin text-amber-200" /> : <LocateFixed className="w-4 h-4" />}
          </ControlButton>
          <ControlButton label="Show all societies" onClick={goHome} disabled={!layersReady}>
            <Home className="w-4 h-4" />
          </ControlButton>
          <ControlButton label={is3d ? 'Switch to flat map' : 'Switch to 3D'} onClick={toggleTilt} disabled={!mapReady}>
            {is3d ? '2D' : '3D'}
          </ControlButton>
          <ControlButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()} disabled={!mapReady}>
            <Plus className="w-4 h-4" />
          </ControlButton>
          <ControlButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()} disabled={!mapReady}>
            <Minus className="w-4 h-4" />
          </ControlButton>
        </div>
      )}
    </div>
  );
}
