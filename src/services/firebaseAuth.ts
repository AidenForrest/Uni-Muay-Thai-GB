/**
 * Firebase REST API Authentication Service
 *
 * This service handles authentication via Firebase's REST API endpoints
 * rather than the Firebase SDK. This approach is used because:
 * 1. It provides more control over token management
 * 2. The access tokens can be used directly as Bearer tokens for the MTGB API
 * 3. It allows for custom token refresh logic
 *
 * Authentication flow:
 * 1. Sign in with email/password -> Get refresh token
 * 2. Exchange refresh token -> Get access token (used as Bearer token)
 * 3. Auto-refresh access token before expiry (5 minute buffer)
 */

import { CONFIG } from '../config/features';
import {
  FirebaseSignInRequest,
  FirebaseSignInResponse,
  FirebaseTokenExchangeResponse,
  ApiResponse,
} from '../types/api.types';

/**
 * Manages Firebase authentication tokens for the application.
 * Stores tokens in memory and handles automatic refresh before expiry.
 */
export class FirebaseAuthService {
  private accessToken: string | null = null;      // Bearer token for API calls
  private refreshToken: string | null = null;     // Long-lived token for getting new access tokens
  private tokenExpiresAt: number | null = null;   // Timestamp when access token expires

  /**
   * Authenticates a user with email and password.
   *
   * This is a two-step process:
   * 1. Sign in with Firebase to get a refresh token
   * 2. Exchange the refresh token for an access token
   *
   * The access token is what we use as a Bearer token for MTGB API calls.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Access token, user ID, and email on success
   */
  async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<ApiResponse<{ token: string; uid: string; email: string }>> {
    try {
      // Step 1: Sign in with Firebase to get refresh token
      const signInResult = await this.firebaseSignIn(email, password);
      if (!signInResult.success || !signInResult.data) {
        return {
          success: false,
          error: signInResult.error || 'Firebase sign in failed',
        };
      }

      // Step 2: Exchange refresh token for access token
      const tokenResult = await this.exchangeRefreshToken(signInResult.data.refreshToken);
      if (!tokenResult.success || !tokenResult.data) {
        return {
          success: false,
          error: tokenResult.error || 'Failed to exchange tokens',
        };
      }

      // Store tokens in memory for later use
      this.accessToken = tokenResult.data.access_token;
      this.refreshToken = signInResult.data.refreshToken;
      this.tokenExpiresAt = Date.now() + (parseInt(tokenResult.data.expires_in) * 1000);

      return {
        success: true,
        data: {
          token: this.accessToken,
          uid: signInResult.data.localId,
          email: signInResult.data.email,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Returns a valid access token for API calls.
   *
   * This method handles automatic token refresh - if the current token
   * is expired or will expire within 5 minutes, it refreshes first.
   * This prevents API calls from failing due to expired tokens.
   *
   * @returns Valid access token, or null if not authenticated
   */
  async getBearerToken(): Promise<string | null> {
    if (!this.accessToken || !this.refreshToken) {
      return null;
    }

    // Check if token is expired or will expire within 5 minutes (300000ms)
    const FIVE_MINUTES = 300000;
    if (this.tokenExpiresAt && Date.now() > (this.tokenExpiresAt - FIVE_MINUTES)) {
      // Token needs refresh - attempt to get a new one
      const refreshResult = await this.exchangeRefreshToken(this.refreshToken);
      if (refreshResult.success && refreshResult.data) {
        this.accessToken = refreshResult.data.access_token;
        this.tokenExpiresAt = Date.now() + (parseInt(refreshResult.data.expires_in) * 1000);
        return this.accessToken;
      } else {
        // Refresh failed - user needs to log in again
        this.signOut();
        return null;
      }
    }

    return this.accessToken;
  }

  /**
   * Clears all stored tokens, effectively logging out the user.
   */
  signOut(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Calls the Firebase REST API to authenticate with email/password.
   * Returns a refresh token that can be exchanged for an access token.
   *
   * Firebase REST Auth endpoint:
   * https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
   */
  private async firebaseSignIn(email: string, password: string): Promise<ApiResponse<FirebaseSignInResponse>> {
    const requestBody: FirebaseSignInRequest = {
      email,
      password,
      returnSecureToken: true,
    };

    const response = await fetch(
      `${CONFIG.FIREBASE_REST_AUTH_URL}?key=${CONFIG.FIREBASE_AUTH_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Firebase sign in failed',
      };
    }

    const firebaseResponse: FirebaseSignInResponse = await response.json();
    return {
      success: true,
      data: firebaseResponse,
    };
  }

  /**
   * Exchanges a refresh token for a new access token.
   * This is called both during initial sign-in and when refreshing expired tokens.
   *
   * Firebase Token Exchange endpoint:
   * https://securetoken.googleapis.com/v1/token
   */
  private async exchangeRefreshToken(refreshToken: string): Promise<ApiResponse<FirebaseTokenExchangeResponse>> {
    const response = await fetch(
      `${CONFIG.FIREBASE_TOKEN_EXCHANGE_URL}?key=${CONFIG.FIREBASE_AUTH_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Token exchange failed',
      };
    }

    const tokenResponse: FirebaseTokenExchangeResponse = await response.json();
    return {
      success: true,
      data: tokenResponse,
    };
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();