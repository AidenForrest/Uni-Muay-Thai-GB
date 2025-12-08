/**
 * API Service - Main orchestration layer for MTGB API
 *
 * This service combines Firebase authentication with the MTGB backend API.
 * It handles:
 * - User authentication (Firebase REST API + MTGB profile fetching)
 * - Profile management (personal info, PII, role-specific data)
 * - Medical pass operations (currently using mock data)
 *
 * The service supports two user types:
 * - Fighters: Athletes who have medical passes and can view their own data
 * - Medics: Medical professionals who can view/update fighter medical records
 */

import { firebaseAuthService } from './firebaseAuth';
import { mockDataService } from './mockData';
import { CONFIG } from '../config/features';
import {
  ApiResponse,
  UserProfile,
  AuthUser,
  ProfileResponse,
  FighterResponse,
  CoachResponse,
  PiiResponse,
  UpdateProfileRequest,
  UpdatePiiRequest,
  UpdateScopeRequest,
  Address,
  EmergencyContact,
  MedicalPassResponse,
  AddMedicalEntryRequest,
  Suspension
} from '../types/api.types';

/**
 * Normalises a list of mixed-type values (strings, Address objects, EmergencyContact objects)
 * into a consistent array of display-friendly strings.
 *
 * This handles the varying data formats returned by the API - addresses and contacts
 * can come back as either simple strings or structured objects depending on how
 * they were originally saved.
 *
 * @param items - Array of strings or structured objects from the API
 * @returns Array of normalised string values, or undefined if empty/null
 */
const normaliseValueList = (
  items?: Array<string | Address | EmergencyContact>
): string[] | undefined => {
  if (!items) {
    return undefined;
  }

  const normalised = items
    .map((item) => {
      if (!item) {
        return '';
      }

      // Already a string - use as-is
      if (typeof item === 'string') {
        return item;
      }

      // Handle array values by joining them
      if (Array.isArray(item)) {
        return item.filter(Boolean).join(', ');
      }

      // Handle structured objects (Address or EmergencyContact)
      if (typeof item === 'object') {
        // Try to extract values in a sensible order for display
        const preferredKeys = [
          'value',
          'name',
          'relationship',
          'phone',
          'email',
          'line1',
          'line2',
          'city',
          'county',
          'postcode',
          'country',
        ];

        const preferredValues = preferredKeys
          .map((key) => (item as any)[key])
          .filter((value) => typeof value === 'string' && value.trim().length > 0);

        if (preferredValues.length > 0) {
          return preferredValues.join(', ');
        }

        // Fallback: use any string values found in the object
        const fallbackValues = Object.values(item)
          .filter((value) => typeof value === 'string' && value.trim().length > 0);

        if (fallbackValues.length > 0) {
          return fallbackValues.join(', ');
        }

        // Last resort: JSON stringify the object
        return JSON.stringify(item);
      }

      return String(item);
    })
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return normalised.length > 0 ? normalised : undefined;
};

/**
 * Converts an array of address strings back into the structured format
 * expected by the MTGB API for updates. The first address is marked as default.
 */
const formatAddressesForRequest = (addresses?: string[]): Address[] | undefined => {
  if (addresses === undefined) {
    return undefined;
  }

  if (addresses.length === 0) {
    return [];
  }

  return addresses.map((address, index) => ({
    value: address,
    isDefault: index === 0,
  }));
};

/**
 * Converts an array of emergency contact strings back into the structured
 * format expected by the MTGB API for updates.
 */
const formatContactsForRequest = (contacts?: string[]): EmergencyContact[] | undefined => {
  if (contacts === undefined) {
    return undefined;
  }

  if (contacts.length === 0) {
    return [];
  }

  return contacts.map((contact) => ({ value: contact }));
};

/**
 * Determines the user type based on their permission scopes.
 * Medics have 'personalise:role:medic' or 'personalise:role:coach' in their scopes.
 * All other users are treated as fighters.
 */
const getUserTypeFromScopes = (scopes: string[]): 'fighter' | 'medic' => {
  if (scopes.some(scope => scope.includes('personalise:role:medic') || scope.includes('personalise:role:coach'))) {
    return 'medic';
  }
  return 'fighter';
};

/**
 * Makes authenticated HTTP requests to the MTGB API.
 * Automatically attaches the Firebase bearer token to all requests.
 *
 * @param endpoint - API endpoint path (e.g., '/profile/me')
 * @param method - HTTP method (GET, PUT, POST)
 * @param body - Optional request body for PUT/POST requests
 * @returns Typed API response with success status and data/error
 */
