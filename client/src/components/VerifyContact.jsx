import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Mail, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import OTPInput from './ui/OTPInput';
import { authService } from '../services/authService';
import { usePhoneOtp, phoneOtpError as errorMessage } from '../hooks/usePhoneOtp';

const RESEND_SECONDS = 30;

// Verify the logged-in account's email address or phone number with a 6-digit code.
// channel: 'email' | 'phone'. target: the address / number shown to the user.
// onVerified(user) gets the updated user from the server. onSkip, when given, shows a "Skip for now" link.
const VerifyContact = ({ channel, target, autoSend = false, onVerified, onSkip, allowChangeNumber = false, className = '' }) => {
  const isPhone = channel === 'phone';
  const [sentTo, setSentTo] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devMode, setDevMode] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [verified, setVerified] = useState(false);
  // No number yet (an account without one): start by asking for it
  const [editingNumber, setEditingNumber] = useState(isPhone && allowChangeNumber && !target);
  const [newNumber, setNewNumber] = useState('');
  const autoSent = useRef(false);
  // Phone codes go through Firebase Phone Auth; email codes through our API
  const { recaptchaRef, sendCode, confirmCode } = usePhoneOtp();

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const send = async (numberOverride) => {
    setBusy(true);
    setError('');
    try {
      if (isPhone) {
        const number = numberOverride || target;
        await sendCode(number);
        setSentTo(`+91 ${number}`);
      } else {
        const data = (await authService.sendEmailOtp()).data?.data || {};
        setSentTo(data.email);
        setDevMode(Boolean(data.devMode));
      }
      setOtp('');
      setResendIn(RESEND_SECONDS);
      setEditingNumber(false);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the code. Please try again.'));
      // "Please wait N seconds" means a code is already on its way
      const wait = Number(/wait (\d+) seconds/.exec(err?.response?.data?.message || '')?.[1]);
      if (wait) {
        setSentTo((current) => current || (isPhone ? `+91 ${target}` : target));
        setResendIn(wait);
      }
    } finally {
      setBusy(false);
    }
  };

  const sendNewNumber = () => {
    if (!/^[6-9]\d{9}$/.test(newNumber)) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    send(newNumber);
  };

  const sendOnMount = useEffectEvent(() => send());
  useEffect(() => {
    // Guard against the double-run of effects in development (StrictMode), which would trip the resend limit
    // (A phone with no number yet waits for the user to type one)
    if (!autoSend || autoSent.current || (isPhone && !target)) return;
    autoSent.current = true;
    sendOnMount();
  }, [autoSend, isPhone, target]);

  const verify = async (code = otp) => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = isPhone
        ? await authService.verifyPhone(await confirmCode(code))
        : await authService.verifyEmailOtp(code);
      setVerified(true);
      onVerified?.(response.data?.data?.user);
    } catch (err) {
      setError(errorMessage(err, 'Could not verify the code. Please try again.'));
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const Icon = isPhone ? Phone : Mail;
  const title = isPhone ? 'Verify your phone number' : 'Verify your email';
  const displayTarget = isPhone && target ? `+91 ${target}` : target;

  if (verified) {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 ${className}`}>
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="text-sm font-semibold text-emerald-800">
          {isPhone ? 'Phone number verified' : 'Email verified'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 text-left ${className}`}
      // No <form> here, so this works inside other forms (profile, property form). Enter in a code box verifies
      // instead of submitting the surrounding form.
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
        e.preventDefault();
        if (sentTo && !editingNumber) verify();
      }}
    >
      <div ref={recaptchaRef} />
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500 break-words">
            {sentTo
              ? <>Enter the 6-digit code sent to <span className="font-semibold text-slate-800">{sentTo}</span></>
              : <>We'll send a 6-digit code to <span className="font-semibold text-slate-800">{displayTarget || 'you'}</span></>}
          </p>
          {devMode && (
            <p className="text-xs text-amber-600 font-medium mt-1">
              Dev mode: no {isPhone ? 'SMS' : 'email'} key configured, so the code is printed in the server console.
            </p>
          )}
        </div>
      </div>

      {editingNumber ? (
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 focus-within:border-slate-900">
            <span className="text-sm font-bold text-slate-900">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, '').slice(-10))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendNewNumber();
                }
              }}
              placeholder="New mobile number"
              aria-label="New mobile number"
              className="flex-1 min-w-0 py-2.5 text-sm outline-none bg-transparent"
            />
          </div>
          <button type="button" onClick={sendNewNumber} disabled={busy} className="px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60">
            Send code
          </button>
        </div>
      ) : sentTo ? (
        <div className="space-y-3">
          <OTPInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              if (value.length === 6) verify(value);
            }}
            length={6}
            disabled={busy}
            autoFocus
          />
          <button
            type="button"
            onClick={() => verify()}
            disabled={busy || otp.length !== 6}
            className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Checking…' : 'Verify'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => send()}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? 'Sending…' : 'Send code'}
        </button>
      )}

      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-3">
          {sentTo && !editingNumber && (
            resendIn > 0 ? (
              <span className="text-slate-400">Resend in {resendIn}s</span>
            ) : (
              <button type="button" onClick={() => send()} disabled={busy} className="font-semibold text-emerald-600 hover:underline">
                Resend code
              </button>
            )
          )}
          {isPhone && allowChangeNumber && (
            <button
              type="button"
              onClick={() => {
                setEditingNumber((v) => !v);
                setError('');
              }}
              className="font-semibold text-slate-500 hover:text-slate-900"
            >
              {editingNumber ? 'Cancel' : 'Change number'}
            </button>
          )}
        </div>
        {onSkip && (
          <button type="button" onClick={onSkip} className="font-semibold text-slate-500 hover:text-slate-900">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyContact;
