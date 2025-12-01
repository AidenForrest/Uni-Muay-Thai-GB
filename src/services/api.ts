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

      if (typeof item === 'string') {
        return item;
      }

      if (Array.isArray(item)) {
        return item.filter(Boolean).join(', ');
      }

      if (typeof item === 'object') {
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

        const fallbackValues = Object.values(item)
          .filter((value) => typeof value === 'string' && value.trim().length > 0);

        if (fallbackValues.length > 0) {
          return fallbackValues.join(', ');
        }

        return JSON.stringify(item);
      }

      return String(item);
    })
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return normalised.length > 0 ? normalised : undefined;
};

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

const formatContactsForRequest = (contacts?: string[]): EmergencyContact[] | undefined => {
  if (contacts === undefined) {
    return undefined;
  }

  if (contacts.length === 0) {
    return [];
  }

  return contacts.map((contact) => ({ value: contact }));
};

// Helper to determine user type from scopes
const getUserTypeFromScopes = (scopes: string[]): 'fighter' | 'medic' => {
  // Look for personalise:role:medic (which uses coach endpoint)
  if (scopes.some(scope => scope.includes('personalise:role:medic') || scope.includes('personalise:role:coach'))) {
    return 'medic';
  }
  return 'fighter';
};

// Helper to make authenticated API calls to MTGB API
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

// Helper to combine API responses into UserProfile
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
    
    // PII data
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

class ApiService {
  /**
   * Authenticate with Firebase and get bearer token
   */
  async login(email?: string, password?: string): Promise<ApiResponse<{ user: AuthUser; profile: UserProfile }>> {
    // Medic demo login (mock) - for demo purposes only
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
      // Step 1: Authenticate with Firebase REST API
      const authResponse = await firebaseAuthService.signInWithEmailAndPassword(email, password);
      
      if (!authResponse.success || !authResponse.data) {
        return {
          success: false,
          error: authResponse.error || 'Firebase authentication failed',
        };
      }

      const { uid, email: userEmail } = authResponse.data;

      // Step 2: Get user profile from MTGB API
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
   * Get complete user profile (combines multiple API calls)
   */
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      // Get bearer token and UID
      const bearerToken = await firebaseAuthService.getBearerToken();
      if (!bearerToken) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // Get profile data
      const profileResponse = await makeAuthenticatedRequest<ProfileResponse>('/profile/me');
      if (!profileResponse.success || !profileResponse.data) {
        return {
          success: false,
          error: profileResponse.error || 'Failed to get profile',
        };
      }

      const profile = profileResponse.data;
      const userType = getUserTypeFromScopes(profile.scopes);

      // Get PII data
      const piiResponse = await makeAuthenticatedRequest<PiiResponse>('/profile/me/pii');
      
      // Get role-specific data
      let fighterResponse: ApiResponse<FighterResponse> | null = null;
      let coachResponse: ApiResponse<CoachResponse> | null = null;

      if (userType === 'fighter') {
        fighterResponse = await makeAuthenticatedRequest<FighterResponse>('/fighter/me');
      } else if (userType === 'medic') {
        coachResponse = await makeAuthenticatedRequest<CoachResponse>('/coach/me');
      }

      // Extract UID from bearer token or use profile ID
      const uid = profile.profileId;
      
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
   * Update user profile
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      // Update profile basic info
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

      // Update PII if provided
      if (updates.dateOfBirth || updates.biologicalSex || updates.addresses || updates.emergencyContacts) {
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

      // Return updated profile
      return await this.getUserProfile();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update user profile',
      };
    }
  }

  /**
   * Update user personalization/scopes
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

  /**
   * Medical pass and history (mock/demo - backend not yet implemented)
   */
  async getMedicalPass(profileId: string): Promise<ApiResponse<MedicalPassResponse>> {
    return await mockDataService.getMedicalPass(profileId);
  }

  async addMedicalEntry(
    profileId: string,
    request: AddMedicalEntryRequest
  ): Promise<ApiResponse<MedicalPassResponse>> {
    return await mockDataService.addMedicalEntry(profileId, request);
  }

  async setSuspension(
    profileId: string,
    suspension: Suspension | undefined
  ): Promise<ApiResponse<MedicalPassResponse>> {
    return await mockDataService.setSuspension(profileId, suspension);
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    firebaseAuthService.signOut();
  }
}

export const apiService = new ApiService();