const makeAuthenticatedRequest = async <T>(
  endpoint: string,
  method: 'GET' | 'PUT' | 'POST' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  try {
    const bearerToken = await firebaseAuthService.getBearerToken();

    if (!bearerToken) {
      return {
        success: false,
        error: 'No authentication token available. Please log in.',
      };
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
      method,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network request failed',
    };
  }
};

/**
 * Combines data from multiple MTGB API endpoints into a single UserProfile object.
 *
 * The MTGB API splits user data across several endpoints:
 * - /profile/me: Basic profile info (name, email, scopes)
 * - /profile/me/pii: Personal identifiable info (DOB, addresses, contacts)
 * - /fighter/me or /coach/me: Role-specific data (membership status)
 *
 * This function merges all that data into one convenient object for the app.
 */
const buildUserProfile = (
  uid: string,
  token: string,
  profile: ProfileResponse,
  pii?: PiiResponse,
  fighter?: FighterResponse,
  coach?: CoachResponse
): UserProfile => {
  const userType = getUserTypeFromScopes(profile.scopes);
  const roleResponse = userType === 'medic' ? coach : fighter;

  return {
    // Firebase data
    uid,
    firebaseToken: token,

    // Profile data
    profileId: profile.profileId,
    memberCode: profile.memberCode,
    name: profile.name,
    email: profile.email,
    emailVerified: profile.emailVerified,
    mobile: profile.mobile,
    mobileVerified: profile.mobileVerified,
    scopes: profile.scopes,

    // Derived
    userType,

    // PII data (normalised for consistent display)
    dateOfBirth: pii?.dateOfBirth,
    biologicalSex: pii?.biologicalSex,
    addresses: normaliseValueList(pii?.addresses),
    emergencyContacts: normaliseValueList(pii?.emergencyContacts),

    // Role data
    status: roleResponse?.status,

    // Internal
    createdAt: new Date(),
  };
};

/**
 * Main API service class for the MTGB Member Portal.
 * Provides methods for authentication, profile management, and medical pass operations.
 */
