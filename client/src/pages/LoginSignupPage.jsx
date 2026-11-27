import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Phone, User, CheckCircle, Shield, Building2, Mail, Lock } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import VerifyContact from '../components/VerifyContact';
import PhoneLogin from '../components/PhoneLogin';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

const ROLE_OPTIONS = [
  { value: 'buyer', label: 'Buyer / Tenant', hint: 'Looking for a property' },
  { value: 'owner', label: 'Owner', hint: 'Selling or renting my own property' },
  { value: 'broker', label: 'Agent / Broker', hint: 'Listing properties for clients' },
  { value: 'builder', label: 'Builder', hint: 'Listing my projects' },
];

const needsCompany = (role) => role === 'broker' || role === 'builder';

const stepMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const fieldClass =
  'flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3.5 focus-within:border-slate-900 transition-colors';

const LoginSignupPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, updateUser } = useAuth();
  const redirectTo = location.state?.from && location.state.from !== '/login' ? location.state.from : '/';

  const [step, setStep] = useState('phone'); // 'phone' | 'details' | 'verify-email' | 'verify-phone' | 'success'
  // TEMPORARY: email + password login alongside OTP, until the SMS provider is integrated
  const [method, setMethod] = useState('otp'); // 'otp' | 'email'
  const [emailMode, setEmailMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  // Firebase ID token of a just-verified new number, reused to save its name / role
  const [phoneIdToken, setPhoneIdToken] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('buyer');
  const [companyName, setCompanyName] = useState('');
  const [welcomeName, setWelcomeName] = useState('');
  // Account just created by email signup, while its email and phone get verified
  const [verifyUser, setVerifyUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Someone who is already logged in has nothing to do here
  if (isAuthenticated && !['success', 'details', 'verify-email', 'verify-phone'].includes(step)) {
    return <Navigate to={redirectTo} replace />;
  }

  const completeLogin = ({ token, user }, fallbackName = '') => {
    setWelcomeName(user?.firstName || fallbackName);
    login({ token, user });
    finish();
  };

  const finish = () => {
    setStep('success');
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess(redirectTo);
      } else {
        navigate(redirectTo, { replace: true });
      }
    }, 1200);
  };

  // Name / role / company checks shared by OTP signup and email signup
  const validateSignupDetails = () => {
    if (!name.trim()) return 'Please enter your name';
    if (needsCompany(role) && !companyName.trim()) {
      return role === 'broker' ? 'Please enter your agency / firm name' : 'Please enter your company name';
    }
    return '';
  };

  const buildSignupDetails = () => {
    const [firstName, ...rest] = name.trim().split(/\s+/);
    const details = { firstName, lastName: rest.join(' '), role };
    if (needsCompany(role)) details.companyName = companyName.trim();
    return details;
  };

  const handleEmailSubmit = async () => {
    const isSignup = emailMode === 'signup';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < (isSignup ? 6 : 1)) {
      setError(isSignup ? 'Password must be at least 6 characters' : 'Please enter your password');
      return;
    }
    if (isSignup) {
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        setError('Please enter a valid 10-digit Indian mobile number');
        return;
      }
      const detailsError = validateSignupDetails();
      if (detailsError) {
        setError(detailsError);
        return;
      }
    }

    setError('');
    setLoading(true);
    try {
      const response = isSignup
        ? await authService.registerWithEmail({
            email: email.trim(),
            password,
            phoneNumber: mobile,
            ...buildSignupDetails(),
          })
        : await authService.loginWithEmail(email.trim(), password);
      if (isSignup) {
        // Log in first (the verify calls need the token), then verify email and phone before moving on
        const { token, user } = response.data.data;
        login({ token, user });
        setWelcomeName(user?.firstName || buildSignupDetails().firstName);
        setVerifyUser(user);
        setStep('verify-email');
      } else {
        completeLogin(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isSignup ? 'Failed to create account.' : 'Failed to log in.') + ' Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMethod = (nextMethod) => {
    setMethod(nextMethod);
    setStep('phone');
    setError('');
    setPassword('');
  };

  // PhoneLogin has already saved the session; a number without a name still has to finish signup
  const handlePhoneLogin = ({ user }, idToken) => {
    if (user?.firstName) {
      setWelcomeName(user.firstName);
      finish();
    } else {
      setPhoneIdToken(idToken);
      setStep('details');
    }
  };

  const handleSaveDetails = async () => {
    const detailsError = validateSignupDetails();
    if (detailsError) {
      setError(detailsError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const details = buildSignupDetails();
      const response = await authService.phoneLogin(phoneIdToken, details);
      completeLogin(response.data.data, details.firstName);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const errorLine = error && (
    <Motion.p
      role="alert"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-red-500 text-xs font-medium -mt-2"
    >
      {error}
    </Motion.p>
  );

  // Name / role / company fields, shown for a new number after OTP and on email signup
  const signupFields = (
    <div className="space-y-5 pt-2">
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Your Name
        </label>
        <div className={fieldClass}>
          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          I am a
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={role === option.value}
              onClick={() => setRole(option.value)}
              className={`text-left rounded-2xl border-2 px-3 py-2.5 transition-colors ${
                role === option.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className="block text-sm font-bold text-slate-900">{option.label}</span>
              <span className="block text-[11px] text-slate-500 leading-snug">{option.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {needsCompany(role) && (
        <div className="space-y-1.5">
          <label htmlFor="signup-company" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {role === 'broker' ? 'Agency / Firm Name' : 'Company Name'}
          </label>
          <div className={fieldClass}>
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              id="signup-company"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={role === 'broker' ? 'e.g. Sharma Realty' : 'e.g. Prestige Group'}
              className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
            />
          </div>
          <p className="text-[11px] text-slate-400">Buyers see this name on your listings.</p>
        </div>
      )}
    </div>
  );

  const renderMobileField = (id, autoFocus = false) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Mobile Number
      </label>
      <div className={fieldClass}>
        <div className="flex items-center gap-2 pr-3 border-r border-slate-200 flex-shrink-0">
          <Phone className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-900">+91</span>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(-10))}
          placeholder="Enter 10-digit number"
          className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
        />
      </div>
    </div>
  );

  const methodTabs = (
    <div role="tablist" aria-label="Login method" className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl">
      {[
        { value: 'otp', label: 'Mobile OTP', icon: <Phone className="w-4 h-4" /> },
        { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
      ].map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={method === value}
          onClick={() => switchMethod(value)}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
            method === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <Motion.div
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
          <Motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="hidden md:flex flex-col justify-between bg-slate-900 text-white p-12"
          >
            <div className="space-y-6">
              <Badge variant="accent">Secure Login</Badge>
              <h2 className="text-4xl font-black tracking-tighter leading-tight">
                Your dream home,<br />just a step away.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Buyers find homes, owners and agents list their inventory and get enquiries —
                all from one account.
              </p>
            </div>

            <div className="space-y-3 mt-10">
              {[
                'Browse listings from owners, agents and builders',
                'List your property or inventory for free',
                'Get buyer enquiries straight to your dashboard',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  </div>
                  {feat}
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                Your number is shared <span className="text-white font-semibold">only with the owners or agents you contact</span>,
                never with third parties.
              </p>
            </div>
          </Motion.div>

          {/* ── Right form panel ── */}
          <Motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-white p-8 md:p-12 flex flex-col justify-center"
          >
            <AnimatePresence mode="wait">

              {/* Step 1 — Mobile + OTP (Firebase Phone Auth) */}
              {step === 'phone' && method === 'otp' && (
                <Motion.div key="phone" {...stepMotion} className="space-y-6">
                  {methodTabs}

                  <PhoneLogin onSuccess={handlePhoneLogin} />

                  <p className="text-center text-xs text-slate-400">
                    By continuing, you agree to our{' '}
                    <span className="text-slate-900 font-semibold underline cursor-pointer">Terms</span>
                    {' '}&amp;{' '}
                    <span className="text-slate-900 font-semibold underline cursor-pointer">Privacy Policy</span>
                  </p>
                </Motion.div>
              )}

              {/* TEMPORARY: Email + password (login or signup) */}
              {step === 'phone' && method === 'email' && (
                <Motion.form
                  key={`email-${emailMode}`}
                  {...stepMotion}
                  className="space-y-6"
                  onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }}
                >
                  {methodTabs}

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                      {emailMode === 'signup' ? 'Create your account.' : 'Welcome back.'}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      {emailMode === 'signup'
                        ? 'Sign up with your email and a password.'
                        : 'Log in with your email and password.'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Email
                    </label>
                    <div className={fieldClass}>
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Password
                    </label>
                    <div className={fieldClass}>
                      <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <input
                        id="login-password"
                        type="password"
                        autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={emailMode === 'signup' ? 'At least 6 characters' : 'Your password'}
                        className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {emailMode === 'signup' && (
                    <>
                      <div className="space-y-1">
                        {renderMobileField('signup-mobile')}
                        <p className="text-[11px] text-slate-400">Shared only with the owners or agents you contact.</p>
                      </div>
                      {signupFields}
                    </>
                  )}

                  {errorLine}

                  <Button type="submit" variant="primary" className="w-full !py-4" disabled={loading}>
                    {loading
                      ? emailMode === 'signup' ? 'Creating account…' : 'Logging in…'
                      : emailMode === 'signup' ? 'Create Account →' : 'Login →'}
                  </Button>

                  <p className="text-center text-sm text-slate-500">
                    {emailMode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode(emailMode === 'signup' ? 'login' : 'signup');
                        setError('');
                      }}
                      className="text-emerald-600 font-semibold hover:underline"
                    >
                      {emailMode === 'signup' ? 'Log in' : 'Create an account'}
                    </button>
                  </p>
                </Motion.form>
              )}

              {/* Step 2 — a new number: name, role and company */}
              {step === 'details' && (
                <Motion.form
                  key="details"
                  {...stepMotion}
                  className="space-y-6"
                  onSubmit={(e) => { e.preventDefault(); handleSaveDetails(); }}
                >
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Create your account.</h3>
                    <p className="text-slate-500 text-sm mt-1">Your number is verified. Tell us a little about you.</p>
                  </div>

                  {signupFields}

                  {errorLine}

                  <Button type="submit" variant="primary" className="w-full !py-4" disabled={loading}>
                    {loading ? 'Saving…' : 'Create Account →'}
                  </Button>
                </Motion.form>
              )}

              {/* After email signup — verify email, then phone */}
              {(step === 'verify-email' || step === 'verify-phone') && verifyUser && (
                <Motion.div key={step} {...stepMotion} className="space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Step {step === 'verify-email' ? 1 : 2} of 2
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter mt-1">
                      {step === 'verify-email' ? 'Confirm your email.' : 'Confirm your phone.'}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      {step === 'verify-email'
                        ? 'Your account is ready. Verify your email so we can reach you about your account.'
                        : 'A verified number is needed to post a property or contact owners. You can also do this later from your profile.'}
                    </p>
                  </div>

                  {step === 'verify-email' ? (
                    <VerifyContact
                      key="email"
                      channel="email"
                      target={verifyUser.email}
                      autoSend
                      onVerified={(user) => {
                        updateUser(user);
                        setVerifyUser(user);
                        setTimeout(() => setStep('verify-phone'), 700);
                      }}
                      onSkip={() => setStep('verify-phone')}
                    />
                  ) : (
                    <VerifyContact
                      key="phone"
                      channel="phone"
                      target={verifyUser.pendingPhoneNumber || verifyUser.phoneNumber}
                      autoSend
                      allowChangeNumber
                      onVerified={(user) => {
                        updateUser(user);
                        setTimeout(finish, 700);
                      }}
                      onSkip={finish}
                    />
                  )}
                </Motion.div>
              )}

              {/* Step 3 — Success */}
              {step === 'success' && (
                <Motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center space-y-5 py-10"
                >
                  <Motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </Motion.div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                      You're in{welcomeName ? `, ${welcomeName}` : ''}!
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">Taking you back…</p>
                  </div>
                </Motion.div>
              )}

            </AnimatePresence>
          </Motion.div>
        </div>
      </div>
    </Motion.div>
  );
};

export default LoginSignupPage;
