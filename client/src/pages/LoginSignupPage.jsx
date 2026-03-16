import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const LoginSignupPage = ({ onViewChange, onLoginSuccess }) => {
  const [step, setStep] = useState('input'); // 'input' | 'otp' | 'success'
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleSendOTP = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setError('');
    setLoading(true);
    // Simulated API delay — replace with real OTP API call
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep('otp');
    setResendTimer(30);
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.join('').length < 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    // Simulated verification — replace with real OTP verification
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep('success');
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        onViewChange('home');
      }
    }, 2200);
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setOtp(['', '', '', '', '', '']);
    setResendTimer(30);
  };

  const resetToInput = () => {
    setStep('input');
    setError('');
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-900/75" />
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden rounded-[2.5rem] shadow-2xl shadow-slate-900/40">

          {/* ── Left editorial panel ── */}
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="hidden md:flex flex-col justify-between bg-slate-900 text-white p-12"
          >
            <div className="space-y-6">
              <Badge variant="accent">100% Secure · OTP Only</Badge>
              <h2 className="text-4xl font-black tracking-tighter leading-tight">
                Your dream home,<br />just a step away.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Join thousands of homebuyers and investors who trust RealtyHub to
                find premium properties across India. No passwords — ever.
              </p>
            </div>

            <div className="space-y-3 mt-10">
              {[
                '100K+ Verified Listings',
                'Zero Brokerage Deals',
                'Instant OTP Login — No Password Needed',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  </div>
                  {feat}
                </div>
              ))}
            </div>

            {/* Security badge */}
            <div className="mt-10 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                Your number is <span className="text-white font-semibold">never shared</span> with
                third parties or property owners.
              </p>
            </div>
          </motion.div>

          {/* ── Right form panel ── */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-white p-8 md:p-12 flex flex-col justify-center"
          >
            <AnimatePresence mode="wait">

              {/* Step 1 — Name + Mobile */}
              {step === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                      Welcome to RealtyHub.
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Sign in or create your account — it's the same flow.
                    </p>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Your Name
                    </label>
                    <div className="flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3.5 focus-within:border-slate-900 transition-colors">
                      <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                        placeholder="e.g. Rahul Sharma"
                        className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Mobile Number
                    </label>
                    <div className="flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3.5 focus-within:border-slate-900 transition-colors">
                      <div className="flex items-center gap-2 pr-3 border-r border-slate-200 flex-shrink-0">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-900">+91</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={mobile}
                        onChange={(e) =>
                          setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                        placeholder="Enter 10-digit number"
                        maxLength={10}
                        className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs font-medium -mt-2"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    variant="primary"
                    className="w-full !py-4"
                    onClick={handleSendOTP}
                    disabled={loading}
                  >
                    {loading ? 'Sending OTP…' : 'Send OTP →'}
                  </Button>

                  <p className="text-center text-xs text-slate-400">
                    By continuing, you agree to our{' '}
                    <span className="text-slate-900 font-semibold underline cursor-pointer">Terms</span>
                    {' '}&amp;{' '}
                    <span className="text-slate-900 font-semibold underline cursor-pointer">Privacy Policy</span>
                  </p>
                </motion.div>
              )}

              {/* Step 2 — OTP */}
              {step === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <button
                    onClick={resetToInput}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Change number
                  </button>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                      Verify your number.
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      OTP sent to{' '}
                      <span className="font-semibold text-slate-900">+91 {mobile}</span>
                    </p>
                  </div>

                  {/* OTP boxes */}
                  <div className="flex gap-2 sm:gap-3 justify-between">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleOTPChange(i, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                        maxLength={1}
                        className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-black text-slate-900 border-2 border-slate-200 rounded-2xl focus:border-slate-900 outline-none transition-colors"
                      />
                    ))}
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs font-medium -mt-2"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    variant="primary"
                    className="w-full !py-4"
                    onClick={handleVerifyOTP}
                    disabled={loading}
                  >
                    {loading ? 'Verifying…' : 'Verify & Continue →'}
                  </Button>

                  <p className="text-center text-sm text-slate-500">
                    Didn't receive it?{' '}
                    {resendTimer > 0 ? (
                      <span className="text-slate-400">Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        onClick={handleResendOTP}
                        className="text-emerald-600 font-semibold hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </p>
                </motion.div>
              )}

              {/* Step 3 — Success */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center space-y-5 py-10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </motion.div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                      You're in, {name.split(' ')[0]}!
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">Redirecting you to the homepage…</p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginSignupPage;
