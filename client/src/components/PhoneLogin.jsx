import { useEffect, useState } from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import Button from './ui/Button';
import OTPInput from './ui/OTPInput';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { usePhoneOtp, phoneOtpError } from '../hooks/usePhoneOtp';

const RESEND_SECONDS = 30;

// Mobile number + OTP login with Firebase Phone Auth. After the OTP, the Firebase ID token goes to
// POST /api/auth/phone-login, and the JWT it returns is saved (localStorage, via AuthContext).
// onSuccess({ token, user, isNewUser }, idToken) runs after that.
export default function PhoneLogin({ onSuccess }) {
  const { login } = useAuth();
  const { recaptchaRef, sendCode, confirmCode } = usePhoneOtp();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const send = async (isResend = false) => {
    if (loading) return;
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await sendCode(mobile);
      setOtp('');
      setStep('otp');
      setResendIn(RESEND_SECONDS);
      if (isResend) setInfo('A new OTP has been sent.');
    } catch (err) {
      setError(phoneOtpError(err, 'Failed to send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code = otp) => {
    if (loading) return;
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const idToken = await confirmCode(code);
      const response = await authService.phoneLogin(idToken);
      const data = response.data.data;
      login({ token: data.token, user: data.user });
      onSuccess?.(data, idToken);
    } catch (err) {
      setError(phoneOtpError(err, 'Failed to verify OTP. Please try again.'));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const errorLine = error && (
    <p role="alert" className="text-red-500 text-xs font-medium -mt-2">{error}</p>
  );

  return (
    <div>
      <div ref={recaptchaRef} />

      {step === 'phone' ? (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Login or Sign up</h3>
            <p className="text-slate-500 text-sm mt-1">
              Enter your mobile number. New here? We'll set up your account after the OTP.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-mobile" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Mobile Number
            </label>
            <div className="flex items-center gap-3 border border-slate-200 rounded-2xl px-4 py-3.5 focus-within:border-slate-900 transition-colors">
              <div className="flex items-center gap-2 pr-3 border-r border-slate-200 flex-shrink-0">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-900">+91</span>
              </div>
              <input
                id="login-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(-10))}
                placeholder="Enter 10-digit number"
                className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
              />
            </div>
          </div>

          {errorLine}

          <Button type="submit" variant="primary" className="w-full !py-4" disabled={loading}>
            {loading ? 'Sending OTP…' : 'Send OTP →'}
          </Button>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <button
            type="button"
            onClick={() => { setStep('phone'); setError(''); setInfo(''); setOtp(''); }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Change number
          </button>

          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Enter the OTP</h3>
            <p className="text-slate-500 text-sm mt-1">
              OTP sent to <span className="font-semibold text-slate-900">+91 {mobile}</span>
            </p>
          </div>

          <OTPInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              if (value.length === 6) verify(value);
            }}
            length={6}
            disabled={loading}
            autoFocus
          />

          {errorLine}
          {info && !error && <p className="text-emerald-600 text-xs font-medium -mt-2">{info}</p>}

          <Button type="submit" variant="primary" className="w-full !py-4" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify →'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            Didn't receive it?{' '}
            {resendIn > 0 ? (
              <span className="text-slate-400">Resend in {resendIn}s</span>
            ) : (
              <button
                type="button"
                onClick={() => send(true)}
                disabled={loading}
                className="text-emerald-600 font-semibold hover:underline"
              >
                Resend OTP
              </button>
            )}
          </p>
        </form>
      )}
    </div>
  );
}
