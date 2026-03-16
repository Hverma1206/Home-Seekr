import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PROPERTY_TYPES_RESIDENTIAL = [
  'Flat / Apartment',
  'Independent House / Villa',
  'Independent / Builder Floor',
  'Plot / Land',
  '1 RK / Studio Apartment',
  'Serviced Apartment',
  'Farmhouse',
  'Other',
];

const PROPERTY_TYPES_COMMERCIAL = [
  'Office Space',
  'Shop / Showroom',
  'Warehouse / Godown',
  'Industrial Building',
  'Industrial Shed',
  'Other Business',
  'Agriculture Land',
  'Plot / Land',
];

const BENEFITS = [
  'Advertise for FREE',
  'Get unlimited enquiries',
  'Get shortlisted buyers and tenants',
  'Assistance in co-ordinating site visits',
];

function OwnerBrokerModal({ onClose, onSubmit }) {
  const [role, setRole] = useState('owner');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black text-slate-900 mb-6">
          Enter details to continue
        </h2>

        <p className="text-sm font-semibold text-slate-700 mb-3">You are</p>

        <div className="flex gap-3 mb-5">
          {['owner', 'broker'].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-6 py-2.5 rounded-full border-2 text-sm font-bold capitalize transition-all ${
                role === r
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-400'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          Please choose accurately. You won't be able to change this in the future.
        </p>

        <button
          onClick={() => onSubmit(role)}
          className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          Submit
        </button>
      </motion.div>
    </motion.div>
  );
}

const PostPropertyPage = () => {
  const navigate = useNavigate();
  const [lookingTo, setLookingTo] = useState('sell');
  const [propertyCategory, setPropertyCategory] = useState('residential');
  const [selectedType, setSelectedType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [typeError, setTypeError] = useState(false);

  const types =
    propertyCategory === 'residential'
      ? PROPERTY_TYPES_RESIDENTIAL
      : PROPERTY_TYPES_COMMERCIAL;

  const handleStart = () => {
    if (!selectedType) {
      setTypeError(true);
      return;
    }
    setTypeError(false);
    setShowModal(true);
  };

  const handleModalSubmit = (role) => {
    setShowModal(false);
    navigate('/post-property/form', {
      state: { role, lookingTo, propertyCategory, selectedType },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative"
    >
      <AnimatePresence>
        {showModal && (
          <OwnerBrokerModal
            onClose={() => setShowModal(false)}
            onSubmit={handleModalSubmit}
          />
        )}
      </AnimatePresence>
      {/* Page background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50" />

      <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-16">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden rounded-[2.5rem] shadow-2xl shadow-blue-900/40">

          {/* ── Left panel ── */}
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="hidden md:flex flex-col justify-between bg-slate-900 text-white p-12"
          >
            <div className="space-y-6">
              <h2 className="text-4xl font-black tracking-tight leading-tight">
                Sell or Rent Property{' '}
                <span className="text-emerald-400">online faster</span>{' '}
                with RealtyHub.
              </h2>

              <ul className="space-y-4 mt-8">
                {BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-base text-slate-300">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {b}
                    {i >= 2 && <span className="text-blue-300 text-xs">*</span>}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-slate-400 mt-10">
              * Available with Owner Assist Plans
            </p>
          </motion.div>

          {/* ── Right form panel ── */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-white p-8 md:p-10 flex flex-col justify-center"
          >
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
              Start posting your property, it's free
            </h3>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
              Add Basic Details
            </p>

            {/* You're looking to */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-600 mb-3">
                You're looking to ...
              </p>
              <div className="flex gap-2 flex-wrap">
                {['sell', 'rent / lease', 'pg'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLookingTo(opt)}
                    className={`px-5 py-2 rounded-full border text-sm font-semibold capitalize transition-all ${
                      lookingTo === opt
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {opt === 'sell' ? 'Sell' : opt === 'rent / lease' ? 'Rent / Lease' : 'PG'}
                  </button>
                ))}
              </div>
            </div>

            {/* And it's a */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-600 mb-3">
                And it's a ...
              </p>
              <div className="flex gap-6">
                {['residential', 'commercial'].map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <span
                      onClick={() => {
                        setPropertyCategory(cat);
                        setSelectedType('');
                      }}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        propertyCategory === cat
                          ? 'border-emerald-500'
                          : 'border-slate-400'
                      }`}
                    >
                      {propertyCategory === cat && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                      )}
                    </span>
                    <span
                      className="text-sm font-medium text-slate-700 capitalize"
                      onClick={() => {
                        setPropertyCategory(cat);
                        setSelectedType('');
                        setTypeError(false);
                      }}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Property type grid */}
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-2">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setTypeError(false); }}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      selectedType === type
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {typeError && (
              <p className="text-red-500 text-xs font-semibold mb-4 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                Please select a property type to continue.
              </p>
            )}

            {/* Start now */}
            <button
              onClick={handleStart}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-slate-900/20"
            >
              Start now
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default PostPropertyPage;
