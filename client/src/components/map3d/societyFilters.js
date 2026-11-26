// Filtering and labels for the 3D society map. Filters apply per listing, so "2 BHK under ₹50K rent" means
// one home that is all of those, not a society that has a 2 BHK somewhere and a cheap rental somewhere else.
import { formatPrice } from '../../services/propertyService';

export const MODES = [
  { id: 'all', label: 'All' },
  { id: 'buy', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'projects', label: 'Projects' },
];

export const BUDGETS = {
  buy: [
    { id: 'b1', label: 'Under ₹1 Cr', max: 1e7 },
    { id: 'b2', label: '₹1 – 3 Cr', min: 1e7, max: 3e7 },
    { id: 'b3', label: '₹3 – 5 Cr', min: 3e7, max: 5e7 },
    { id: 'b4', label: '₹5 – 10 Cr', min: 5e7, max: 1e8 },
    { id: 'b5', label: '₹10 Cr+', min: 1e8 },
  ],
  rent: [
    { id: 'r1', label: 'Under ₹25K', max: 25000 },
    { id: 'r2', label: '₹25K – 50K', min: 25000, max: 50000 },
    { id: 'r3', label: '₹50K – 1 L', min: 50000, max: 100000 },
    { id: 'r4', label: '₹1 L+', min: 100000 },
  ],
};
BUDGETS.projects = BUDGETS.buy;

export const TYPES = ['Apartment', 'Builder floor', 'House / Villa', 'Plot'];

export const SORTS = [
  { id: 'relevant', label: 'Most homes' },
  { id: 'price', label: 'Price: low to high' },
  { id: 'name', label: 'Name' },
];

export const EMPTY_FILTERS = { mode: 'all', query: '', bhks: [], types: [], budget: '' };

export const isRental = (l) => l.lookingTo === 'rent' || l.lookingTo === 'pg';
export const typeOf = (selectedType = '') => {
  if (/plot|land/i.test(selectedType)) return 'Plot';
  if (/builder floor/i.test(selectedType)) return 'Builder floor';
  if (/villa|house/i.test(selectedType)) return 'House / Villa';
  return 'Apartment';
};
// "3 BHK + Servant" and "3 BHK + Study" filter as "3 BHK"; cards keep the full label
export const bhkBase = (b = '') => (/rk/i.test(b) ? '1 RK' : parseFloat(b) ? `${parseFloat(b)} BHK` : '');
export const bhkOrder = (b) => (/rk/i.test(b) ? 0.5 : parseFloat(b) || 99);

export const money = (n) => (n ? formatPrice(String(Math.round(n))) : '');
// Compact form for map labels: ₹3.15 Cr, ₹85 L, ₹45K
export const shortMoney = (n) => {
  if (!n) return '';
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(1)} L`;
  return `₹${Math.round(n / 1000)}K`;
};
export const rangeText = (min, max, suffix = '') => {
  if (!min) return 'Price on request';
  return `${!max || min === max ? money(min) : `${money(min)} – ${money(max)}`}${suffix}`;
};

const budgetOf = (filters) => (BUDGETS[filters.mode] || []).find((b) => b.id === filters.budget) || null;
const inBudget = (price, budget) => !budget || (price && price >= (budget.min || 0) && price <= (budget.max || Infinity));

const listingMatches = (l, filters, budget) =>
  (filters.mode === 'all' || (filters.mode === 'buy' && !isRental(l)) || (filters.mode === 'rent' && isRental(l)))
  && (!filters.bhks.length || filters.bhks.includes(bhkBase(l.bhk)))
  && (!filters.types.length || filters.types.includes(typeOf(l.type)))
  && inBudget(l.price, budget);

const projectMatches = (s, filters, budget) => {
  const p = s.project;
  if (!p || filters.mode === 'rent') return false;
  if (filters.bhks.length && !p.configurations.some((c) => filters.bhks.includes(bhkBase(c.type)))) return false;
  if (filters.types.length && !filters.types.includes('Apartment')) return false;
  if (!budget) return true;
  // Overlap of the project's price range with the budget band
  return Boolean(p.priceMin) && p.priceMin <= (budget.max || Infinity) && (p.priceMax || p.priceMin) >= (budget.min || 0);
};

// Societies that pass the filters, each with the ids of its matching homes
export const filterSocieties = (societies, filters) => {
  const budget = budgetOf(filters);
  const q = filters.query.trim().toLowerCase();
  const out = [];
  for (const s of societies) {
    if (q && !`${s.name} ${s.locality}`.toLowerCase().includes(q)) continue;
    const homes = filters.mode === 'projects' ? [] : s.listings.filter((l) => listingMatches(l, filters, budget));
    const project = projectMatches(s, filters, budget);
    if (homes.length || project) out.push({ society: s, homeIds: new Set(homes.map((l) => l.id)), project });
  }
  return out;
};

export const lowestPrice = (s) => {
  const buys = s.listings.filter((l) => !isRental(l) && l.price).map((l) => l.price);
  if (buys.length) return Math.min(...buys);
  return s.project?.priceMin || null;
};

// Price shown under the name on the map and on result cards
export const priceLabel = (s) => {
  const buy = lowestPrice(s);
  if (buy) return `from ${shortMoney(buy)}`;
  const rents = s.listings.filter((l) => isRental(l) && l.price).map((l) => l.price);
  if (rents.length) return `${shortMoney(Math.min(...rents))}/mo`;
  return 'Price on request';
};

export const sortResults = (results, sort) => {
  const list = [...results];
  if (sort === 'name') return list.sort((a, b) => a.society.name.localeCompare(b.society.name));
  if (sort === 'price') {
    const key = (r) => lowestPrice(r.society) ?? Infinity;
    return list.sort((a, b) => key(a) - key(b));
  }
  return list.sort((a, b) => b.homeIds.size - a.homeIds.size || Number(b.project) - Number(a.project));
};

export const activeFilterCount = (f) => f.bhks.length + f.types.length + (f.budget ? 1 : 0);
