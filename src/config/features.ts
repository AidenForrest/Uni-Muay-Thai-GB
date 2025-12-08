/**
 * Application Configuration
 *
 * Central configuration for API endpoints, Firebase settings, and development options.
 * Uses `as const` for TypeScript literal type inference.
 */

export const CONFIG = {
  // API base URL - empty string because requests are proxied via package.json (dev)
  // and Netlify _redirects (production) to avoid CORS issues
  API_BASE_URL: '',

  // Firebase REST API configuration
  // These are used by firebaseAuth.ts for the custom auth flow
  FIREBASE_AUTH_API_KEY: 'AIzaSyAMaNGvMko_b0zl8igwnJC3552h_I_AplE',
  FIREBASE_REST_AUTH_URL: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
  FIREBASE_TOKEN_EXCHANGE_URL: 'https://securetoken.googleapis.com/v1/token',

  // Development/Demo settings
  MOCK_API_DELAY: 500,  // Simulated network delay (ms) for mock medical endpoints
  DEBUG_API_CALLS: process.env.NODE_ENV === 'development',
} as const;