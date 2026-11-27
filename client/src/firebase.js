import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Used only for Phone Auth (SMS OTP). Our own JWT from the backend is the login session.
const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
});

export const auth = getAuth(app);
