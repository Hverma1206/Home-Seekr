import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
  MapPin, Building, Building2, Heart, Share2, BedDouble, Maximize,
  Star, ChevronLeft, TrendingUp, Phone, CalendarDays, X, Loader2, Pencil, Check,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PropertyCard from '../components/PropertyCard';
import { propertyService, formatPrice } from '../services/propertyService';
import { leadService } from '../services/leadService';
import { localityService } from '../services/localityService';
import { useAuth } from '../hooks/useAuth';
import VerifyContact from '../components/VerifyContact';

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
  if (/lakh|lac|\bl\b/i.test(cleaned)) return numeric * 100000;
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

const computeEmi = (loanAmount, interestRate, tenureYears) => {
  const principal = Number(loanAmount);
  const monthlyRate = Number(interestRate) > 0 ? Number(interestRate) / 100 / 12 : 0;
  const months = Number(tenureYears) > 0 ? Number(tenureYears) * 12 : 0;

  if (!Number.isFinite(principal) || principal <= 0 || !monthlyRate || !months) {
    return { monthly: 0, totalInterest: 0, totalPayable: 0 };
  }

  const factor = Math.pow(1 + monthlyRate, months);
  const monthly = principal * monthlyRate * factor / (factor - 1);
  const totalPayable = monthly * months;
  return { monthly, totalInterest: totalPayable - principal, totalPayable };
};

const POSTER_LABELS = { owner: 'Owner', broker: 'Agent / Broker', builder: 'Builder', agent: 'Agent' };
const LOOKING_TO_LABELS = { buy: 'For Sale', rent: 'For Rent', pg: 'PG / Co-living', commercial: 'Commercial' };
const UNAVAILABLE_LABELS = { sold: 'Sold', rented: 'Rented out', inactive: 'No longer available', pending_verification: 'Under review' };

const formatNumber = (value) => (typeof value === 'number' ? value.toLocaleString('en-IN') : 'N/A');
const formatCurrency = (value) => (Number.isFinite(value) ? `₹${value.toLocaleString('en-IN')}` : 'N/A');
const todayISO = () => new Date().toISOString().slice(0, 10);

