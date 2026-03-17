import { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, MapPin, Home, Camera, Layers, ArrowLeft, LocateFixed, Loader2, Pencil } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Basic Details',             icon: Home },
  { id: 2, label: 'Location Details',           icon: MapPin },
  { id: 3, label: 'Property Profile',           icon: Layers },
  { id: 4, label: 'Photos, Videos & Voice-over',icon: Camera },
  { id: 5, label: 'Amenities section',          icon: Check },
];

const PROPERTY_TYPES_RESIDENTIAL = [
  'Flat / Apartment', 'Independent House / Villa', 'Independent / Builder Floor',
  'Plot / Land', '1 RK / Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Other',
];

const PROPERTY_TYPES_COMMERCIAL = [
  'Office Space', 'Shop / Showroom', 'Warehouse / Godown', 'Industrial Building',
  'Industrial Shed', 'Other Business', 'Agriculture Land', 'Plot / Land',
];

const AMENITIES = [
  'Maintenance Staff', 'Water Storage', 'Rain Water Harvesting', 'Vaastu Compliant',
];

const OVERLOOKING_OPTIONS = ['Pool', 'Park', 'Club', 'Main Road', 'Others'];
const OTHER_FEATURE_OPTIONS = ['Corner Property', 'In a gated society', 'Wheelchair friendly'];
const PROPERTY_FACING_OPTIONS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
const LOCATION_ADVANTAGE_OPTIONS = [
  'Close to Metro Station', 'Close to School', 'Close to Hospital', 'Close to Market',
  'Close to Railway Station', 'Close to Airport', 'Close to Mall', 'Close to Highway',
];

