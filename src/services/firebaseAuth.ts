// Firebase REST API Authentication Service
// Uses Firebase REST API instead of Firebase SDK for authentication

import { CONFIG } from '../config/features';
import {
  FirebaseSignInRequest,
  FirebaseSignInResponse,
  FirebaseTokenExchangeResponse,
  ApiResponse,
} from '../types/api.types';

export class FirebaseAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  
  // Production credentials
  private readonly credentials = {
    email: 'uniaiden626@gmail.com',
    password: 'nl873*yofm!9uh',
  };

  /**
   * Sign in using Firebase REST API and exchange for access token
   */
  async signInWithEmailAndPassword(
    email: string = this.credentials.email, 
    password: string = this.credentials.password
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

      // Store tokens
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
   * Get current access token (ensures it's not expired)
   */
  async getBearerToken(): Promise<string | null> {
    if (!this.accessToken || !this.refreshToken) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    if (this.tokenExpiresAt && Date.now() > (this.tokenExpiresAt - 300000)) {
      // Token is expired or will expire soon, refresh it
      const refreshResult = await this.exchangeRefreshToken(this.refreshToken);
      if (refreshResult.success && refreshResult.data) {
        this.accessToken = refreshResult.data.access_token;
        this.tokenExpiresAt = Date.now() + (parseInt(refreshResult.data.expires_in) * 1000);
        return this.accessToken;
      } else {
        // Refresh failed, clear tokens
        this.signOut();
        return null;
      }
    }

    return this.accessToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && this.refreshToken !== null;
  }

  /**
   * Sign out - clear stored tokens
   */
  signOut(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Get configured credentials
   */
  getCredentials() {
    return this.credentials;
  }

  /**
   * Step 1: Sign in with Firebase to get refresh token
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
   * Step 2: Exchange refresh token for access token
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