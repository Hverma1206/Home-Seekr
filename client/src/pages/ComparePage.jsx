import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';

const COMPARE_KEY = 'estatehub.compareProperties';

const readStorage = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const ComparePage = () => {
  const navigate = useNavigate();
  const [compareList, setCompareList] = useState(() => readStorage(COMPARE_KEY, []));

  const columns = compareList.length;

  const comparisonRows = useMemo(() => ([
    { label: 'Price', value: (property) => property.price || 'N/A' },
    { label: 'Configuration', value: (property) => property.bhk || 'N/A' },
    { label: 'Area', value: (property) => property.area || 'N/A' },
    { label: 'Property Type', value: (property) => property.type || 'N/A' },
    { label: 'Location', value: (property) => property.location || `${property.locality || ''}${property.city ? `, ${property.city}` : ''}` },
    { label: 'Listed By', value: (property) => property.postedByType || property.dealer || 'N/A' },
    { label: 'Status', value: (property) => property.status || 'N/A' },
    {
      label: 'Top Amenities',
      value: (property) => property.amenities?.length
        ? property.amenities.slice(0, 4).join(', ')
        : 'N/A',
    },
  ]), []);

  const handleRemove = (propertyId) => {
    const nextList = compareList.filter((item) => item.id !== String(propertyId));
    setCompareList(nextList);
    writeStorage(COMPARE_KEY, nextList);
  };

  const handleClear = () => {
    setCompareList([]);
    writeStorage(COMPARE_KEY, []);
  };

  if (!compareList.length) {
    return (
      <div className="pt-28 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-8 py-16 text-center">
          <h1 className="text-3xl font-black text-slate-900">No properties to compare</h1>
          <p className="text-slate-500 mt-3">Add listings from your wishlist to compare them here.</p>
          <Button variant="primary" className="mt-6" onClick={() => navigate('/wishlist')}>
            Back to Wishlist
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2">Compare</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            Property Comparison
          </h1>
          <p className="text-slate-500 mt-3">Review key differences before making a decision.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/wishlist')}>
            Back to Wishlist
          </Button>
          <Button variant="primary" icon={<Trash2 className="w-4 h-4" />} onClick={handleClear}>
            Clear All
          </Button>
        </div>
      </div>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {compareList.map((property) => (
          <div key={property.id} className="rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="h-48 w-full overflow-hidden">
              <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">{property.type}</p>
              <h3 className="text-xl font-black text-slate-900 line-clamp-2">{property.title}</h3>
              <p className="text-lg font-bold text-emerald-600">{property.price}</p>
              <p className="text-sm text-slate-500">{property.location}</p>
              <Button
                variant="secondary"
                className="!px-4 !py-2"
                onClick={() => navigate(`/property/${property.id}`)}
              >
                View details
              </Button>
              <button
                onClick={() => handleRemove(property.id)}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-4">
        {comparisonRows.map((row) => (
          <div
            key={row.label}
            className="grid gap-4 items-start"
            style={{ gridTemplateColumns: `200px repeat(${columns}, minmax(0, 1fr))` }}
          >
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold pt-2">
              {row.label}
            </div>
            {compareList.map((property) => (
              <div key={`${row.label}-${property.id}`} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                {row.value(property)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparePage;
