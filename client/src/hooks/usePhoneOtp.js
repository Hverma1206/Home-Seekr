import { useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { auth } from '../firebase';

const FIREBASE_ERRORS = {
  'auth/invalid-phone-number': 'Please enter a valid 10-digit Indian mobile number',
  'auth/missing-phone-number': 'Please enter your mobile number',
  'auth/invalid-verification-code': 'Wrong OTP. Please check the code and try again.',
  'auth/code-expired': 'This OTP has expired. Please request a new one.',
  'auth/too-many-requests': 'Too many attempts. Please try again after some time.',
  'auth/quota-exceeded': 'SMS limit reached for now. Please try again later.',
  'auth/captcha-check-failed': 'Security check failed. Please try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

// Firebase error code → readable text; otherwise our API's message; otherwise `fallback`
export const phoneOtpError = (err, fallback) =>
  FIREBASE_ERRORS[err?.code] || err?.response?.data?.message || fallback;

// Sends and checks an SMS OTP for a +91 number with Firebase Phone Auth.
// Render <div ref={recaptchaRef} /> once: the invisible reCAPTCHA lives there.
export function usePhoneOtp() {
  const recaptchaRef = useRef(null);
  const verifierRef = useRef(null);
  const confirmationRef = useRef(null);

  useEffect(
    () => () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    },
    [],
  );

  const sendCode = async (nationalNumber) => {
    // Made on the first send, not during render, so re-renders (and StrictMode's double mount) never create a
    // second one. Firebase resets it after every attempt, so Resend reuses it.
    verifierRef.current ??= new RecaptchaVerifier(auth, recaptchaRef.current, { size: 'invisible' });
    confirmationRef.current = await signInWithPhoneNumber(auth, `+91${nationalNumber}`, verifierRef.current);
  };

  // Returns the Firebase ID token that proves the number; the backend exchanges it for our JWT
  const confirmCode = async (code) => {
    const { user } = await confirmationRef.current.confirm(code);
    const idToken = await user.getIdToken();
    signOut(auth).catch(() => {}); // our JWT is the session; don't keep a second one in Firebase
    return idToken;
  };

  return { recaptchaRef, sendCode, confirmCode };
}
