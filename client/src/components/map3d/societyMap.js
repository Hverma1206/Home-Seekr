// 3D society map engine, ported from flat-finder's map.js and geo.py. Only the rendering lives here:
// every society, price and listing comes from our own API (GET /api/societies).
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export const SOCIETY_LAYERS = ['pill-sel', 'pill-hover', 'pill', 'labels', 'win', 'bld', 'site-fill', 'dot'];
export const BASE_MODES = ['light', 'night', 'streets'];
export const BASE_MODE_LABELS = { light: 'Day', night: 'Satellite', streets: 'Dark' };

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
// A handful of mapped buildings is not the whole society (OpenStreetMap is patchy in new sectors): keep the models then.
// Fanned-out societies are skipped too, because the buildings around their shared point are not theirs.
const hasRealBuildings = (s) => s.buildings?.b.length >= 4 && !s.spread;
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
// Centre on the buildings themselves (the median ignores a stray neighbour), not on where the listings put the pin
const onBuildings = (s) => {
  if (!hasRealBuildings(s)) return s;
  const { c: [lng, lat], b } = s.buildings;
  const mid = (axis) => median(b.map(({ r }) => r.reduce((a, p) => a + p[axis], 0) / r.length));
  return { ...s, lng: lng + mid(0) / mPerDegLng(lat), lat: lat + mid(1) / M_PER_DEG_LAT };
};

