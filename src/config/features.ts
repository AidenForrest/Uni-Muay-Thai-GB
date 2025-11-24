// Feature configuration for Muay Thai GB app

export const CONFIG = {
  // Toggle between mock API and real API
  USE_MOCK_API: false,
  
  // API configuration
  // Use relative URL in both dev and production (proxied via package.json and Netlify _redirects)
  API_BASE_URL: '',
  FIREBASE_AUTH_API_KEY: 'AIzaSyAMaNGvMko_b0zl8igwnJC3552h_I_AplE',
  FIREBASE_REST_AUTH_URL: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
  FIREBASE_TOKEN_EXCHANGE_URL: 'https://securetoken.googleapis.com/v1/token',
  
  // Development settings
  MOCK_API_DELAY: 500, // Milliseconds to simulate network delay in mock mode
  DEBUG_API_CALLS: process.env.NODE_ENV === 'development',
} as const;