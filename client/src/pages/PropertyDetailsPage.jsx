import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Building, Heart, Share2, BedDouble, Maximize, 
  Star, ChevronLeft, TrendingUp
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PropertyCard from '../components/PropertyCard';
import { propertyService } from '../services/propertyService';
import { leadService } from '../services/leadService';
import { localityService } from '../services/localityService';
import { useAuth } from '../hooks/useAuth';

const parseINRValue = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/,/g, '').trim();
  const match = cleaned.match(/[0-9.]+/);
  if (!match) return null;
  const numeric = Number(match[0]);
  if (!Number.isFinite(numeric)) return null;

  if (/cr/i.test(cleaned)) return numeric * 10000000;
  if (/lakh|lac/i.test(cleaned)) return numeric * 100000;
  if (/k/i.test(cleaned)) return numeric * 1000;
  return numeric;
};

const buildTrendPoints = (series, width = 280, height = 90, padding = 12) => {
  if (!Array.isArray(series) || series.length < 2) {
    return { points: '', min: 0, max: 0, width, height, padding };
  }

  const values = series
    .map((item) => Number(item.averagePrice ?? item.avgPrice ?? item.price ?? item.value))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return { points: '', min: 0, max: 0, width, height, padding };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = padding + step * index;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return { points, min, max, width, height, padding };
};

