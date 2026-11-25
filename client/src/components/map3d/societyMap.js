// 3D society map engine, ported from flat-finder's map.js and geo.py. Only the rendering lives here:
// every society, price and listing comes from our own API (GET /api/societies).
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export const SOCIETY_LAYERS = ['bld', 'site-fill', 'glow'];
export const BASE_MODES = ['night', 'streets', 'light'];
export const BASE_MODE_LABELS = { night: 'Night', streets: 'Dark map', light: 'Day map' };

// ---------- geometry: illustrative tower footprints around each society's pin ----------
const M_PER_DEG_LAT = 111320;
const mPerDegLng = (lat) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

export const hashString = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Small seeded PRNG so every society always gets the same layout
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const circle = ([lng, lat], radiusM, n = 32) => {
  const k = mPerDegLng(lat);
  const ring = Array.from({ length: n }, (_, i) => [
    lng + (radiusM * Math.cos((2 * Math.PI * i) / n)) / k,
    lat + (radiusM * Math.sin((2 * Math.PI * i) / n)) / M_PER_DEG_LAT,
  ]);
  return [...ring, ring[0]];
};

const rect = ([lng, lat], w, d, angle) => {
  const k = mPerDegLng(lat);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([dx, dy]) => [
    lng + (dx * c - dy * s) / k,
    lat + (dx * s + dy * c) / M_PER_DEG_LAT,
  ]);
  return [...pts, pts[0]];
};

// Farthest-point sampling on a 12 m grid inside the site keeps towers spread out (same idea as geo.generate_towers)
const generateTowers = (center, radiusM, count, rnd, w, d) => {
  const [lng, lat] = center;
  const k = mPerDegLng(lat);
  const inner = Math.max(10, radiusM - Math.max(w, d) / 2 - 4);
  const cands = [];
  for (let y = -inner; y <= inner; y += 12) {
    for (let x = -inner; x <= inner; x += 12) {
      if (x * x + y * y <= inner * inner) cands.push([x, y]);
    }
  }
  const chosen = [cands[Math.floor(rnd() * cands.length)]];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  while (chosen.length < count) {
    let best = null;
    let bestD = -1;
    for (const c of cands) {
      const dMin = Math.min(...chosen.map((q) => dist(c, q)));
      if (dMin > bestD) { bestD = dMin; best = c; }
    }
    if (bestD < Math.max(w, d) + 6) break; // site too small for more
    chosen.push(best);
  }
  const angle = rnd() * (Math.PI / 2);
  return chosen.map(([x, y]) => rect([lng + x / k, lat + y / M_PER_DEG_LAT], w, d, angle));
};

const siteRadius = (s) => (s.kind === 'area' ? 110 : s.project ? 120 : 90);