// Sector-level coordinates put several societies on one point: fan them out on a ring so each is clickable.
// Fanned-out ones are flagged, because the real buildings around the shared point are not theirs.
export const placeSocieties = (societies) => {
  const groups = new Map();
  for (const s of societies) {
    const key = `${s.lng.toFixed(4)},${s.lat.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const placed = [];
  for (const group of groups.values()) {
    if (group.length === 1) { placed.push(onBuildings(group[0])); continue; }
    const ringM = 200 + 45 * group.length;
    const offset = (hashString(group[0].id) % 360) * (Math.PI / 180);
    group.forEach((s, i) => {
      const a = offset + (2 * Math.PI * i) / group.length;
      placed.push({
        ...s,
        spread: true,
        lng: s.lng + (ringM * Math.cos(a)) / mPerDegLng(s.lat),
        lat: s.lat + (ringM * Math.sin(a)) / M_PER_DEG_LAT,
      });
    });
  }
  return placed;
};

const FLOOR_M = 3.2;
const centroidOf = (ring) => {
  const pts = ring.slice(0, -1);
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
};
// Grow (or shrink) an outline about its centre by `m` metres: window bands sit just proud of the wall
const grow = (ring, m) => {
  const [cx, cy] = centroidOf(ring);
  const k = mPerDegLng(cy);
  const r = ring.slice(0, -1).reduce((a, [x, y]) => a + Math.hypot((x - cx) * k, (y - cy) * M_PER_DEG_LAT), 0) / (ring.length - 1);
  const f = Math.max(0.05, 1 + m / Math.max(r, 1));
  return ring.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
};
const shrinkTo = (ring, f) => {
  const [cx, cy] = centroidOf(ring);
  return ring.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
};
const areaM2 = (ring) => {
  const k = mPerDegLng(ring[0][1]);
  return Math.abs(ring.slice(0, -1).reduce((sum, [x1, y1], i) => {
    const [x2, y2] = ring[i + 1];
    return sum + (x1 * k) * (y2 * M_PER_DEG_LAT) - (x2 * k) * (y1 * M_PER_DEG_LAT);
  }, 0)) / 2;
};

// Real outlines from OpenStreetMap (sent by the API in metres from a centre), as closed lng/lat rings
const realOutlines = (s) => {
  const { c: [lng, lat], b } = s.buildings;
  const k = mPerDegLng(lat);
  return b.map(({ r, l }) => {
    const ring = r.map(([dx, dy]) => [lng + dx / k, lat + dy / M_PER_DEG_LAT]);
    return { ring: [...ring, ring[0]], levels: l };
  });
};

// Floors for one building: the listed count where OSM or our listings have it, otherwise what the footprint suggests
const floorsFor = (s, ring, levels, rnd) => {
  if (levels) return levels;
  const area = areaM2(ring);
  const tower = (s.tall || s.project) && s.kind !== 'area' && area >= 280;
  if (tower) return s.floors || 12 + Math.floor(rnd() * 14);
  if (s.kind === 'area' || !s.tall) return area > 120 ? 4 : 2 + Math.floor(rnd() * 2); // builder floors and houses
  return 2 + Math.floor(rnd() * 3); // club house, shops, services inside a society
};

// One building = a wall colour block, a window band per floor (towers only, shown close up) and a rooftop room
const addBuilding = (shapes, sid, ring, floors, rnd) => {
  const h = floors * FLOOR_M + 1;
  const tint = Math.floor(rnd() * 4);
  // Drawn 0.4 m wider than OpenStreetMap's own copy so the two never flicker against each other
  shapes.push({ type: 'Feature', properties: { sid, role: 'bld', h, tint }, geometry: { type: 'Polygon', coordinates: [grow(ring, 0.4)] } });
  if (floors < 6) return;
  const bands = grow(ring, 0.75);
  for (let i = 0; i < floors; i += 1) {
    shapes.push({ type: 'Feature', properties: { sid, role: 'win', base: i * FLOOR_M + 0.95, top: i * FLOOR_M + 2.55, lit: rnd() < 0.32 ? 1 : 0 },
      geometry: { type: 'Polygon', coordinates: [bands] } });
  }
  shapes.push({ type: 'Feature', properties: { sid, role: 'bld', base: h, h: h + 3.4, tint }, geometry: { type: 'Polygon', coordinates: [shrinkTo(ring, 0.32)] } });
};

export const buildSocietyGeoJSON = (societies) => {
  const shapes = [];
  const points = [];
  for (const s of societies) {
    const center = [s.lng, s.lat];
    const rnd = seeded(hashString(s.id));
    const real = hasRealBuildings(s) ? realOutlines(s) : null;
    // The site ring wraps the real buildings when we have them
    const r = real
      ? Math.min(200, Math.max(60, ...real.map(({ ring }) => {
        const [x, y] = centroidOf(ring);
        return Math.hypot((x - s.lng) * mPerDegLng(s.lat), (y - s.lat) * M_PER_DEG_LAT) + 20;
      })))
      : siteRadius(s);
    shapes.push({ type: 'Feature', properties: { sid: s.id, role: 'site' }, geometry: { type: 'Polygon', coordinates: [circle(center, r)] } });
    // Tag text: the starting price without "from"; more homes = placed first when tags would overlap
    const pill = (s.priceLabel || '').replace(/^from /, '').replace('Price on request', 'On request');
    points.push({ type: 'Feature', properties: { sid: s.id, name: s.name, pill, rank: -(s.buy.count + s.rent.count) }, geometry: { type: 'Point', coordinates: center } });

    if (real) {
      for (const { ring, levels } of real) addBuilding(shapes, s.id, ring, floorsFor(s, ring, levels, rnd), rnd);
      continue;
    }
    if (s.plot) continue; // plots: just the site outline

    // No mapped buildings: illustrative towers spread over the site
    const count = s.kind === 'area'
      ? 8
      : s.project
        ? s.project.towers || Math.max(3, Math.min(10, Math.round((s.project.totalUnits || 480) / 120)))
        : 3 + Math.floor(rnd() * 4);
    const [w, d] = s.tall ? [26, 20] : [13, 11];
    for (const ring of generateTowers(center, r, count, rnd, w, d)) {
      const floors = s.tall ? s.floors || 14 + Math.floor(rnd() * 10) : 3 + Math.floor(rnd() * 2);
      addBuilding(shapes, s.id, ring, floors, rnd);
    }
  }
  return {
    shapes: { type: 'FeatureCollection', features: shapes },
    points: { type: 'FeatureCollection', features: points },
  };
};

// ---------- map style ----------
// Mode ids stay as first shipped ('night' is Satellite) because visitors' saved choice uses them
const atmosphere = ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 0];
const SKY = {
  // Daylight haze for the aerial view: the far ground fades into the horizon like a real photo, which gives depth
  night: { 'sky-color': '#5f93cf', 'horizon-color': '#dbe6ef', 'fog-color': '#cfdae4', 'sky-horizon-blend': 0.55, 'horizon-fog-blend': 0.75, 'fog-ground-blend': 0.45, 'atmosphere-blend': atmosphere },
  light: { 'sky-color': '#cfe3f5', 'horizon-color': '#eef3f7', 'fog-color': '#f5f3ef', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.3, 'atmosphere-blend': atmosphere },
  streets: { 'sky-color': '#07080b', 'horizon-color': '#1a1712', 'fog-color': '#0c0d10', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.3, 'atmosphere-blend': atmosphere },
};

export function createMap(container) {
  const map = new maplibregl.Map({
    container,
    attributionControl: { compact: true },
    center: [78.5, 22.5],
    zoom: 2.2,
    pitch: 0,
    bearing: 0,
    maxPitch: 75,
    // Right-drag (or two fingers) tilts and turns the city; the compass button puts north back up
    style: {
      version: 8,
      projection: { type: 'globe' },
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sky: SKY.light,
      // Sun from the south-west, fixed to the ground, so towers keep a lit and a shaded side as the city turns
      light: { anchor: 'map', color: '#ffffff', intensity: 0.42, position: [1.3, 215, 38] },
      sources: {
        sat: { type: 'raster', tileSize: 256, maxzoom: 18, attribution: 'Imagery © Esri',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'] },
        omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenStreetMap contributors · OpenFreeMap' },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#f5f3ef' } },
        { id: 'sat', type: 'raster', source: 'sat' },
        { id: 'city', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13,
          paint: { 'fill-extrusion-color': '#dcd7ce', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-vertical-gradient': true } },
      ],
    },
  });
  watchStreetTiles(map);
  return map;
}

// "You are here": a Google-style blue dot with a soft halo (same as flat-finder's)
export function showYou(map, lngLat, existing) {
  if (existing) return existing.setLngLat(lngLat);
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Your location');
  Object.assign(el.style, {
    width: '18px', height: '18px', borderRadius: '50%', background: '#4285f4', border: '3px solid #fff',
    boxShadow: '0 0 0 10px rgba(66, 133, 244, .28), 0 1px 4px rgba(0, 0, 0, .4)',
  });
  return new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
}

// ---------- price tag ----------
// A rounded tag with a small tail and a soft shadow, drawn once per colour. The stretch zones let MapLibre widen it to fit
// any price while the corners and tail keep their shape. (Plain images, not SDF: MapLibre 5.6 misplaces stretched SDF icons.)
const TAGS = { tag: ['#ffffff', '#0f172a'], 'tag-hover': ['#0f172a', '#ffffff'], 'tag-sel': ['#059669', '#ffffff'] };
// Small light dot for a society whose tag has no room at this zoom
const miniDot = () => {
  const pr = 2; const size = 12;
  const canvas = document.createElement('canvas');
  canvas.width = size * pr;
  canvas.height = size * pr;
  const ctx = canvas.getContext('2d');
  ctx.scale(pr, pr);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 3.5, 0, 2 * Math.PI);
  Object.assign(ctx, { shadowColor: 'rgba(15,23,42,.35)', shadowBlur: 3, fillStyle: '#ffffff', strokeStyle: 'rgba(15,23,42,.35)', lineWidth: 1 });
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  return [ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: pr }];
};
const priceTag = (fill) => {
  const pr = 2; const m = 7; const r = 10; const s = 2; const tail = 12; const tailH = 6;
  const W = 2 * (m + r + s) + tail; const H = m + 2 * r + s + tailH + m;
  const x0 = m; const x1 = W - m; const y0 = m; const y1 = m + 2 * r + s; const cx = W / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * pr;
  canvas.height = H * pr;
  const ctx = canvas.getContext('2d');
  ctx.scale(pr, pr);
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x1, y0, x1, y1, r);
  ctx.arcTo(x1, y1, x0, y1, r);
  ctx.lineTo(cx + tail / 2, y1);
  ctx.lineTo(cx, y1 + tailH);
  ctx.lineTo(cx - tail / 2, y1);
  ctx.arcTo(x0, y1, x0, y0, r);
  ctx.arcTo(x0, y0, x1, y0, r);
  ctx.closePath();
  Object.assign(ctx, { shadowColor: 'rgba(15,23,42,.28)', shadowBlur: 6, shadowOffsetY: 1.5, fillStyle: fill });
  ctx.fill();
  if (fill === '#ffffff') {
    Object.assign(ctx, { shadowColor: 'transparent', strokeStyle: 'rgba(15,23,42,.12)', lineWidth: 1 });
    ctx.stroke();
  }
  const px = (v) => v * pr;
  return [ctx.getImageData(0, 0, canvas.width, canvas.height), {
    pixelRatio: pr,
    // Two equal stretch zones either side of the tail keep it centred however long the price is
    stretchX: [[px(m + r), px(m + r + s)], [px(W - m - r - s), px(W - m - r)]],
    stretchY: [[px(y0 + r), px(y0 + r + s)]],
    content: [px(x0 + 3), px(y0 + 3), px(x1 - 3), px(y1 - 3)],
  }];
};

// ---------- societies ----------
// Buildings get real-world facade tones (four per style, picked per building) with glass window bands; the society you
// hover or pick turns crisp white, with an emerald ring and tag. "no" = filtered out, drawn like an ordinary building.
const PALETTES = {
  light: { walls: ['#f3eee6', '#ebe2d4', '#e9e7e2', '#f0e5d8'], glass: '#7f93a8', lit: '#8a9db1', hover: '#ffffff', sel: '#ffffff',
    no: '#dcd8d0', noGlass: '#cdc9c1', site: '#10b981', label: '#0f172a', halo: 'rgba(255,255,255,.95)', city: '#dcd7ce', cityOpacity: 0.9 },
  night: { walls: ['#eee8df', '#e3d8c8', '#e2e0db', '#eadfd0'], glass: '#5f7389', lit: '#6b7f95', hover: '#ffffff', sel: '#ffffff',
    no: '#a8a29e', noGlass: '#8c8680', site: '#34d399', label: '#ffffff', halo: 'rgba(0,0,0,.75)', city: '#f1f5f9', cityOpacity: 0.38 },
  streets: { walls: ['#9aa3ae', '#8f96a0', '#a19f99', '#968f86'], glass: '#1b2230', lit: '#f2c46d', hover: '#cbd5e1', sel: '#e2e8f0',
    no: '#3a3b41', noGlass: '#2c2d32', site: '#34d399', label: '#f1f5f9', halo: 'rgba(0,0,0,.85)', city: '#2c2d33', cityOpacity: 0.9 },
};
const SITE_FILL = ['case', ['==', ['feature-state', 'st'], 'no'], 0.03, ['any', ['boolean', ['feature-state', 'sel'], false], ['boolean', ['feature-state', 'hover'], false]], 0.22, 0.1];

const SEL = ['boolean', ['feature-state', 'sel'], false];
const HOVER = ['boolean', ['feature-state', 'hover'], false];
const OUT = ['==', ['feature-state', 'st'], 'no'];
const wallColor = (c) => ['case', OUT, c.no, SEL, c.sel, HOVER, c.hover, ['match', ['get', 'tint'], 0, c.walls[0], 1, c.walls[1], 2, c.walls[2], c.walls[3]]];
// Dark mode lights about a third of the windows
const glassColor = (c) => ['case', OUT, c.noGlass, ['==', ['get', 'lit'], 1], c.lit, c.glass];
// Site ring: emerald for every match, so only its fill strength marks hover and selection
const siteColor = (c) => ['case', OUT, c.no, c.site];
// Close in, tags float above the towers and names drop below the site, instead of both sitting on the buildings
const lift = (from, to) => ['interpolate', ['linear'], ['zoom'], 13.2, ['literal', [0, from]], 16, ['literal', [0, to]]];
// Towers rise as the pins fade, so the middle of a society is never covered by a dot
const TOWERS_IN = [13, 13.8];

export function addSocietyLayers(map, shapes, points) {
  const c = PALETTES.light;
  for (const [id, [fill]] of Object.entries(TAGS)) if (!map.hasImage(id)) map.addImage(id, ...priceTag(fill));
  if (!map.hasImage('mini-dot')) map.addImage('mini-dot', ...miniDot());
  map.addSource('shapes', { type: 'geojson', data: shapes, promoteId: 'sid', attribution: 'Building outlines © OpenStreetMap contributors' });
  map.addSource('pts', { type: 'geojson', data: points, promoteId: 'sid' });
  // The site ring comes in with the towers, so nothing marks the ground under a tag at city zoom
  map.addLayer({ id: 'site-fill', type: 'fill', source: 'shapes', minzoom: TOWERS_IN[0], filter: ['==', ['get', 'role'], 'site'],
    paint: { 'fill-color': siteColor(c), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], TOWERS_IN[0], 0, TOWERS_IN[1], SITE_FILL] } });
  map.addLayer({ id: 'site-line', type: 'line', source: 'shapes', minzoom: TOWERS_IN[0], filter: ['==', ['get', 'role'], 'site'],
    paint: { 'line-color': siteColor(c), 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 16, ['case', ['any', SEL, HOVER], 3, 1.6]],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], TOWERS_IN[0], 0, TOWERS_IN[1], ['case', OUT, 0.15, 0.9]] } });
  map.addLayer({ id: 'bld', type: 'fill-extrusion', source: 'shapes', minzoom: TOWERS_IN[0], filter: ['==', ['get', 'role'], 'bld'],
    paint: { 'fill-extrusion-color': wallColor(c), 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['coalesce', ['get', 'base'], 0],
      'fill-extrusion-vertical-gradient': true, 'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], TOWERS_IN[0], 0, TOWERS_IN[1], 1] } });
  // Window bands, one per floor, only close up: from further away they would shimmer
  map.addLayer({ id: 'win', type: 'fill-extrusion', source: 'shapes', minzoom: 14.4, filter: ['==', ['get', 'role'], 'win'],
    paint: { 'fill-extrusion-color': glassColor(c), 'fill-extrusion-height': ['get', 'top'], 'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-vertical-gradient': false, 'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 14.4, 0, 15.2, 1] } });
  // Only where a tag has no room: tags sit above it in the layer order, so a placed tag (tail included) always wins
  map.addLayer({ id: 'dot', type: 'symbol', source: 'pts', maxzoom: TOWERS_IN[1],
    layout: { 'icon-image': 'mini-dot', 'icon-padding': 0, 'symbol-sort-key': ['get', 'rank'] },
    paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], TOWERS_IN[0], ['case', OUT, 0.45, 1], TOWERS_IN[1], 0] } });
  // Society name under the pin
  map.addLayer({ id: 'labels', type: 'symbol', source: 'pts', minzoom: 12.8,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 11.5, 'text-anchor': 'top',
      'text-offset': lift(0.75, 2.6), 'text-max-width': 10, 'text-letter-spacing': 0.02, 'symbol-sort-key': ['get', 'rank'] },
    paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.5, 'text-opacity': ['case', OUT, 0.4, 1] } });
  // Price tag above the pin, Airbnb style. Images are layout properties, so the hovered and selected tags are their own
  // layers on top (filters set in refreshTags) rather than a colour switch
  for (const [id, [, text]] of Object.entries(TAGS)) {
    const active = id !== 'tag';
    map.addLayer({ id: active ? `pill-${id.slice(4)}` : 'pill', type: 'symbol', source: 'pts', minzoom: active ? 0 : 10.8,
      filter: active ? ['==', ['get', 'sid'], ''] : ['has', 'sid'],
      layout: { 'text-field': ['get', 'pill'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-anchor': 'bottom',
        'text-offset': lift(-1.1, -4.2), 'icon-image': id, 'icon-text-fit': 'both', 'icon-text-fit-padding': [2, 7, 2, 7],
        'symbol-sort-key': ['get', 'rank'], 'text-padding': 3, 'icon-allow-overlap': active, 'text-allow-overlap': active,
        // The hover and selected tags lie exactly over the white one without moving anything, so nothing blinks
        'icon-ignore-placement': active, 'text-ignore-placement': active },
      paint: { 'text-color': text } });
  }
}

const setBoth = (map, sid, state) => {
  for (const source of ['shapes', 'pts']) map.setFeatureState({ source, id: sid }, state);
};

// Which societies get a white tag (those that match the filters), and which one is hovered or selected
const tagState = new WeakMap();
const refreshTags = (map, patch) => {
  const t = { match: null, hover: null, sel: null, ...tagState.get(map), ...patch };
  tagState.set(map, t);
  // Filtered-out tags are removed, not hidden: invisible ones would still crowd out the ones that match
  if (patch.match) map.setFilter('pill', ['in', ['get', 'sid'], ['literal', t.match]]);
  map.setFilter('pill-hover', ['==', ['get', 'sid'], t.hover && t.hover !== t.sel ? t.hover : '']);
  map.setFilter('pill-sel', ['==', ['get', 'sid'], t.sel || '']);
};

export const setStates = (map, entries) => {
  for (const [sid, st] of entries) setBoth(map, sid, { st });
  refreshTags(map, { match: entries.filter(([, st]) => st !== 'no').map(([sid]) => sid) });
};
export const setFlag = (map, flag, sid, prev) => {
  if (prev) setBoth(map, prev, { [flag]: false });
  if (sid) setBoth(map, sid, { [flag]: true });
  refreshTags(map, { [flag]: sid || null });
};

// ---------- street maps: road and area names from OpenFreeMap vector tiles ----------
const ROAD_W = (major, minor) => ['interpolate', ['exponential', 1.5], ['zoom'], 10, ['match', ['get', 'class'], ['motorway', 'trunk'], major * 0.4, ['primary', 'secondary'], minor * 0.5, 0.3],
  17, ['match', ['get', 'class'], ['motorway', 'trunk'], major * 5, ['primary', 'secondary'], minor * 5, ['tertiary', 'minor'], 8, 4]];
// Ground fills sit under the imagery, roads on top of it
const GROUND_LAYERS = [
  { id: 'st-green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]], paint: { 'fill-opacity': 0.8 } },
  { id: 'st-park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-opacity': 0.9 } },
  { id: 'st-water', type: 'fill', source: 'omt', 'source-layer': 'water' },
];
const ROAD_LAYERS = [
  { id: 'st-casing', type: 'line', source: 'omt', 'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': ROAD_W(5.5, 4.5) } },
  { id: 'st-road', type: 'line', source: 'omt', 'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service']]],
    layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': ROAD_W(4.5, 3.5) } },
  { id: 'st-rail', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'],
    paint: { 'line-width': 1.2, 'line-dasharray': [3, 2] } },
];
const LABEL_LAYERS = [
  { id: 'lbl-road', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 12.5,
    filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
    layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12.5, 10, 17, 13], 'text-letter-spacing': 0.04, 'text-max-angle': 30 },
    paint: { 'text-halo-width': 1.5 } },
  { id: 'lbl-place', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 10,
    filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter', 'village', 'town', 'city']]],
    layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Bold'],
      'text-size': ['match', ['get', 'class'], ['city', 'town'], 15, 11.5], 'text-transform': 'uppercase', 'text-letter-spacing': 0.12 },
    paint: { 'text-halo-width': 1.2 } },
  { id: 'lbl-metro', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 12.5,
    filter: ['in', ['get', 'class'], ['literal', ['railway']]],
    layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 0.8] },
    paint: { 'text-halo-width': 1.2 } },
];

export function addBaseLayers(map) {
  for (const l of GROUND_LAYERS) map.addLayer(l, 'sat');
  for (const l of ROAD_LAYERS) map.addLayer(l, 'city');
  for (const l of LABEL_LAYERS) map.addLayer(l, 'dot'); // above the towers, below every society marker
  if (usingEsri.has(map)) addEsriLayers(map);
}

// Imagery per mode. Day and Dark keep a faded photo under the streets: in new sectors OpenStreetMap has few roads or
// buildings, and without it the map would be an empty sheet when zoomed in.
const fadeIn = (from, to, max) => ['interpolate', ['linear'], ['zoom'], from, 0, to, max];
const BASE = {
  light: {
    bg: { 'background-color': '#f5f3ef' },
    sat: { 'raster-opacity': fadeIn(12, 15, 0.5), 'raster-brightness-min': 0.55, 'raster-brightness-max': 1, 'raster-saturation': -0.8, 'raster-contrast': -0.1 },
    'st-green': { 'fill-color': '#d8ead2' }, 'st-park': { 'fill-color': '#c8e6c4' }, 'st-water': { 'fill-color': '#aadaff' },
    'st-casing': { 'line-color': '#cfcac1' }, 'st-rail': { 'line-color': '#b0aeb8' },
    'st-road': { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#fbd277', '#ffffff'] },
    'lbl-road': { 'text-color': '#4d5156', 'text-halo-color': '#ffffff' }, 'lbl-place': { 'text-color': '#5f6368', 'text-halo-color': '#ffffff' },
    'lbl-metro': { 'text-color': '#1a73e8', 'text-halo-color': '#ffffff' },
  },
  streets: {
    bg: { 'background-color': '#202124' },
    sat: { 'raster-opacity': fadeIn(11.5, 14.5, 0.55), 'raster-brightness-min': 0, 'raster-brightness-max': 0.38, 'raster-saturation': -0.9, 'raster-contrast': 0 },
    'st-green': { 'fill-color': '#1f2a22' }, 'st-park': { 'fill-color': '#22311f' }, 'st-water': { 'fill-color': '#15233a' },
    'st-casing': { 'line-color': '#0f0f11' }, 'st-rail': { 'line-color': '#5b5b66' },
    'st-road': { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#a08a66', ['primary', 'secondary'], '#646a75', ['tertiary'], '#4d5159', '#3d4047'] },
    'lbl-road': { 'text-color': '#e4dfd5', 'text-halo-color': 'rgba(0,0,0,.9)' }, 'lbl-place': { 'text-color': '#9d988e', 'text-halo-color': 'rgba(0,0,0,.85)' },
    'lbl-metro': { 'text-color': '#8fb4ff', 'text-halo-color': 'rgba(0,0,0,.85)' },
  },
  night: {
    bg: { 'background-color': '#0b0d10' },
    // Natural colour, lightly toned, so it reads as a real aerial photo
    sat: { 'raster-opacity': 1, 'raster-brightness-min': 0, 'raster-brightness-max': 0.95, 'raster-saturation': -0.12, 'raster-contrast': 0.08 },
    'lbl-road': { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,.8)' }, 'lbl-place': { 'text-color': '#f1f5f9', 'text-halo-color': 'rgba(0,0,0,.8)' },
  },
};

// ---------- fallback basemaps ----------
// OpenFreeMap's street tiles can be blocked by some browsers, extensions or networks, which leaves Day and Dark as an
// empty sheet. Esri serves the satellite photos, so its plain basemaps are the stand-in: [layer, service, mode, below]
const ESRI_BASEMAPS = [
  ['fb-light', 'Canvas/World_Light_Gray_Base', 'light', 'sat'],
  ['fb-dark', 'Canvas/World_Dark_Gray_Base', 'streets', 'sat'],
  ['fb-light-ref', 'Canvas/World_Light_Gray_Reference', 'light', 'site-fill'],
  ['fb-dark-ref', 'Canvas/World_Dark_Gray_Reference', 'streets', 'site-fill'],
  ['fb-places', 'Reference/World_Boundaries_and_Places', 'night', 'site-fill'],
];
const usingEsri = new WeakSet();
const modeOf = new WeakMap();
const streetWatch = new WeakMap();

const addEsriLayers = (map) => {
  for (const [id, service, , below] of ESRI_BASEMAPS) {
    if (map.getSource(id)) continue;
    map.addSource(id, { type: 'raster', tileSize: 256, maxzoom: 16, attribution: 'Basemap © Esri',
      tiles: [`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`] });
    map.addLayer({ id, type: 'raster', source: id, layout: { visibility: 'none' } }, below);
  }
};

const switchToEsri = (map) => {
  usingEsri.add(map);
  console.warn('3D map: street tiles from OpenFreeMap did not load, switching to Esri basemaps');
  // Before the society layers exist there is nothing to slot under yet; addBaseLayers picks it up then
  if (map.getLayer('site-fill')) {
    addEsriLayers(map);
    setBaseMode(map, modeOf.get(map) || 'light');
  }
};

// Watches from the moment the map is made, so an early failure is not missed. A failed index or three failed tiles
// before any arrive mean the tiles are blocked; requests that never answer are caught 12 s after the street layers go on.
// (MapLibre never reports 'idle' while a source is failing, so that event cannot be used for this.)
const watchStreetTiles = (map) => {
  const w = { done: false, failures: 0, timer: null };
  const finish = (ok) => {
    if (w.done) return;
    w.done = true;
    clearTimeout(w.timer);
    map.off('sourcedata', onData);
    map.off('error', onError);
    if (!ok) switchToEsri(map);
  };
  const onData = (e) => { if (e.sourceId === 'omt' && e.tile) finish(true); };
  const onError = (e) => {
    if (e.sourceId === 'omt' && (!map.getSource('omt')?.loaded() || ++w.failures >= 3)) finish(false);
  };
  map.on('sourcedata', onData);
  map.on('error', onError);
  // Day and Dark draw streets at every zoom, so no tile by then means none are coming; Satellite may simply not need any yet
  w.arm = () => {
    if (w.done || w.timer) return;
    w.timer = setTimeout(() => {
      try {
        if (!map.getSource('omt')?.loaded() || modeOf.get(map) !== 'night') finish(false);
      } catch { /* map was closed */ }
    }, 12000);
  };
  streetWatch.set(map, w);
};

export function setBaseMode(map, mode) {
  modeOf.set(map, mode);
  streetWatch.get(map)?.arm();
  const satellite = mode === 'night';
  const esri = usingEsri.has(map);
  for (const l of [...GROUND_LAYERS, ...ROAD_LAYERS]) map.setLayoutProperty(l.id, 'visibility', satellite || esri ? 'none' : 'visible');
  for (const l of LABEL_LAYERS) map.setLayoutProperty(l.id, 'visibility', esri || (satellite && l.id === 'lbl-metro') ? 'none' : 'visible');
  if (esri) for (const [id, , shownIn] of ESRI_BASEMAPS) map.setLayoutProperty(id, 'visibility', shownIn === mode ? 'visible' : 'none');
  // Day only needs the photo once zoomed in; skipping the tiles below that saves the download
  map.setLayerZoomRange('sat', mode === 'light' ? 11.8 : 0, 24);
  for (const [id, props] of Object.entries(BASE[mode])) for (const [k, v] of Object.entries(props)) map.setPaintProperty(id, k, v);

  const c = PALETTES[mode];
  map.setPaintProperty('city', 'fill-extrusion-color', c.city);
  map.setPaintProperty('city', 'fill-extrusion-opacity', fadeIn(13, 14, c.cityOpacity));
  map.setPaintProperty('bld', 'fill-extrusion-color', wallColor(c));
  map.setPaintProperty('win', 'fill-extrusion-color', glassColor(c));
  map.setPaintProperty('site-fill', 'fill-color', siteColor(c));
  map.setPaintProperty('site-line', 'line-color', siteColor(c));
  map.setPaintProperty('labels', 'text-color', c.label);
  map.setPaintProperty('labels', 'text-halo-color', c.halo);
  map.setSky(SKY[mode]);
}
