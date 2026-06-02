import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ListChecks, Search, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import PropertyCard from '../components/PropertyCard';
import { propertyService } from '../services/propertyService';

const COMPARE_KEY = 'estatehub.compareProperties';
const RECENT_SEARCHES_KEY = 'estatehub.recentSearches';
const MAX_COMPARE = 3;

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

const buildCompareEntry = (property) => ({
  id: String(property.id),
  title: property.title,
  price: property.price,
  bhk: property.bhk,
  area: property.area,
  locality: property.locality,
  city: property.city,
  location: property.location,
  type: property.type,
  status: property.status,
  dealer: property.dealer,
  amenities: property.raw?.amenities || [],
  image: property.image,
  postedByType: property.raw?.postedByType || property.raw?.role,
});

const WishlistPage = ({ savedPropertyIds, onToggleSave }) => {
  const navigate = useNavigate();
  const [savedProperties, setSavedProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [compareList, setCompareList] = useState(() => readStorage(COMPARE_KEY, []));
  const [compareError, setCompareError] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => readStorage(RECENT_SEARCHES_KEY, []));

  const compareIds = useMemo(
    () => new Set(compareList.map((item) => String(item.id))),
    [compareList],
  );

  useEffect(() => {
    let isActive = true;

    const fetchSavedProperties = async () => {
      setLoading(true);
      setError('');

      try {
        const { properties } = await propertyService.getSavedProperties({ limit: 200 });
        if (!isActive) return;
        setSavedProperties(properties || []);
      } catch (err) {
        if (!isActive) return;
        const message = err?.response?.data?.message || 'Unable to load saved properties.';
        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchSavedProperties();

    return () => {
      isActive = false;
    };
  }, []);

  const updateCompareList = (nextList) => {
    setCompareList(nextList);
    writeStorage(COMPARE_KEY, nextList);
  };

  const removeFromCompare = (propertyId) => {
    const nextList = compareList.filter((item) => item.id !== String(propertyId));
    updateCompareList(nextList);
  };

  const handleWishlistToggle = (property) => {
    onToggleSave?.(property);
    setSavedProperties((prev) => prev.filter((item) => item.id !== property.id));
    removeFromCompare(property.id);
  };

  const handleToggleCompare = (property) => {
    setCompareError('');
    const propertyId = String(property.id);

    if (compareIds.has(propertyId)) {
      removeFromCompare(propertyId);
      return;
    }

    if (compareList.length >= MAX_COMPARE) {
      setCompareError(`You can compare up to ${MAX_COMPARE} properties.`);
      return;
    }

    updateCompareList([...compareList, buildCompareEntry(property)]);
  };

  const handleCompareNow = () => {
    navigate('/compare');
  };

  const handleRunSearch = (filters) => {
    navigate('/listings', { state: { filters } });
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    writeStorage(RECENT_SEARCHES_KEY, []);
  };

  const compareCountLabel = compareList.length
    ? `${compareList.length} selected`
    : 'No properties selected';

  return (
    <div className="pt-28 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2">Your Collections</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            Saved Properties
          </h1>
          <p className="text-slate-500 mt-3">
            Track your favorite listings, compare options, and revisit recent searches.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            icon={<ListChecks className="w-4 h-4" />}
            onClick={handleCompareNow}
            disabled={compareList.length < 2}
          >
            Compare Selected
          </Button>
          <Button
            variant="primary"
            icon={<Heart className="w-4 h-4" />}
            onClick={() => navigate('/listings')}
          >
            Explore Listings
          </Button>
        </div>
      </div>

      {compareError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {compareError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-900">Your Wishlist</h2>
            <span className="text-sm font-semibold text-slate-500">
              {savedProperties.length} saved
            </span>
          </div>

          {loading && (
            <div className="text-slate-400 font-semibold">Loading saved properties...</div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {error}
            </div>
          )}

          {!loading && !error && savedProperties.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-8 py-10 text-center">
              <p className="text-lg font-semibold text-slate-600">No saved properties yet.</p>
              <p className="text-sm text-slate-500 mt-2">Tap the heart icon on any listing to save it here.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {savedProperties.map((property) => {
              const isSelected = compareIds.has(String(property.id));

              return (
                <div key={property.id} className="space-y-4">
                  <PropertyCard
                    property={property}
                    onClick={() => navigate(`/property/${property.id}`)}
                    isSaved={savedPropertyIds?.has(String(property.id))}
                    onToggleSave={handleWishlistToggle}
                  />
                  <div className="flex items-center justify-between px-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCompare(property)}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      Compare
                    </label>
                    <button
                      onClick={() => handleWishlistToggle(property)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Compare</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">Your shortlist</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">{compareCountLabel}</span>
            </div>

            <div className="space-y-4">
              {compareList.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.price}</p>
                  </div>
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="text-xs font-semibold text-slate-400 hover:text-rose-500"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {compareList.length === 0 && (
              <p className="text-sm text-slate-500">
                Select up to {MAX_COMPARE} properties to compare side by side.
              </p>
            )}

            {compareList.length > 0 && (
              <Button
                variant="primary"
                className="w-full mt-6"
                onClick={handleCompareNow}
                icon={<ListChecks className="w-4 h-4" />}
              >
                Compare Now
              </Button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Recent Searches</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">Jump back in</h3>
              </div>
              {recentSearches.length > 0 && (
                <button
                  onClick={handleClearRecent}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
            </div>

            {recentSearches.length === 0 && (
              <p className="text-sm text-slate-500">No recent searches yet. Use the hero search to start exploring.</p>
            )}

            <div className="space-y-4">
              {recentSearches.map((search) => (
                <div key={search.id} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{search.label}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(search.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="!px-4 !py-2"
                    onClick={() => handleRunSearch(search.filters)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