export default function PropertyFormPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const initial = state || { lookingTo: 'sell', propertyCategory: 'residential', selectedType: '', role: 'owner' };

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    lookingTo: initial.lookingTo,
    propertyCategory: initial.propertyCategory,
    selectedType: initial.selectedType,
    role: initial.role,
    city: '', locality: '', landmark: '', pincode: '',
    price: '', pricePerSqYard: '', priceInWords: '',
    allInclusive: false, taxExcluded: false, priceNegotiable: false,
    plotArea: '', plotAreaUnit: 'sq.yards', carpetArea: '', builtupArea: '', superBuiltupArea: '',
    plotLength: '', plotBreadth: '',
    floorsAllowed: '',
    hasBoundaryWall: '', openSides: '',
    anyConstructionDone: '',
    possessionBy: '',
    bedrooms: '', bathrooms: '', balconies: '',
    floor: '', totalFloors: '',
    availabilityStatus: '', ownership: '',
    approvedBy: [],
    propertyAge: '',
    amenities: [],
    customAmenities: [],
    overlooking: [],
    otherFeatures: [],
    propertyFacing: '',
    facingRoadWidth: '',
    facingRoadUnit: 'Feet',
    locationAdvantages: [],
  });
  const [errors, setErrors] = useState({});
  const [customInput, setCustomInput] = useState({ bedrooms: false, bathrooms: false, balconies: false });
  const [customVal, setCustomVal] = useState({ bedrooms: '', bathrooms: '', balconies: '' });
  const [customPills, setCustomPills] = useState({ bedrooms: [], bathrooms: [], balconies: [] });
  const [amenityOtherOpen, setAmenityOtherOpen] = useState(false);
  const [amenityOtherValue, setAmenityOtherValue] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          setForm(f => ({
            ...f,
            city:     addr.city || addr.town || addr.village || addr.county || '',
            locality: addr.suburb || addr.neighbourhood || addr.road || '',
            pincode:  addr.postcode || '',
          }));
          setErrors(e => ({ ...e, city: '', locality: '', pincode: '' }));
        } catch {
          setLocError('Could not fetch location details. Please fill manually.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocError('Location access denied. Please allow location or fill manually.');
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const types = form.propertyCategory === 'residential'
    ? PROPERTY_TYPES_RESIDENTIAL
    : PROPERTY_TYPES_COMMERCIAL;

  const propertyScore = Math.min(Math.round(((currentStep - 1) / 5) * 100), 100);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const toggleAmenity = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
  }));
  const toggleMultiSelect = (key, value) => setForm(f => ({
    ...f,
    [key]: f[key].includes(value) ? f[key].filter(x => x !== value) : [...f[key], value],
  }));
  const toggleApprovedBy = (authority) => setForm(f => ({
    ...f,
    approvedBy: f.approvedBy.includes(authority)
      ? f.approvedBy.filter(x => x !== authority)
      : [...f.approvedBy, authority],
  }));

  const validateStep = () => {
    const e = {};
    if (currentStep === 1 && !form.selectedType) e.selectedType = 'Please select a property type.';
    if (currentStep === 2) {
      if (!form.city.trim()) e.city = 'Required';
      if (!form.locality.trim()) e.locality = 'Required';
      if (!form.pincode.trim()) e.pincode = 'Required';
    }
    if (currentStep === 3) {
      if (!form.plotArea.trim()) e.plotArea = 'Plot area is required.';
      if (!form.price.trim()) e.price = 'Expected price is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validateStep()) return;
    setCurrentStep(s => s + 1);
  };

  const sanitizePayload = (data) => {
    const payload = {};

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        payload[key] = value.trim();
      } else {
        payload[key] = value;
      }
    });

    return payload;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const payload = sanitizePayload(form);
      const response = await fetch(`${API_BASE_URL}/api/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not submit property.');
      }

      setSubmitSuccess('Property submitted successfully.');

      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      setSubmitError(error.message || 'Could not submit property.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -24 },
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-slate-900 text-lg tracking-tighter">RealtyHub.</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-[260px_1fr_220px] gap-6">

        {/* ── Left sidebar ── */}
        <aside className="space-y-4">
          {/* Steps */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            {STEPS.map((step, idx) => {
              const done   = currentStep > step.id;
              const active = currentStep === step.id;
              return (
                <div key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      done   ? 'bg-emerald-500 border-emerald-500' :
                      active ? 'bg-slate-900 border-slate-900' :
                               'bg-white border-slate-300'
                    }`}>
                      {done
                        ? <Check className="w-3 h-3 text-white" />
                        : <span className={`text-[10px] font-black ${active ? 'text-white' : 'text-slate-400'}`}>{step.id}</span>
                      }
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 my-1 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className={`text-sm font-semibold leading-tight ${
                      active ? 'text-slate-900' : done ? 'text-emerald-600' : 'text-slate-400'
                    }`}>{step.label}</p>
                    <p className="text-xs text-slate-400">Step {step.id}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Property Score */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke="#10b981" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22 * propertyScore / 100} 999`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900">
                {propertyScore}%
              </span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Property Score</p>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">
                Better your score, greater your visibility
              </p>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="bg-white rounded-2xl border border-slate-200 p-8 min-h-[520px]">
          <AnimatePresence mode="wait">

            {/* Step 1 — Basic Details */}
            {currentStep === 1 && (
              <Motion.div key="s1" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }}>
                <h2 className="text-2xl font-black text-slate-900 mb-0.5">Welcome back,</h2>
                <p className="text-slate-500 text-sm mb-8">Fill out basic details about your property.</p>

                <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-700 mb-3">I'm looking to</p>
                  <div className="flex gap-2 flex-wrap">
                    {['sell', 'rent / lease', 'pg'].map(opt => (
                      <button key={opt} onClick={() => set('lookingTo', opt)}
                        className={`px-5 py-2 rounded-full border text-sm font-semibold transition-all ${
                          form.lookingTo === opt
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        {opt === 'sell' ? 'Sell' : opt === 'rent / lease' ? 'Rent / Lease' : 'PG'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">What kind of property do you have?</p>
                  <div className="flex gap-6 mb-4">
                    {['residential', 'commercial'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={() => { set('propertyCategory', cat); set('selectedType', ''); setErrors({}); }}>
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          form.propertyCategory === cat ? 'border-slate-900' : 'border-slate-400'
                        }`}>
                          {form.propertyCategory === cat && <span className="w-2 h-2 rounded-full bg-slate-900 block" />}
                        </span>
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {types.map(type => (
                      <button key={type} onClick={() => { set('selectedType', type); setErrors(e => ({...e, selectedType: ''})); }}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.selectedType === type
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {errors.selectedType && (
                    <p className="text-red-500 text-xs font-semibold mt-2">{errors.selectedType}</p>
                  )}
                </div>

                <button onClick={handleContinue}
                  className="mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-900/20">
                  Continue
                </button>
              </Motion.div>
            )}

            {/* Step 2 — Location */}
            {currentStep === 2 && (
              <Motion.div key="s2" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }}>
                <h2 className="text-2xl font-black text-slate-900 mb-0.5">Location Details</h2>
                <p className="text-slate-500 text-sm mb-5">Tell us where your property is located.</p>

                {/* Use current location */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="flex items-center gap-2 mb-6 px-5 py-2.5 rounded-xl border-2 border-dashed border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {locating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <LocateFixed className="w-4 h-4" />}
                  {locating ? 'Detecting location…' : 'Use current location'}
                </button>

                {locError && (
                  <p className="text-red-500 text-xs font-semibold mb-4 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {locError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {[
                    ['city',     'City',               'e.g. Mumbai'],
                    ['locality', 'Locality / Area',     'e.g. Bandra West'],
                    ['landmark', 'Landmark (optional)', 'e.g. Near SV Road'],
                    ['pincode',  'PIN Code',             'e.g. 400050'],
                  ].map(([key, label, placeholder]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
                      <input
                        type={key === 'pincode' ? 'tel' : 'text'}
                        value={form[key]}
                        onChange={e => { set(key, e.target.value); setErrors(err => ({...err, [key]: ''})); }}
                        placeholder={placeholder}
                        className={`w-full border rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors ${
                          errors[key] ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-900'
                        }`}
                      />
                      {errors[key] && <p className="text-red-500 text-xs">{errors[key]}</p>}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setCurrentStep(s => s - 1)}
                    className="px-8 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-400 transition-colors">
                    Back
                  </button>
                  <button onClick={handleContinue}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-900/20">
                    Continue
                  </button>
                </div>
              </Motion.div>
            )}

            {/* Step 3 — Property Profile */}
            {currentStep === 3 && (
              <Motion.div key="s3" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }}>
                <h2 className="text-2xl font-black text-slate-900 mb-0.5">Tell us about your property</h2>
                <p className="text-slate-500 text-sm mb-8">Provide details to attract the right buyers.</p>

                {/* Floor Details */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-1">Floor Details</p>
                  <p className="text-xs text-slate-400 mb-3">Total no of floors and your floor details</p>
                  <div className="flex gap-3">
                    <input
                      type="number" min="0"
                      value={form.totalFloors}
                      onChange={e => set('totalFloors', e.target.value)}
                      placeholder="Total floors in building"
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 transition-colors"
                    />
                    <select
                      value={form.floor}
                      onChange={e => set('floor', e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 outline-none focus:border-slate-900 transition-colors bg-white"
                    >
                      <option value="">Property on floor</option>
                      {['Ground', 'Lower Basement', 'Upper Basement', ...[...Array(30)].map((_, i) => String(i + 1))].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Area Details */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-1">Add Area Details</p>
                  <p className="text-xs text-slate-400 mb-3">Plot area is mandatory</p>
                  <div className="flex gap-0 border border-slate-200 rounded-xl overflow-hidden mb-2">
                    <input
                      type="number" min="0"
                      value={form.plotArea}
                      onChange={e => { set('plotArea', e.target.value); setErrors(err => ({...err, plotArea: ''})); }}
                      placeholder="Plot Area"
                      className={`flex-1 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none ${errors.plotArea ? 'border-red-400' : ''}`}
                    />
                    <select
                      value={form.plotAreaUnit}
                      onChange={e => set('plotAreaUnit', e.target.value)}
                      className="border-l border-slate-200 px-3 py-3 text-sm text-slate-600 outline-none bg-white"
                    >
                      {['sq.ft', 'sq.yards', 'sq.m', 'acres', 'marla', 'cents', 'bigha', 'kottah', 'kanal', 'grounds', 'ares'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  {errors.plotArea && <p className="text-red-500 text-xs mb-2">{errors.plotArea}</p>}
                  <div className="flex flex-wrap gap-4 mt-3">
                    {[['carpetArea','+ Carpet Area'],['builtupArea','+ Built-up Area'],['superBuiltupArea','+ Super Built-up Area']].map(([key, label]) => (
                      <div key={key}>
                        {form[key] === '' ? (
                          <button onClick={() => set(key, ' ')} className="text-sm font-semibold text-emerald-600 hover:underline">{label}</button>
                        ) : (
                          <input
                            autoFocus
                            type="number" min="0"
                            value={form[key].trim()}
                            onChange={e => set(key, e.target.value)}
                            placeholder={label.replace('+ ', '') + ' (sq.ft)'}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 w-48"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Dimensions */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-1">Property Dimensions <span className="text-slate-400 text-xs italic font-medium">(Optional)</span></p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <input
                      type="number" min="0"
                      value={form.plotLength}
                      onChange={e => set('plotLength', e.target.value)}
                      placeholder="Length of plot"
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 transition-colors"
                    />
                    <input
                      type="number" min="0"
                      value={form.plotBreadth}
                      onChange={e => set('plotBreadth', e.target.value)}
                      placeholder="Breadth of plot"
                      className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Floors Allowed */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Floors Allowed For Construction</p>
                  <input
                    type="number" min="0"
                    value={form.floorsAllowed}
                    onChange={e => set('floorsAllowed', e.target.value)}
                    placeholder="No. of floors"
                    className="w-full sm:w-64 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* Boundary Wall */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Is there a boundary wall around the property?</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Yes', 'No'].map(v => (
                      <button
                        key={v}
                        onClick={() => set('hasBoundaryWall', v)}
                        className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                          form.hasBoundaryWall === v
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Open Sides */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">No. of open sides</p>
                  <div className="flex gap-2 flex-wrap">
                    {['1', '2', '3', '3+'].map(v => (
                      <button
                        key={v}
                        onClick={() => set('openSides', v)}
                        className={`w-10 h-10 rounded-full border text-sm font-semibold transition-all ${
                          form.openSides === v
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Construction Done */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Any construction done on this property?</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Yes', 'No'].map(v => (
                      <button
                        key={v}
                        onClick={() => set('anyConstructionDone', v)}
                        className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                          form.anyConstructionDone === v
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Possession By */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Possession By</p>
                  <select
                    value={form.possessionBy}
                    onChange={e => set('possessionBy', e.target.value)}
                    className="w-full sm:w-72 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-900 transition-colors bg-white"
                  >
                    <option value="">Expected by</option>
                    <option value="Immediate">Immediate</option>
                    <option value="Within 3 months">Within 3 months</option>
                    <option value="Within 6 months">Within 6 months</option>
                    <option value="Within 1 year">Within 1 year</option>
                    <option value="After 1 year">After 1 year</option>
                  </select>
                </div>

                {/* Room Details */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-5">Add Room Details</p>

                  {[['bedrooms','No. of Bedrooms',['1','2','3','4']],['bathrooms','No. of Bathrooms',['1','2','3','4']],['balconies','Balconies',['0','1','2','3','More than 3']]].map(([key, label, opts]) => (
                    <div key={key} className="mb-5">
                      <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {opts.map(o => (
                          <button key={o} onClick={() => { set(key, o); setCustomInput(c => ({...c, [key]: false})); }}
                            className={`w-10 h-10 rounded-full border text-sm font-semibold transition-all ${
                              form[key] === o
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-300 text-slate-700 hover:border-slate-600'
                            } ${o.length > 1 ? '!w-auto px-4' : ''}`}
                          >{o}</button>
                        ))}
                        {customPills[key].map(o => (
                          <div key={o} className="flex items-center gap-1">
                            <button
                              onClick={() => { set(key, o); setCustomInput(c => ({...c, [key]: false})); }}
                              className={`w-10 h-10 rounded-full border text-sm font-semibold transition-all ${
                                form[key] === o
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-300 text-slate-700 hover:border-slate-600'
                              }`}
                            >{o}</button>
                            <button
                              onClick={() => {
                                setCustomVal(c => ({...c, [key]: o}));
                                setCustomPills(p => ({...p, [key]: p[key].filter(x => x !== o)}));
                                setCustomInput(c => ({...c, [key]: true}));
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {customInput[key] ? (
                          <>
                            <input
                              autoFocus
                              type="number" min="0"
                              value={customVal[key]}
                              onChange={e => setCustomVal(c => ({...c, [key]: e.target.value}))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && customVal[key].trim()) {
                                  const v = customVal[key].trim();
                                  setCustomPills(p => ({...p, [key]: [...p[key].filter(x => x !== v), v]}));
                                  set(key, v);
                                  setCustomInput(c => ({...c, [key]: false}));
                                  setCustomVal(c => ({...c, [key]: ''}));
                                }
                              }}
                              placeholder="Enter number"
                              className="w-28 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 transition-colors"
                            />
                            <button
                              onClick={() => {
                                const v = customVal[key].trim();
                                if (v) {
                                  setCustomPills(p => ({...p, [key]: [...p[key].filter(x => x !== v), v]}));
                                  set(key, v);
                                }
                                setCustomInput(c => ({...c, [key]: false}));
                                setCustomVal(c => ({...c, [key]: ''}));
                              }}
                              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                            >Done</button>
                          </>
                        ) : customPills[key].length === 0 && (
                          <button
                            onClick={() => setCustomInput(c => ({...c, [key]: true}))}
                            className="text-sm text-emerald-600 font-semibold hover:underline ml-1"
                          >+ Add other</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Availability Status */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Availability Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Ready to move','Under construction'].map(s => (
                      <button key={s} onClick={() => set('availabilityStatus', s)}
                        className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                          form.availabilityStatus === s
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Ownership */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-bold text-slate-800">Ownership</p>
                    <span className="w-4 h-4 rounded-full border border-slate-400 text-slate-400 text-[10px] flex items-center justify-center font-bold cursor-help" title="The type of ownership of the property.">?</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['Freehold','Leasehold','Co-operative society','Power of Attorney'].map(o => (
                      <button key={o} onClick={() => set('ownership', o)}
                        className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                          form.ownership === o
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}>{o}</button>
                    ))}
                  </div>
                </div>

                {/* Authority Approvals */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-1">Which authority the property is approved by ? <span className="text-slate-400 text-xs italic font-medium">(Optional)</span></p>
                  <div className="flex gap-2 flex-wrap mt-3">
                    {['HHB', 'HUDA', 'HSIDC'].map(authority => (
                      <button
                        key={authority}
                        onClick={() => toggleApprovedBy(authority)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.approvedBy.includes(authority)
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        + {authority}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Details */}
                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Price Details</p>
                  <div className="flex gap-3 mb-1">
                    <div className="flex-1 flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-slate-900 transition-colors">
                      <span className="px-3 text-slate-400 text-sm">₹</span>
                      <input
                        type="text"
                        value={form.price}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          const inWords = v ? Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : '';
                          setForm(f => ({ ...f, price: v, priceInWords: inWords }));
                          setErrors(err => ({...err, price: ''}));
                        }}
                        placeholder="Expected Price"
                        className="flex-1 py-3 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
                      />
                    </div>
                    <div className="flex-1 flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-slate-900 transition-colors">
                      <span className="px-3 text-slate-400 text-sm">₹</span>
                      <input
                        type="text"
                        value={form.pricePerSqYard}
                        onChange={e => set('pricePerSqYard', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Price per sq.yards"
                        className="flex-1 py-3 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                  {errors.price && <p className="text-red-500 text-xs mb-1">{errors.price}</p>}
                  {form.priceInWords && (
                    <p className="text-xs text-slate-500 mb-3">₹ {form.priceInWords}</p>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                    {[['allInclusive','All inclusive price'],['taxExcluded','Tax and Govt. charges excluded'],['priceNegotiable','Price Negotiable']].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                        <span
                          onClick={() => set(key, !form[key])}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            form[key] ? 'bg-slate-900 border-slate-900' : 'border-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {form[key] && <Check className="w-2.5 h-2.5 text-white" />}
                        </span>
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setCurrentStep(s => s - 1)}
                    className="px-8 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-400 transition-colors">
                    Back
                  </button>
                  <button onClick={handleContinue}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-900/20">
                    Continue
                  </button>
                </div>
              </Motion.div>
            )}

            {/* Step 4 — Photos */}
            {currentStep === 4 && (
              <Motion.div key="s4" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }}>
                <h2 className="text-2xl font-black text-slate-900 mb-0.5">Photos, Videos & Voice-over</h2>
                <p className="text-slate-500 text-sm mb-8">Properties with photos get 10× more enquiries.</p>

                <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center mb-4 hover:border-emerald-400 transition-colors cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden" />
                  <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700 mb-1">Upload Photos</p>
                  <p className="text-xs text-slate-400">PNG, JPG up to 10 MB each · Max 20 photos</p>
                </label>

                <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center mb-8 hover:border-emerald-400 transition-colors cursor-pointer">
                  <input type="file" accept="video/*" className="hidden" />
                  <p className="font-semibold text-slate-700 mb-1">Upload Video <span className="text-slate-400 font-normal">(optional)</span></p>
                  <p className="text-xs text-slate-400">MP4 up to 100 MB</p>
                </label>

                <div className="flex gap-3">
                  <button onClick={() => setCurrentStep(s => s - 1)}
                    className="px-8 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-400 transition-colors">
                    Back
                  </button>
                  <button onClick={handleContinue}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-900/20">
                    Continue
                  </button>
                </div>
              </Motion.div>
            )}

            {/* Step 5 — Amenities */}
            {currentStep === 5 && (
              <Motion.div key="s5" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }}>
                <h2 className="text-2xl font-black text-slate-900 mb-1">Add amenities/unique features</h2>
                <p className="text-slate-500 text-sm mb-8">These fields are used to populate USP & captions. All fields on this page are optional.</p>

                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Amenities</p>
                  <div className="flex flex-wrap gap-2.5">
                    {AMENITIES.map(a => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.amenities.includes(a)
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        + {a}
                      </button>
                    ))}

                    {form.customAmenities.map(a => (
                      <div key={a} className="flex items-center gap-1 rounded-full border border-slate-900 bg-slate-900 text-white pl-4 pr-1 py-1.5">
                        <button onClick={() => toggleAmenity(a)} className="text-sm font-medium">+ {a}</button>
                        <button
                          onClick={() => {
                            setForm(f => ({
                              ...f,
                              customAmenities: f.customAmenities.filter(x => x !== a),
                              amenities: f.amenities.filter(x => x !== a),
                            }));
                            setAmenityOtherValue(a);
                            setAmenityOtherOpen(true);
                          }}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {amenityOtherOpen ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={amenityOtherValue}
                          onChange={e => setAmenityOtherValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && amenityOtherValue.trim()) {
                              const v = amenityOtherValue.trim();
                              setForm(f => ({
                                ...f,
                                customAmenities: [...f.customAmenities.filter(x => x !== v), v],
                                amenities: [...f.amenities.filter(x => x !== v), v],
                              }));
                              setAmenityOtherValue('');
                              setAmenityOtherOpen(false);
                            }
                          }}
                          placeholder="Add custom amenity"
                          className="w-44 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 transition-colors"
                        />
                        <button
                          onClick={() => {
                            const v = amenityOtherValue.trim();
                            if (v) {
                              setForm(f => ({
                                ...f,
                                customAmenities: [...f.customAmenities.filter(x => x !== v), v],
                                amenities: [...f.amenities.filter(x => x !== v), v],
                              }));
                            }
                            setAmenityOtherValue('');
                            setAmenityOtherOpen(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                        >Done</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAmenityOtherOpen(true)}
                        className="px-4 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-600 hover:border-slate-600 transition-all"
                      >
                        + Others
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Overlooking</p>
                  <div className="flex flex-wrap gap-2.5">
                    {OVERLOOKING_OPTIONS.map(o => (
                      <button
                        key={o}
                        onClick={() => toggleMultiSelect('overlooking', o)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.overlooking.includes(o)
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        + {o}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Other Features</p>
                  <div className="space-y-3">
                    {OTHER_FEATURE_OPTIONS.map(feature => (
                      <label key={feature} className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => toggleMultiSelect('otherFeatures', feature)}>
                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          form.otherFeatures.includes(feature)
                            ? 'bg-slate-900 border-slate-900'
                            : 'border-slate-300'
                        }`}>
                          {form.otherFeatures.includes(feature) && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-sm text-slate-700">{feature}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Property facing</p>
                  <div className="flex flex-wrap gap-2.5">
                    {PROPERTY_FACING_OPTIONS.map(direction => (
                      <button
                        key={direction}
                        onClick={() => set('propertyFacing', direction)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.propertyFacing === direction
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        {direction}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-3">Width of facing road</p>
                  <div className="flex w-full sm:w-[420px] border border-slate-200 rounded-xl overflow-hidden">
                    <input
                      type="number"
                      min="0"
                      value={form.facingRoadWidth}
                      onChange={e => set('facingRoadWidth', e.target.value)}
                      placeholder="Enter the width"
                      className="flex-1 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
                    />
                    <select
                      value={form.facingRoadUnit}
                      onChange={e => set('facingRoadUnit', e.target.value)}
                      className="w-36 border-l border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none bg-white"
                    >
                      <option value="Feet">Feet</option>
                      <option value="Meter">Meter</option>
                      <option value="Yard">Yard</option>
                    </select>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-sm font-bold text-slate-800 mb-1">Location Advantages</p>
                  <p className="text-xs text-slate-500 mb-3">Highlight the nearby landmarks*</p>
                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {LOCATION_ADVANTAGE_OPTIONS.map(item => (
                      <button
                        key={item}
                        onClick={() => toggleMultiSelect('locationAdvantages', item)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          form.locationAdvantages.includes(item)
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">*Please provide correct information, otherwise your listing might get blocked</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setCurrentStep(s => s - 1)}
                    className="px-8 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-400 transition-colors">
                    Back
                  </button>
                  {submitError && (
                    <p className="text-red-500 text-sm font-semibold self-center">{submitError}</p>
                  )}
                  {submitSuccess && (
                    <p className="text-emerald-600 text-sm font-semibold self-center">{submitSuccess}</p>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold px-10 py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-900/20">
                    {submitting ? 'Saving...' : 'Save and Submit'}
                  </button>
                </div>
              </Motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* ── Right panel ── */}
        <aside className="hidden lg:block space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="font-bold text-slate-900 text-sm mb-3">Need help?</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-1">You can email us at</p>
            <p className="text-xs font-semibold text-emerald-600 mb-3">support@realtyhub.com</p>
            <p className="text-xs text-slate-400">or call us at</p>
            <p className="text-xs font-black text-slate-800 mt-0.5">1800 41 99099</p>
            <p className="text-xs text-slate-400">(IND Toll-Free)</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-emerald-700 mb-1">Pro tip</p>
            <p className="text-xs text-emerald-600 leading-relaxed">
              Adding photos increases your enquiry rate by up to <strong>10×</strong>.
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