class ApiService {
  /**
   * Authenticates a user and retrieves their full profile.
   *
   * Login flow:
   * 1. For medic demo accounts (email contains 'medic' or 'doctor'): Use mock service
   * 2. For real accounts: Firebase auth -> MTGB API profile fetch
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Auth user object and full user profile
   */
  async login(email?: string, password?: string): Promise<ApiResponse<{ user: AuthUser; profile: UserProfile }>> {
    // Medic demo login (mock) - for demo purposes only
    // This allows testing the medic portal without real medic credentials
    const emailLower = (email || '').toLowerCase();
    if (emailLower.includes('medic') || emailLower.includes('doctor')) {
      return await mockDataService.login(email || '', password || '');
    }

    // Real API login for fighters
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    try {
      // Step 1: Authenticate with Firebase REST API to get access token
      const authResponse = await firebaseAuthService.signInWithEmailAndPassword(email, password);

      if (!authResponse.success || !authResponse.data) {
        return {
          success: false,
          error: authResponse.error || 'Firebase authentication failed',
        };
      }

      const { uid, email: userEmail } = authResponse.data;

      // Step 2: Use the token to fetch the user's profile from MTGB API
      const profileResponse = await this.getUserProfile();

      if (!profileResponse.success || !profileResponse.data) {
        return {
          success: false,
          error: profileResponse.error || 'Failed to get user profile',
        };
      }

      const authUser: AuthUser = {
        uid,
        email: userEmail,
        displayName: profileResponse.data.name || userEmail,
      };

      return {
        success: true,
        data: {
          user: authUser,
          profile: profileResponse.data,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Fetches and combines the complete user profile from multiple API endpoints.
   *
   * Makes parallel calls to:
   * - /profile/me: Basic profile info
   * - /profile/me/pii: Personal identifiable information
   * - /fighter/me OR /coach/me: Role-specific data based on user type
   *
   * @returns Complete UserProfile object combining all API data
   */
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const bearerToken = await firebaseAuthService.getBearerToken();
      if (!bearerToken) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // First, get the basic profile to determine user type
      const profileResponse = await makeAuthenticatedRequest<ProfileResponse>('/profile/me');
      if (!profileResponse.success || !profileResponse.data) {
        return {
          success: false,
          error: profileResponse.error || 'Failed to get profile',
        };
      }

      const profile = profileResponse.data;
      const userType = getUserTypeFromScopes(profile.scopes);

      // Fetch PII data (addresses, emergency contacts, etc.)
      const piiResponse = await makeAuthenticatedRequest<PiiResponse>('/profile/me/pii');

      // Fetch role-specific data based on user type
      let fighterResponse: ApiResponse<FighterResponse> | null = null;
      let coachResponse: ApiResponse<CoachResponse> | null = null;

      if (userType === 'fighter') {
        fighterResponse = await makeAuthenticatedRequest<FighterResponse>('/fighter/me');
      } else if (userType === 'medic') {
        coachResponse = await makeAuthenticatedRequest<CoachResponse>('/coach/me');
      }

      const uid = profile.profileId;

      // Combine all data into a single UserProfile object
      const userProfile = buildUserProfile(
        uid,
        bearerToken,
        profile,
        piiResponse.data,
        fighterResponse?.data,
        coachResponse?.data
      );

      return {
        success: true,
        data: userProfile,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get user profile',
      };
    }
  }

  /**
   * Updates a user's profile with the provided changes.
   *
   * This method intelligently routes updates to the correct API endpoints:
   * - Basic info (name, email, mobile) -> PUT /profile/me
   * - Personal info (DOB, sex, addresses, contacts) -> PUT /profile/me/pii
   *
   * After updates, it fetches and returns the complete refreshed profile.
   *
   * @param uid - User's unique identifier (unused but kept for interface consistency)
   * @param updates - Partial profile object containing fields to update
   * @returns Updated complete UserProfile
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      // Update basic profile info if any basic fields changed
      if (updates.name || updates.email || updates.mobile) {
        const profileRequest: UpdateProfileRequest = {
          name: updates.name || '',
          ...(updates.email && { email: updates.email }),
          ...(updates.mobile && { mobile: updates.mobile }),
        };

        const response = await makeAuthenticatedRequest<ProfileResponse>(
          '/profile/me',
          'PUT',
          profileRequest
        );

        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to update profile',
          };
        }
      }

      // Update PII (personally identifiable information) if any PII fields changed
      if (updates.dateOfBirth || updates.biologicalSex || updates.addresses || updates.emergencyContacts) {
        // Convert display strings back to API format
        const formattedAddresses = formatAddressesForRequest(updates.addresses as string[] | undefined);
        const formattedContacts = formatContactsForRequest(updates.emergencyContacts as string[] | undefined);

        const piiRequest: UpdatePiiRequest = {
          ...(updates.dateOfBirth && { dateOfBirth: updates.dateOfBirth }),
          ...(updates.biologicalSex && { biologicalSex: updates.biologicalSex }),
          ...(formattedAddresses !== undefined && { addresses: formattedAddresses }),
          ...(formattedContacts !== undefined && { emergencyContacts: formattedContacts }),
        };

        const response = await makeAuthenticatedRequest<PiiResponse>(
          '/profile/me/pii',
          'PUT',
          piiRequest
        );

        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to update personal information',
          };
        }
      }

      // Fetch and return the complete updated profile
      return await this.getUserProfile();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update user profile',
      };
    }
  }

  /**
   * Updates the user's personalisation/permission scopes.
   * Scopes control what features and data the user can access.
   */
  async updatePersonalization(scopes: string[]): Promise<ApiResponse<ProfileResponse>> {
    const scopeRequest: UpdateScopeRequest = {
      scope: scopes,
    };

    return await makeAuthenticatedRequest<ProfileResponse>(
      '/profile/me/personalise',
      'PUT',
      scopeRequest
    );
  }

  // ============================================================================
  // Medical Pass Operations (Mock/Demo)
  // These methods use the mock data service as the backend API for medical
  // pass features is not yet implemented. Replace with real API calls when ready.
  // ============================================================================

  /**
   * Retrieves a fighter's medical pass data including history and suspension status.
   */
  async getMedicalPass(profileId: string): Promise<ApiResponse<MedicalPassResponse>> {
    return await mockDataService.getMedicalPass(profileId);
  }

  /**
   * Adds a new medical entry to a fighter's medical history.
   * Only callable by authenticated medics.
   */
  async addMedicalEntry(
    profileId: string,
    request: AddMedicalEntryRequest
  ): Promise<ApiResponse<MedicalPassResponse>> {
    return await mockDataService.addMedicalEntry(profileId, request);
  }

  /**
   * Sets or clears a suspension on a fighter's medical pass.
   * Pass undefined to clear an existing suspension.
   */
  async setSuspension(
    profileId: string,
    suspension: Suspension | undefined
  ): Promise<ApiResponse<MedicalPassResponse>> {
    return await mockDataService.setSuspension(profileId, suspension);
  }

  /**
   * Logs out the current user by clearing stored authentication tokens.
   */
  async logout(): Promise<void> {
    firebaseAuthService.signOut();
  }
}

export const apiService = new ApiService();