// Sector-level coordinates put several societies on one point: fan them out on a ring so each is clickable
export const placeSocieties = (societies) => {
  const groups = new Map();
  for (const s of societies) {
    const key = `${s.lng.toFixed(4)},${s.lat.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const placed = [];
  for (const group of groups.values()) {
    if (group.length === 1) { placed.push(group[0]); continue; }
    const ringM = 200 + 45 * group.length;
    const offset = (hashString(group[0].id) % 360) * (Math.PI / 180);
    group.forEach((s, i) => {
      const a = offset + (2 * Math.PI * i) / group.length;
      placed.push({
        ...s,
        lng: s.lng + (ringM * Math.cos(a)) / mPerDegLng(s.lat),
        lat: s.lat + (ringM * Math.sin(a)) / M_PER_DEG_LAT,
      });
    });
  }
  return placed;
};

export const buildSocietyGeoJSON = (societies) => {
  const shapes = [];
  const points = [];
  for (const s of societies) {
    const center = [s.lng, s.lat];
    const rnd = seeded(hashString(s.id));
    const r = siteRadius(s);
    shapes.push({ type: 'Feature', properties: { sid: s.id, role: 'site' }, geometry: { type: 'Polygon', coordinates: [circle(center, r)] } });

    const count = s.kind === 'area'
      ? 8
      : s.project
        ? s.project.towers || Math.max(3, Math.min(10, Math.round((s.project.totalUnits || 480) / 120)))
        : 3 + Math.floor(rnd() * 4);
    const [w, d] = s.tall ? [24, 18] : [13, 11];
    // Height from the listed floor count when we have it; otherwise a typical tower or low-rise height
    const baseH = s.floors ? s.floors * 3.2 : s.tall ? 55 : 10;
    for (const ring of generateTowers(center, r, count, rnd, w, d)) {
      const h = s.floors ? baseH : baseH * (0.8 + rnd() * 0.4);
      shapes.push({ type: 'Feature', properties: { sid: s.id, role: 'bld', h: Math.round(h) }, geometry: { type: 'Polygon', coordinates: [ring] } });
    }
    points.push({ type: 'Feature', properties: { sid: s.id, name: s.name }, geometry: { type: 'Point', coordinates: center } });
  }
  return {
    shapes: { type: 'FeatureCollection', features: shapes },
    points: { type: 'FeatureCollection', features: points },
  };
};

// ---------- map style ----------
const SKY = {
  night: { 'sky-color': '#07080b', 'horizon-color': '#1a1712', 'fog-color': '#07080b', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.2, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 0] },
  light: { 'sky-color': '#cfe3f5', 'horizon-color': '#eef3f7', 'fog-color': '#f5f3ef', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.2, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 0] },
};

export function createMap(container) {
  const map = new maplibregl.Map({
    container,
    attributionControl: { compact: true },
    center: [78.5, 22.5],
    zoom: 2.2,
    pitch: 0,
    bearing: 0,
    maxPitch: 70,
    dragRotate: false, // north stays up, like Google Maps
    pitchWithRotate: false,
    touchPitch: false,
    style: {
      version: 8,
      projection: { type: 'globe' },
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sky: SKY.night,
      sources: {
        sat: { type: 'raster', tileSize: 256, maxzoom: 18, attribution: 'Imagery © Esri',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] },
        omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenStreetMap contributors · OpenFreeMap' },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#050506' } },
        { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-brightness-max': 0.3, 'raster-saturation': -0.75, 'raster-contrast': 0.15, 'raster-hue-rotate': 200 } },
        { id: 'roads', type: 'line', source: 'omt', 'source-layer': 'transportation',
          filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
          paint: { 'line-color': '#ffcf8a', 'line-opacity': 0.2, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 16, 2.5], 'line-blur': 1 } },
        { id: 'city', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13,
          paint: { 'fill-extrusion-color': '#17171a', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.85 } },
      ],
    },
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  return map;
}

// Colours per base map: "match" = passes the current filters, "no" = filtered out
const PALETTES = {
  night: { match: '#ffd9a0', no: '#2a2a2f', hover: '#fff1d6', sel: '#ffffff', city: '#17171a', label: '#f2f0ec', halo: 'rgba(0,0,0,.85)' },
  streets: { match: '#ffd9a0', no: '#34353a', hover: '#fff1d6', sel: '#ffffff', city: '#2a2b30', label: '#f2f0ec', halo: 'rgba(0,0,0,.85)' },
  light: { match: '#e8710a', no: '#dedad3', hover: '#ff9a3d', sel: '#1a73e8', city: '#e8e5df', label: '#202124', halo: 'rgba(255,255,255,.95)' },
};

const colorBy = (c) => ['case',
  ['boolean', ['feature-state', 'sel'], false], c.sel,
  ['boolean', ['feature-state', 'hover'], false], c.hover,
  ['match', ['feature-state', 'st'], 'no', c.no, c.match]];

export function addSocietyLayers(map, shapes, points) {
  const c = PALETTES.night;
  map.addSource('shapes', { type: 'geojson', data: shapes, promoteId: 'sid' });
  map.addSource('pts', { type: 'geojson', data: points, promoteId: 'sid' });
  map.addLayer({ id: 'site-fill', type: 'fill', source: 'shapes', filter: ['==', ['get', 'role'], 'site'],
    paint: { 'fill-color': colorBy(c), 'fill-opacity': ['match', ['feature-state', 'st'], 'no', 0.02, 0.13] } });
  map.addLayer({ id: 'site-line', type: 'line', source: 'shapes', filter: ['==', ['get', 'role'], 'site'],
    paint: { 'line-color': colorBy(c), 'line-blur': 1.5,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 2],
      'line-opacity': ['match', ['feature-state', 'st'], 'no', 0.08, 0.9] } });
  map.addLayer({ id: 'glow', type: 'circle', source: 'pts', maxzoom: 15.5,
    paint: { 'circle-color': colorBy(c), 'circle-blur': 1,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 12, 10, 15, 28],
      'circle-opacity': ['match', ['feature-state', 'st'], 'no', 0, 0.5] } });
  map.addLayer({ id: 'bld', type: 'fill-extrusion', source: 'shapes', minzoom: 10.5, filter: ['==', ['get', 'role'], 'bld'],
    paint: { 'fill-extrusion-color': colorBy(c), 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 0.95,
      'fill-extrusion-vertical-gradient': true } });
  map.addLayer({ id: 'labels', type: 'symbol', source: 'pts', minzoom: 12.6,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-offset': [0, -2.2],
      'text-letter-spacing': 0.04, 'text-optional': true },
    paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.4,
      'text-opacity': ['match', ['feature-state', 'st'], 'no', 0.25, 1] } });
}

// Pulse the glow of matching societies. Returns a stop function so the page can clean up.
export function startPulse(map) {
  const timer = setInterval(() => {
    if (!map.getLayer('glow')) return;
    const k = 1 + 0.35 * Math.sin(performance.now() / 420);
    map.setPaintProperty('glow', 'circle-radius', ['interpolate', ['linear'], ['zoom'], 9, 4 * k, 12, 10 * k, 15, 28 * k]);
  }, 80);
  return () => clearInterval(timer);
}

const setBoth = (map, sid, state) => {
  for (const source of ['shapes', 'pts']) map.setFeatureState({ source, id: sid }, state);
};

export const setStates = (map, entries) => { for (const [sid, st] of entries) setBoth(map, sid, { st }); };
export const setFlag = (map, flag, sid, prev) => {
  if (prev) setBoth(map, prev, { [flag]: false });
  if (sid) setBoth(map, sid, { [flag]: true });
};

// ---------- street maps: road and area names from OpenFreeMap vector tiles ----------
const ROAD_W = (major, minor) => ['interpolate', ['exponential', 1.5], ['zoom'], 10, ['match', ['get', 'class'], ['motorway', 'trunk'], major * 0.4, ['primary', 'secondary'], minor * 0.5, 0.3],
  17, ['match', ['get', 'class'], ['motorway', 'trunk'], major * 5, ['primary', 'secondary'], minor * 5, ['tertiary', 'minor'], 8, 4]];
const STREET_LAYERS = [
  { id: 'st-bg', type: 'background', paint: { 'background-color': '#202124' } },
  { id: 'st-green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]], paint: { 'fill-color': '#1f2a22', 'fill-opacity': 0.8 } },
  { id: 'st-park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#22311f', 'fill-opacity': 0.9 } },
  { id: 'st-water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#15233a' } },
  { id: 'st-casing', type: 'line', source: 'omt', 'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0f0f11', 'line-width': ROAD_W(5.5, 4.5), 'line-gap-width': 0 } },
  { id: 'st-road', type: 'line', source: 'omt', 'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#a08a66', ['primary', 'secondary'], '#646a75', ['tertiary'], '#4d5159', '#3d4047'], 'line-width': ROAD_W(4.5, 3.5) } },
  { id: 'st-rail', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'],
    paint: { 'line-color': '#5b5b66', 'line-width': 1.2, 'line-dasharray': [3, 2] } },
];
const LABEL_LAYERS = [
  { id: 'lbl-road', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 12.5,
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
    layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12.5, 10, 17, 13], 'text-letter-spacing': 0.04, 'text-max-angle': 30 },
    paint: { 'text-color': '#e4dfd5', 'text-halo-color': 'rgba(0,0,0,.9)', 'text-halo-width': 1.5 } },
  { id: 'lbl-place', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 10,
    filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter', 'village', 'town', 'city']]],
    layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Bold'],
      'text-size': ['match', ['get', 'class'], ['city', 'town'], 15, 11.5], 'text-transform': 'uppercase', 'text-letter-spacing': 0.12 },
    paint: { 'text-color': '#9d988e', 'text-halo-color': 'rgba(0,0,0,.85)', 'text-halo-width': 1.2 } },
  { id: 'lbl-metro', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 12.5,
    filter: ['in', ['get', 'class'], ['literal', ['railway']]],
    layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 0.8] },
    paint: { 'text-color': '#8fb4ff', 'text-halo-color': 'rgba(0,0,0,.85)', 'text-halo-width': 1.2 } },
];

export function addBaseLayers(map) {
  for (const l of STREET_LAYERS) map.addLayer({ ...l, layout: { ...(l.layout || {}), visibility: 'none' } }, 'city');
  for (const l of LABEL_LAYERS) map.addLayer(l); // names sit above everything, including societies
}

const LIGHT = { // Google-like day map
  'st-bg': { 'background-color': '#f5f3ef' }, 'st-green': { 'fill-color': '#d8ead2' }, 'st-park': { 'fill-color': '#c8e6c4' },
  'st-water': { 'fill-color': '#aadaff' }, 'st-casing': { 'line-color': '#d6d3cd' },
  'st-road': { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#fbd277', ['primary', 'secondary'], '#ffffff', '#ffffff'] },
  'st-rail': { 'line-color': '#b0aeb8' },
  'lbl-road': { 'text-color': '#4d5156', 'text-halo-color': '#ffffff' }, 'lbl-place': { 'text-color': '#5f6368', 'text-halo-color': '#ffffff' },
  'lbl-metro': { 'text-color': '#1a73e8', 'text-halo-color': '#ffffff' },
};
const DARK = {
  'st-bg': { 'background-color': '#202124' }, 'st-green': { 'fill-color': '#1f2a22' }, 'st-park': { 'fill-color': '#22311f' },
  'st-water': { 'fill-color': '#15233a' }, 'st-casing': { 'line-color': '#0f0f11' },
  'st-road': { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#a08a66', ['primary', 'secondary'], '#646a75', ['tertiary'], '#4d5159', '#3d4047'] },
  'st-rail': { 'line-color': '#5b5b66' },
  'lbl-road': { 'text-color': '#e4dfd5', 'text-halo-color': 'rgba(0,0,0,.9)' }, 'lbl-place': { 'text-color': '#9d988e', 'text-halo-color': 'rgba(0,0,0,.85)' },
  'lbl-metro': { 'text-color': '#8fb4ff', 'text-halo-color': 'rgba(0,0,0,.85)' },
};

export function setBaseMode(map, mode) {
  const streetsLike = mode !== 'night';
  const light = mode === 'light';
  for (const l of STREET_LAYERS) map.setLayoutProperty(l.id, 'visibility', streetsLike ? 'visible' : 'none');
  map.setLayoutProperty('sat', 'visibility', streetsLike ? 'none' : 'visible');
  map.setLayoutProperty('roads', 'visibility', streetsLike ? 'none' : 'visible');
  map.setLayoutProperty('lbl-metro', 'visibility', streetsLike ? 'visible' : 'none');
  for (const [id, props] of Object.entries(light ? LIGHT : DARK)) for (const [k, v] of Object.entries(props)) map.setPaintProperty(id, k, v);
  const c = PALETTES[mode];
  map.setPaintProperty('city', 'fill-extrusion-color', c.city);
  for (const [id, prop] of [['bld', 'fill-extrusion-color'], ['site-fill', 'fill-color'], ['site-line', 'line-color'], ['glow', 'circle-color']]) map.setPaintProperty(id, prop, colorBy(c));
  map.setPaintProperty('labels', 'text-color', c.label);
  map.setPaintProperty('labels', 'text-halo-color', c.halo);
  map.setPaintProperty('glow', 'circle-opacity', ['match', ['feature-state', 'st'], 'no', 0, light ? 0.28 : 0.5]);
  map.setPaintProperty('site-fill', 'fill-opacity', ['match', ['feature-state', 'st'], 'no', light ? 0.04 : 0.02, light ? 0.22 : 0.13]);
  map.setSky(light ? SKY.light : SKY.night);
}
