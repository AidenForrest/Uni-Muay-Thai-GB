/**
 * Firebase SDK Configuration
 *
 * Initialises the Firebase app and exports the auth instance.
 * Configuration values are loaded from environment variables (.env file).
 *
 * This is used primarily by:
 * - AuthContext.tsx for listening to auth state changes
 * - Logout functionality to clear Firebase SDK session
 *
 * Note: The actual authentication flow uses the Firebase REST API
 * (see firebaseAuth.ts) for more control over token management.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration - values from .env file
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialise Firebase app
const app = initializeApp(firebaseConfig);

// Export auth instance for use throughout the app
export const auth = getAuth(app);
export default app;