const PropertyDetailsPage = ({
  property,
  onBack,
  onPropertySelect,
  savedPropertyIds,
  onToggleSave,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { propertyId: routePropertyId } = useParams();
  const resolvedPropertyId = property?.id || property?._id || property?.raw?._id || routePropertyId;
  const [details, setDetails] = useState(property || null);
  const [localityInsights, setLocalityInsights] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [priceTrend, setPriceTrend] = useState([]);
  const [trendMeta, setTrendMeta] = useState({ currentAvgPrice: 0, growthMetrics: {} });
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [leadStatus, setLeadStatus] = useState({ loading: false, message: '', error: '' });
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);

  useEffect(() => {
    let isActive = true;

    const fetchPropertyDetails = async () => {
      if (!resolvedPropertyId) return;

      setIsLoading(true);
      setPageError('');

      try {
        const {
          property: fetchedProperty,
          localityInsights: insights,
          similarProperties: similar,
          reviews: fetchedReviews,
        } =
          await propertyService.getPropertyDetails(resolvedPropertyId);

        if (!isActive) return;

        if (fetchedProperty) {
          setDetails(fetchedProperty);
        }
        setLocalityInsights(insights || null);
        setSimilarProperties(Array.isArray(similar) ? similar : []);
        setReviews(Array.isArray(fetchedReviews) ? fetchedReviews : []);
      } catch (error) {
        if (!isActive) return;
        console.error('Error fetching property details:', error);
        setPageError('Unable to load full property details.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchPropertyDetails();

    return () => {
      isActive = false;
    };
  }, [resolvedPropertyId]);

  useEffect(() => {
    let isActive = true;

    const fetchPriceTrend = async () => {
      if (!details?.locality) {
        setPriceTrend([]);
        setTrendMeta({ currentAvgPrice: 0, growthMetrics: {} });
        return;
      }

      try {
        const response = await localityService.getPriceTrends(details.locality, {
          city: details.city,
        });
        if (!isActive) return;
        setPriceTrend(Array.isArray(response.priceTrend) ? response.priceTrend : []);
        setTrendMeta({
          currentAvgPrice: response.currentAvgPrice || 0,
          growthMetrics: response.growthMetrics || {},
        });
      } catch (error) {
        if (!isActive) return;
        console.error('Error fetching price trends:', error);
        setPriceTrend([]);
        setTrendMeta({ currentAvgPrice: 0, growthMetrics: {} });
      }
    };

    fetchPriceTrend();

    return () => {
      isActive = false;
    };
  }, [details?.locality, details?.city]);

  useEffect(() => {
    if (!details) return;
    const numericPrice = details.raw?.priceNumeric || parseINRValue(details.price);
    if (numericPrice) {
      setLoanAmount(String(Math.round(numericPrice * 0.8)));
    }
  }, [details?.id]);

  const handleCreateLead = async (contactType = 'request_details') => {
    if (!resolvedPropertyId) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setLeadStatus({ loading: true, message: '', error: '' });
    try {
      await leadService.createLead(resolvedPropertyId, { contactType });
      setLeadStatus({ loading: false, message: 'Request sent to the owner.', error: '' });
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to create lead. Try again.';
      setLeadStatus({ loading: false, message: '', error: message });
    }
  };

  if (!details) return null;

  const tags = Array.isArray(details.tags) ? details.tags : [];
  const dealerName = details.dealer || 'Verified Agent';
  const savedId = resolvedPropertyId ? String(resolvedPropertyId) : null;
  const isSaved = savedId ? savedPropertyIds?.has(savedId) : false;
  const galleryImages = Array.isArray(details.raw?.images) ? details.raw.images : [];
  const amenityList = Array.isArray(details.raw?.amenities) && details.raw.amenities.length
    ? details.raw.amenities
    : ['24/7 Concierge', 'Valet Parking', 'Infinity Pool', 'Smart Home Tech', 'Private Lounge', 'Wellness Center'];
  const fallbackGallery = [
    details.image,
    'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=600&q=80',
  ];
  const gallery = galleryImages.length ? galleryImages : fallbackGallery;
  const formatNumber = (value) => (typeof value === 'number' ? value.toLocaleString('en-IN') : 'N/A');
  const formatCurrency = (value) => {
    if (!Number.isFinite(value)) return 'N/A';
    return `₹${value.toLocaleString('en-IN')}`;
  };
  const handleSimilarSelect = (nextProperty) => {
    if (onPropertySelect) {
      onPropertySelect(nextProperty);
    }
  };
  const emiStats = useMemo(() => {
    const principal = Number(loanAmount);
    const rate = Number(interestRate);
    const years = Number(tenureYears);

    if (!Number.isFinite(principal) || principal <= 0) {
      return { monthly: 0, totalInterest: 0, totalPayable: 0 };
    }

    const monthlyRate = rate > 0 ? rate / 100 / 12 : 0;
    const months = years > 0 ? years * 12 : 0;

    if (!monthlyRate || !months) {
      return { monthly: 0, totalInterest: 0, totalPayable: 0 };
    }

    const factor = Math.pow(1 + monthlyRate, months);
    const monthly = principal * monthlyRate * factor / (factor - 1);
    const totalPayable = monthly * months;
    const totalInterest = totalPayable - principal;

    return { monthly, totalInterest, totalPayable };
  }, [loanAmount, interestRate, tenureYears]);

  const emiDisplay = emiStats.monthly
    ? formatCurrency(Math.round(emiStats.monthly))
    : 'N/A';
  const trendMetrics = trendMeta.growthMetrics || {};

  const trendPoints = useMemo(() => buildTrendPoints(priceTrend), [priceTrend]);
  const reviewAverage = reviews.length
    ? reviews.reduce((acc, review) => acc + (review.overallRating || 0), 0) / reviews.length
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="pt-32 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 bg-white"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-8 hover:text-slate-900 uppercase tracking-wider transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Collection
      </button>

      {/* Editorial Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div className="max-w-3xl">
          <div className="flex gap-2 mb-4">
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="dark">{tag}</Badge>
            ))}
            <Badge variant="accent">{details.status}</Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
            {details.title}
          </h1>
          <p className="text-xl text-slate-500 font-medium flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-500" /> {details.location}
          </p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Listed Price</p>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{details.price}</h2>
        </div>
      </div>

      {/* Bento Box Image Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-16 h-[60vh] min-h-[500px]">
        <div className="lg:col-span-8 rounded-[2.5rem] overflow-hidden relative group">
          <img src={gallery[0]} alt={details.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        </div>
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
          <div className="flex-1 rounded-[2.5rem] overflow-hidden group">
            <img src={gallery[1]} alt="Interior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="flex-1 rounded-[2.5rem] overflow-hidden relative group cursor-pointer">
            <img src={gallery[2]} alt="Interior" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center group-hover:bg-slate-900/50 transition-colors backdrop-blur-sm">
              <Button variant="secondary" className="!bg-white/90 backdrop-blur-md !border-none" icon={<Maximize className="w-4 h-4"/>}>
                Show all photos
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Main Content Area */}
        <div className="flex-1">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8 border-y border-slate-100 mb-12">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Configuration</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><BedDouble className="w-5 h-5 text-emerald-500"/> {details.bhk}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Area Space</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><Maximize className="w-5 h-5 text-emerald-500"/> {details.area}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Property Type</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><Building className="w-5 h-5 text-emerald-500"/> {details.type}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Est. EMI</p>
              <p className="text-xl font-bold text-slate-900">
                {emiDisplay} <span className="text-sm text-slate-500 font-medium">/mo</span>
              </p>
            </div>
          </div>

          {/* About Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">About the property</h2>
            <div className="prose prose-lg text-slate-600 font-medium leading-relaxed">
              <p>
                Experience unparalleled luxury in this exquisite property located in the highly coveted heart of {details.location}. 
                Boasting architectural brilliance and premium bespoke fittings, this expansive {details.bhk} residence offers a meticulous 
                living area of {details.area}.
              </p>
              <p className="mt-4">
                Designed for those who appreciate the finer things, the property features floor-to-ceiling windows ensuring abundant natural light, a state-of-the-art chef's kitchen, and panoramic scenic views that redefine urban living.
              </p>
            </div>
          </div>

          {/* Premium Amenities */}
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-8">Premium Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {amenityList.map((amenity, idx) => (
                <div key={idx} className="flex flex-col gap-3 p-6 rounded-[1.5rem] bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-sm group-hover:text-emerald-600">
                    <Star className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-800">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {localityInsights && (
            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-8">Locality Insights</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-[1.5rem] bg-slate-50">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Avg Price / Sq Ft</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">₹{formatNumber(localityInsights.avgPricePerSqFt)}</p>
                </div>
                <div className="p-6 rounded-[1.5rem] bg-slate-50">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Growth</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">{formatNumber(localityInsights.growthPercentage)}%</p>
                </div>
                <div className="p-6 rounded-[1.5rem] bg-slate-50">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Safety Rating</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">{formatNumber(localityInsights.ratings?.safety)}</p>
                </div>
                <div className="p-6 rounded-[1.5rem] bg-slate-50">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Schools Nearby</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">{formatNumber(localityInsights.amenities?.schools)}</p>
                </div>
                <div className="p-6 rounded-[1.5rem] bg-slate-50">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Hospitals Nearby</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">{formatNumber(localityInsights.amenities?.hospitals)}</p>
                </div>
                <div className="p-6 rounded-[1.5rem] bg-slate-50">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Metro Access</p>
                  <p className="text-xl font-bold text-slate-900 mt-2">{localityInsights.amenities?.metro ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}

          {priceTrend.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Price Trends</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[1.5rem] bg-slate-50">
                  {trendPoints.points ? (
                    <svg
                      width={trendPoints.width}
                      height={trendPoints.height}
                      viewBox={`0 0 ${trendPoints.width} ${trendPoints.height}`}
                      className="w-full"
                    >
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={trendPoints.points}
                      />
                    </svg>
                  ) : (
                    <p className="text-sm text-slate-500">Not enough data for trends yet.</p>
                  )}
                  <div className="flex justify-between text-xs text-slate-400 font-semibold mt-4">
                    <span>Low: {formatCurrency(Math.round(trendPoints.min))}</span>
                    <span>High: {formatCurrency(Math.round(trendPoints.max))}</span>
                  </div>
                </div>
                <div className="p-6 rounded-[1.5rem] bg-slate-50 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Current Avg Price / Sq Ft</p>
                    <p className="text-2xl font-black text-slate-900 mt-2">{formatCurrency(Math.round(trendMeta.currentAvgPrice || 0))}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">6M Growth</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">{formatNumber(trendMetrics.sixMonthGrowth)}%</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">1Y Growth</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">{formatNumber(trendMetrics.yearGrowth)}%</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {priceTrend.slice(-4).map((point, idx) => (
                      <span key={`${point.month || idx}`} className="px-3 py-1 rounded-full bg-white text-xs font-semibold text-slate-600">
                        {point.month || 'Recent'} · {formatCurrency(Math.round(point.averagePrice || point.price || 0))}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">Loan & EMI Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-[1.5rem] bg-slate-50 space-y-5">
                <div>
                  <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Loan Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={loanAmount}
                    onChange={(event) => setLoanAmount(event.target.value)}
                    className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
                    placeholder="Enter loan amount"
                  />
                  <p className="text-xs text-slate-400 font-semibold mt-2">Defaults to 80% of listed price.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Interest Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={interestRate}
                      onChange={(event) => setInterestRate(event.target.value)}
                      className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
                      placeholder="e.g. 8.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Tenure (Years)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={tenureYears}
                      onChange={(event) => setTenureYears(event.target.value)}
                      className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-emerald-200 font-bold">Estimated EMI</p>
                  <p className="text-3xl font-black mt-2">{emiDisplay}</p>
                  <p className="text-xs text-emerald-100">per month</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-bold">Total Interest</p>
                    <p className="text-lg font-bold mt-1">{formatCurrency(Math.round(emiStats.totalInterest))}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-bold">Total Payable</p>
                    <p className="text-lg font-bold mt-1">{formatCurrency(Math.round(emiStats.totalPayable))}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Reviews</h2>
              {reviewAverage > 0 && (
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Star className="w-4 h-4 text-emerald-500" fill="currentColor" />
                  {reviewAverage.toFixed(1)} / 5
                </div>
              )}
            </div>
            {reviews.length ? (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const reviewerName = review.user
                    ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || 'Verified User'
                    : 'Verified User';
                  const initials = reviewerName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <div key={review._id} className="p-5 rounded-[1.5rem] border border-slate-100 bg-white">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center">
                          {review.user?.profileImage ? (
                            <img src={review.user.profileImage} alt={reviewerName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            initials || 'U'
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{reviewerName}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`w-3 h-3 ${idx < (review.overallRating || 0) ? 'text-emerald-500' : 'text-slate-300'}`}
                                fill={idx < (review.overallRating || 0) ? 'currentColor' : 'none'}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{review.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No reviews yet for this property.</p>
            )}
          </div>

          {similarProperties.length > 0 && (
            <div className="mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">Similar Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {similarProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onClick={handleSimilarSelect}
                    isSaved={savedPropertyIds?.has(String(prop.id))}
                    onToggleSave={onToggleSave}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Contact Widget */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl sticky top-32">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-black tracking-tighter">Interested?</h3>
              <div className="flex gap-2">
                <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors"><Share2 className="w-4 h-4"/></button>
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isSaved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-emerald-500 hover:text-white'
                  }`}
                  onClick={() => onToggleSave?.(details)}
                >
                  <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-800">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg">
                {dealerName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-1">Exclusive Agent</p>
                <p className="text-xl font-bold">{dealerName}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button
                variant="accent"
                className="w-full !py-4 text-lg"
                onClick={() => handleCreateLead('schedule_visit')}
                disabled={leadStatus.loading}
              >
                {leadStatus.loading ? 'Sending...' : 'Schedule a Tour'}
              </Button>
              <Button
                className="w-full !py-4 bg-slate-800 hover:bg-slate-700 text-white shadow-none"
                onClick={() => handleCreateLead('request_details')}
                disabled={leadStatus.loading}
              >
                Contact Owner
              </Button>
            </div>

            {(leadStatus.message || leadStatus.error || pageError || isLoading) && (
              <p className={`text-xs text-center mt-4 font-medium ${leadStatus.error || pageError ? 'text-rose-300' : 'text-emerald-300'}`}>
                {leadStatus.error || pageError || (isLoading ? 'Loading property details...' : leadStatus.message)}
              </p>
            )}
            
            <p className="text-xs text-center text-slate-500 mt-6 font-medium">
              Information is deemed reliable but not guaranteed.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyDetailsPage;