// The specs a buyer compares on, built only from what the poster filled in
const buildSpecs = (raw = {}) => {
  const area = (value, unit = 'sq.ft') => (value && String(value).trim() ? `${value} ${unit}` : '');
  const rows = [
    ['Listed for', LOOKING_TO_LABELS[raw.lookingTo]],
    ['Property type', raw.selectedType],
    ['Society', raw.societyName],
    ['Bedrooms', raw.bedrooms],
    ['Bathrooms', raw.bathrooms],
    ['Balconies', raw.balconies],
    ['Floor', raw.floor ? `${raw.floor}${raw.totalFloors ? ` of ${raw.totalFloors}` : ''}` : ''],
    ['Furnishing', raw.furnishingType && raw.furnishingType.replace('-', ' ')],
    ['Carpet area', area(raw.carpetArea)],
    ['Built-up area', area(raw.builtupArea)],
    ['Super built-up area', area(raw.superBuiltupArea)],
    ['Plot dimensions', raw.plotLength && raw.plotBreadth ? `${raw.plotLength} × ${raw.plotBreadth}` : ''],
    ['Floors allowed', raw.floorsAllowed],
    ['Boundary wall', raw.hasBoundaryWall],
    ['Open sides', raw.openSides],
    ['Facing', raw.propertyFacing],
    ['Facing road', raw.facingRoadWidth ? `${raw.facingRoadWidth} ${raw.facingRoadUnit || ''}`.trim() : ''],
    ['Status', raw.availabilityStatus],
    [raw.lookingTo === 'rent' || raw.lookingTo === 'pg' ? 'Available from' : 'Possession', raw.possessionBy],
    ['Ownership', raw.ownership],
    ['Approved by', Array.isArray(raw.approvedBy) ? raw.approvedBy.join(', ') : ''],
    ['Security deposit', raw.security ? formatPrice(String(raw.security)) : ''],
    ['Maintenance', raw.maintenanceCharges ? `${formatPrice(String(raw.maintenanceCharges))}/month` : ''],
    ['Price negotiable', raw.priceNegotiable ? 'Yes' : ''],
    ['Landmark', raw.landmark],
    ['PIN code', raw.pincode],
    ['Posted on', raw.createdAt ? new Date(raw.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''],
  ];
  return rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
};

const PropertyDetailsPage = ({
  property,
  onBack,
  onPropertySelect,
  savedPropertyIds,
  onToggleSave,
}) => {
  const { isAuthenticated, user, updateUser } = useAuth();
  // Enquiring shares the buyer's number with the poster, so the server asks for a verified phone first
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { propertyId: routePropertyId } = useParams();
  const resolvedPropertyId = property?.id || property?._id || property?.raw?._id || routePropertyId;
  const [details, setDetails] = useState(property || null);
  const [localityInsights, setLocalityInsights] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [priceTrend, setPriceTrend] = useState([]);
  const [trendMeta, setTrendMeta] = useState({ currentAvgPrice: 0, growthMetrics: {} });
  const [isLoading, setIsLoading] = useState(!property);
  const [pageError, setPageError] = useState('');
  const [leadStatus, setLeadStatus] = useState({ loading: false, message: '', error: '' });
  const [contact, setContact] = useState(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
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
        } = await propertyService.getPropertyDetails(resolvedPropertyId);

        if (!isActive) return;

        if (fetchedProperty) {
          setDetails(fetchedProperty);
          const numericPrice = fetchedProperty.raw?.priceNumeric || parseINRValue(fetchedProperty.price);
          setLoanAmount(numericPrice ? String(Math.round(numericPrice * 0.8)) : '');
        }
        setLocalityInsights(insights || null);
        setSimilarProperties(Array.isArray(similar) ? similar : []);
        setReviews(Array.isArray(fetchedReviews) ? fetchedReviews : []);
      } catch (error) {
        if (!isActive) return;
        setPageError(
          error?.response?.status === 404
            ? 'This property could not be found. It may have been removed.'
            : 'Unable to load property details. Please try again.',
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchPropertyDetails();

    return () => {
      isActive = false;
    };
  }, [resolvedPropertyId]);

  // A buyer who enquired earlier keeps seeing the poster's number after a reload
  useEffect(() => {
    let isActive = true;
    setContact(null);
    setLeadStatus({ loading: false, message: '', error: '' });
    if (!isAuthenticated || !resolvedPropertyId) return undefined;

    leadService.getMyLeadForProperty(resolvedPropertyId)
      .then((result) => {
        if (isActive && result?.contact) setContact(result.contact);
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, resolvedPropertyId]);

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
      } catch {
        if (!isActive) return;
        setPriceTrend([]);
        setTrendMeta({ currentAvgPrice: 0, growthMetrics: {} });
      }
    };

    fetchPriceTrend();

    return () => {
      isActive = false;
    };
  }, [details?.locality, details?.city]);

  // Every hook runs before the early returns below, so the hook order never changes between renders
  const emiStats = useMemo(
    () => computeEmi(loanAmount, interestRate, tenureYears),
    [loanAmount, interestRate, tenureYears],
  );
  const trendPoints = useMemo(() => buildTrendPoints(priceTrend), [priceTrend]);
  const specs = useMemo(() => buildSpecs(details?.raw), [details?.raw]);

  const goToLogin = () => navigate('/login', { state: { from: location.pathname } });

  const sendLead = async ({ contactType, notes, visit }) => {
    if (!resolvedPropertyId) return;
    if (!isAuthenticated) {
      goToLogin();
      return;
    }

    setLeadStatus({ loading: true, message: '', error: '' });
    try {
      const response = await leadService.createLead(resolvedPropertyId, {
        contactType,
        notes: notes || undefined,
        visitDate: visit || undefined,
      });
      setContact(response.contact || null);
      setEnquiryOpen(false);
      setEnquiryMessage('');
      setVisitDate('');
      setLeadStatus({
        loading: false,
        error: '',
        message: visit
          ? 'Visit request sent. The poster will call you to confirm.'
          : 'Enquiry sent. The poster can see your number too.',
      });
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to send your enquiry. Try again.';
      setLeadStatus({ loading: false, message: '', error: message });
      if (error?.response?.data?.code === 'PHONE_NOT_VERIFIED') setNeedsPhoneVerification(true);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: details?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copied');
    } catch {
      setShareMessage('');
      return;
    }
    setTimeout(() => setShareMessage(''), 2000);
  };

  if (!details) {
    return (
      <div className="pt-40 pb-24 max-w-3xl mx-auto px-4 text-center">
        {isLoading ? (
          <p className="flex items-center justify-center gap-3 text-slate-500 font-semibold">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading property…
          </p>
        ) : (
          <>
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-900">{pageError || 'Property not found.'}</p>
            <Button variant="secondary" className="mx-auto mt-6" onClick={onBack}>
              Browse other properties
            </Button>
          </>
        )}
      </div>
    );
  }

  const raw = details.raw || {};
  const tags = Array.isArray(details.tags) ? details.tags : [];
  const poster = raw.postedBy && typeof raw.postedBy === 'object' ? raw.postedBy : null;
  const posterId = poster?._id || raw.postedBy;
  const isOwnListing = Boolean(user?.id && posterId && String(user.id) === String(posterId));
  const isAvailable = !raw.status || raw.status === 'active';
  const isRental = raw.lookingTo === 'rent' || raw.lookingTo === 'pg';
  const dealerName = details.dealer
    || poster?.companyName
    || [poster?.firstName, poster?.lastName].filter(Boolean).join(' ')
    || 'Owner';
  const savedId = resolvedPropertyId ? String(resolvedPropertyId) : null;
  const isSaved = savedId ? savedPropertyIds?.has(savedId) : false;
  const gallery = Array.isArray(raw.images) && raw.images.length
    ? raw.images
    : details.image ? [details.image] : [];
  const amenityList = [
    ...(Array.isArray(raw.amenities) ? raw.amenities : []),
    ...(Array.isArray(raw.otherFeatures) ? raw.otherFeatures : []),
  ];
  const highlights = [
    ...(Array.isArray(raw.overlooking) ? raw.overlooking.map((item) => `Overlooks ${item}`) : []),
    ...(Array.isArray(raw.locationAdvantages) ? raw.locationAdvantages : []),
  ];
  const emiDisplay = emiStats.monthly ? formatCurrency(Math.round(emiStats.monthly)) : 'N/A';
  const trendMetrics = trendMeta.growthMetrics || {};
  const reviewAverage = reviews.length
    ? reviews.reduce((acc, review) => acc + (review.overallRating || 0), 0) / reviews.length
    : 0;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="pt-32 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 bg-white"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-8 hover:text-slate-900 uppercase tracking-wider transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to listings
      </button>

      {!isAvailable && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
          This property is marked as “{UNAVAILABLE_LABELS[raw.status] || raw.status}”. The poster is no longer taking enquiries on it.
        </div>
      )}

      {/* Editorial Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div className="max-w-3xl">
          <div className="flex flex-wrap gap-2 mb-4">
            {raw.lookingTo && <Badge variant="accent">{LOOKING_TO_LABELS[raw.lookingTo] || raw.lookingTo}</Badge>}
            {details.isVerified && <Badge variant="dark">Verified</Badge>}
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="dark">{tag}</Badge>
            ))}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
            {details.title}
          </h1>
          <p className="text-xl text-slate-500 font-medium flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-500 shrink-0" /> {details.location}
          </p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{isRental ? 'Monthly Rent' : 'Listed Price'}</p>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            {details.price}
            {details.priceSuffix && <span className="text-xl text-slate-500 font-bold">{details.priceSuffix}</span>}
          </h2>
          {raw.priceNegotiable && <p className="text-sm text-emerald-600 font-semibold mt-1">Negotiable</p>}
        </div>
      </div>

      {/* Gallery */}
      {gallery.length ? (
        <div className={`grid grid-cols-1 gap-4 mb-16 h-[60vh] min-h-[420px] ${gallery.length > 1 ? 'lg:grid-cols-12' : ''}`}>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className={`rounded-[2.5rem] overflow-hidden relative group ${gallery.length > 1 ? 'lg:col-span-8' : ''}`}
          >
            <img src={gallery[0]} alt={details.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </button>
          {gallery.length > 1 && (
            <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
              {gallery.slice(1, 3).map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="flex-1 rounded-[2.5rem] overflow-hidden relative group"
                >
                  <img src={src} alt={`Photo ${idx + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  {idx === 1 || gallery.length === 2 ? (
                    <span className="absolute inset-0 bg-slate-900/40 flex items-center justify-center group-hover:bg-slate-900/50 transition-colors">
                      <span className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-slate-900">
                        <Maximize className="w-4 h-4" /> Show all {gallery.length} photos
                      </span>
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-16 h-72 rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400">
          <Building2 className="w-14 h-14" />
          <p className="text-sm font-semibold mt-3">The poster hasn't added photos yet</p>
        </div>
      )}

      {galleryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All photos"
          className="fixed inset-0 z-[60] bg-slate-950/90 overflow-y-auto p-4 sm:p-10"
          onClick={() => setGalleryOpen(false)}
        >
          <button
            type="button"
            aria-label="Close photos"
            onClick={() => setGalleryOpen(false)}
            className="fixed top-5 right-5 w-11 h-11 rounded-full bg-white text-slate-900 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-5xl mx-auto grid gap-4" onClick={(e) => e.stopPropagation()}>
            {gallery.map((src, idx) => (
              <img key={src} src={src} alt={`Photo ${idx + 1}`} className="w-full rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8 border-y border-slate-100 mb-12">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Configuration</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><BedDouble className="w-5 h-5 text-emerald-500"/> {details.bhk}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Area</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><Maximize className="w-5 h-5 text-emerald-500"/> {details.area || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Property Type</p>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-2"><Building className="w-5 h-5 text-emerald-500"/> {details.type}</p>
            </div>
            <div>
              {isRental ? (
                <>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deposit</p>
                  <p className="text-xl font-bold text-slate-900">{raw.security ? formatPrice(String(raw.security)) : 'Ask poster'}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Est. EMI</p>
                  <p className="text-xl font-bold text-slate-900">
                    {emiDisplay} <span className="text-sm text-slate-500 font-medium">/mo</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">About the property</h2>
            {raw.description ? (
              <p className="text-lg text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                {raw.description}
              </p>
            ) : (
              <p className="text-base text-slate-500 font-medium">
                The poster hasn't added a description yet. Send an enquiry to ask about this {details.type?.toLowerCase() || 'property'}.
              </p>
            )}
          </div>

          {/* Property details */}
          {specs.length > 0 && (
            <div className="mb-16">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">Property details</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 border-t border-slate-100">
                {specs.map(([term, value]) => (
                  <div key={term} className="flex justify-between gap-4 py-3 border-b border-slate-100">
                    <dt className="text-sm font-semibold text-slate-500">{term}</dt>
                    <dd className="text-sm font-bold text-slate-900 text-right capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Amenities */}
          {amenityList.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-8">Amenities & features</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {amenityList.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 rounded-[1.25rem] bg-slate-50">
                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {highlights.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">Location highlights</h2>
              <div className="flex flex-wrap gap-2">
                {highlights.map((item) => (
                  <span key={item} className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-sm font-semibold">{item}</span>
                ))}
              </div>
            </div>
          )}

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

          {!isRental && (
            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">Loan & EMI Calculator</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[1.5rem] bg-slate-50 space-y-5">
                  <div>
                    <label htmlFor="emi-loan" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Loan Amount</label>
                    <input
                      id="emi-loan"
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
                      <label htmlFor="emi-rate" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Interest Rate</label>
                      <input
                        id="emi-rate"
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
                      <label htmlFor="emi-tenure" className="text-xs uppercase tracking-wider text-slate-500 font-bold">Tenure (Years)</label>
                      <input
                        id="emi-tenure"
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
          )}

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
                    ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || 'User'
                    : 'User';
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
                    onClick={(next) => onPropertySelect?.(next)}
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
              <h3 className="text-2xl font-black tracking-tighter">{isOwnListing ? 'Your listing' : 'Interested?'}</h3>
              <div className="flex gap-2 items-center">
                {shareMessage && <span className="text-xs text-emerald-300 font-semibold">{shareMessage}</span>}
                <button
                  type="button"
                  aria-label="Share property"
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors"
                >
                  <Share2 className="w-4 h-4"/>
                </button>
                {!isOwnListing && (
                  <button
                    type="button"
                    aria-label={isSaved ? 'Remove from saved' : 'Save property'}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isSaved
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 hover:bg-emerald-500 hover:text-white'
                    }`}
                    onClick={() => onToggleSave?.(details)}
                  >
                    <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-800">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg overflow-hidden shrink-0">
                {poster?.profileImage
                  ? <img src={poster.profileImage} alt="" className="w-full h-full object-cover" />
                  : dealerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  {POSTER_LABELS[raw.postedByType] || 'Owner'}
                </p>
                <p className="text-xl font-bold truncate">{dealerName}</p>
              </div>
            </div>

            {isOwnListing ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Buyers see this page. Enquiries they send show up in your dashboard.
                </p>
                <Button
                  variant="accent"
                  className="w-full !py-4"
                  onClick={() => navigate('/post-property/form', { state: { property: raw } })}
                  icon={<Pencil className="w-4 h-4" />}
                >
                  Edit listing
                </Button>
                <Button
                  className="w-full !py-4 bg-slate-800 hover:bg-slate-700 text-white shadow-none"
                  onClick={() => navigate('/dashboard')}
                >
                  View enquiries
                </Button>
              </div>
            ) : !isAvailable ? (
              <p className="text-sm text-slate-400">
                This listing is no longer available. Browse similar properties on this page.
              </p>
            ) : (
              <>
                {raw.sourceUrl && (
                  <p className="mb-4 text-xs text-slate-400">
                    Test listing imported from{' '}
                    <a href={raw.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-semibold hover:underline">
                      {raw.sourceName || 'another site'}
                    </a>
                    . Details may be outdated.
                  </p>
                )}

                {contact && !contact.phoneNumber && contact.phoneNotSpecified && (
                  <div className="flex items-center justify-center gap-3 mb-4 rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <span>
                      <span className="block text-xs text-slate-400 font-semibold">{contact.name}</span>
                      <span className="block text-base font-bold text-white">Phone: Not specified</span>
                    </span>
                  </div>
                )}

                {contact?.phoneNumber && (
                  <a
                    href={`tel:+91${contact.phoneNumber}`}
                    className="flex items-center justify-center gap-3 mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3"
                  >
                    <Phone className="w-5 h-5 text-emerald-300" />
                    <span>
                      <span className="block text-xs text-emerald-300 font-semibold">{contact.name}</span>
                      <span className="block text-xl font-black text-white tracking-wide">+91 {contact.phoneNumber}</span>
                    </span>
                  </a>
                )}

                {enquiryOpen ? (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendLead({
                        contactType: visitDate ? 'callback_request' : 'email_inquiry',
                        notes: enquiryMessage.trim(),
                        visit: visitDate,
                      });
                    }}
                  >
                    <div>
                      <label htmlFor="enquiry-message" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Message
                      </label>
                      <textarea
                        id="enquiry-message"
                        rows={3}
                        maxLength={1000}
                        value={enquiryMessage}
                        onChange={(e) => setEnquiryMessage(e.target.value)}
                        placeholder={`Hi, I'm interested in this ${isRental ? 'rental' : 'property'}. Is it still available?`}
                        className="w-full mt-2 rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="enquiry-visit" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Preferred visit date (optional)
                      </label>
                      <input
                        id="enquiry-visit"
                        type="date"
                        min={todayISO()}
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full mt-2 rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        className="flex-1 !py-3 bg-slate-800 hover:bg-slate-700 text-white shadow-none"
                        onClick={() => setEnquiryOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="accent" className="flex-1 !py-3" disabled={leadStatus.loading}>
                        {leadStatus.loading ? 'Sending…' : 'Send'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <Button
                      variant="accent"
                      className="w-full !py-4 text-lg"
                      onClick={() => (isAuthenticated ? setEnquiryOpen(true) : goToLogin())}
                      disabled={leadStatus.loading}
                      icon={<CalendarDays className="w-5 h-5" />}
                    >
                      {contact ? 'Send another message' : 'Enquire / Schedule a visit'}
                    </Button>
                    {!contact && (
                      <Button
                        className="w-full !py-4 bg-slate-800 hover:bg-slate-700 text-white shadow-none"
                        onClick={() => sendLead({ contactType: 'phone_request' })}
                        disabled={leadStatus.loading}
                        icon={<Phone className="w-4 h-4" />}
                      >
                        {leadStatus.loading ? 'Sending…' : 'Get Phone Number'}
                      </Button>
                    )}
                    {!isAuthenticated && (
                      <p className="text-xs text-center text-slate-400">Login with your mobile number to contact the {POSTER_LABELS[raw.postedByType]?.toLowerCase() || 'owner'}.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {(leadStatus.message || leadStatus.error || (pageError && details)) && (
              <p
                role={leadStatus.error ? 'alert' : 'status'}
                className={`text-xs text-center mt-4 font-medium ${leadStatus.error || pageError ? 'text-rose-300' : 'text-emerald-300'}`}
              >
                {leadStatus.error || leadStatus.message || pageError}
              </p>
            )}

            {needsPhoneVerification && (
              <VerifyContact
                className="mt-4 text-slate-900"
                channel="phone"
                target={user?.pendingPhoneNumber || ''}
                autoSend={Boolean(user?.pendingPhoneNumber)}
                allowChangeNumber
                onVerified={(nextUser) => {
                  updateUser(nextUser);
                  setNeedsPhoneVerification(false);
                  setLeadStatus({ loading: false, error: '', message: 'Phone verified. You can send your enquiry now.' });
                }}
              />
            )}

            <p className="text-xs text-center text-slate-500 mt-6 font-medium">
              Verify documents and visit the property before making any payment.
            </p>
          </div>
        </div>
      </div>
    </Motion.div>
  );
};

export default PropertyDetailsPage;
