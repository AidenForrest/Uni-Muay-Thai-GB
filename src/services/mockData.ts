// Mock data service for Muay Thai GB API endpoints
// Production-ready mock implementation matching Swagger specification exactly

import { 
  ApiResponse, 
  ProfileResponse, 
  FighterResponse,
  CoachResponse,
  PiiResponse,
  UpdateProfileRequest,
  AddressSuggestionResponse,
  AddressFromSuggestionResponse,
  HealthResponse,
  UserProfile,
  AuthUser
} from '../types/api.types';
import { CONFIG } from '../config/features';

// Helper to simulate network delay
const delay = (ms: number = CONFIG.MOCK_API_DELAY) => 
  new Promise(resolve => setTimeout(resolve, ms));

const normaliseValueList = (items?: Array<any>): string[] | undefined => {
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

      if (typeof item === 'object') {
        const candidateKeys = [
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

        const candidateValues = candidateKeys
          .map((key) => item[key])
          .filter((value) => typeof value === 'string' && value.trim().length > 0);

        if (candidateValues.length > 0) {
          return candidateValues.join(', ');
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

// Mock data constants - exactly matching API responses
const MOCK_FIGHTER_PROFILE: ProfileResponse = {
  profileId: 'mock-fighter-123',
  memberCode: 'MTG123456',
  name: 'Test Fighter',
  email: 'fighter@test.com',
  emailVerified: true,
  mobile: '+447777777777',
  mobileVerified: true,
  scopes: ['personalise:role:athlete']
};

const MOCK_MEDIC_PROFILE: ProfileResponse = {
  profileId: 'mock-medic-456',
  memberCode: 'MTG789012',
  name: 'Dr. Test Medic',
  email: 'medic@test.com',
  emailVerified: true,
  mobile: '+447999999999',
  mobileVerified: true,
  scopes: ['personalise:role:medic']
};

const MOCK_FIGHTER_DATA: FighterResponse = {
  status: 'active'
};

const MOCK_COACH_DATA: CoachResponse = {
  status: 'active'
};

const MOCK_FIGHTER_PII: PiiResponse = {
  dateOfBirth: '1990-05-15',
  biologicalSex: 'male',
  addresses: [
    {
      value: '123 High Street, Apartment 4B, Manchester, Greater Manchester, M1 1AA, United Kingdom',
      isDefault: true
    }
  ],
  emergencyContacts: [
    {
      value: 'Jane Doe (Spouse): +447888888888, jane.doe@email.com',
      isPrimary: true
    }
  ]
};

const MOCK_MEDIC_PII: PiiResponse = {
  dateOfBirth: '1985-03-20',
  biologicalSex: 'female',
  addresses: [
    {
      value: "456 King's Road, London, Greater London, SW3 4LY, United Kingdom",
      isDefault: true
    }
  ],
  emergencyContacts: [
    {
      value: 'John Doe (Spouse): +447666666666, john@example.com',
      isPrimary: true
    }
  ]
};

// Helper to build complete UserProfile from API responses
const buildUserProfile = (
  profile: ProfileResponse,
  pii: PiiResponse,
  roleStatus: string
): UserProfile => {
  const userType = profile.scopes.includes('personalise:role:medic') ? 'medic' : 'fighter';
  
  return {
    // Firebase data
    uid: profile.profileId,
    firebaseToken: 'mock-firebase-token',
    
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
    dateOfBirth: pii.dateOfBirth,
    biologicalSex: pii.biologicalSex,
    addresses: normaliseValueList(pii.addresses),
    emergencyContacts: normaliseValueList(pii.emergencyContacts),
    
    // Role data
    status: roleStatus,
    
    // Internal
    createdAt: new Date(),
  };
};

export class MockDataService {
  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: AuthUser; profile: UserProfile }>> {
    await delay();
    
    const isMedic = email.includes('medic') || email.includes('doctor');
    const profile = isMedic ? MOCK_MEDIC_PROFILE : MOCK_FIGHTER_PROFILE;
    const pii = isMedic ? MOCK_MEDIC_PII : MOCK_FIGHTER_PII;
    const roleData = isMedic ? MOCK_COACH_DATA : MOCK_FIGHTER_DATA;
    
    const userProfile = buildUserProfile(profile, pii, roleData.status);
    
    const authUser: AuthUser = {
      uid: profile.profileId,
      email: profile.email || email,
      displayName: profile.name || 'Test User',
    };
    
    return {
      success: true,
      data: { user: authUser, profile: userProfile },
    };
  }

  // Profile endpoints
  async getProfile(uid: string): Promise<ApiResponse<UserProfile>> {
    await delay();
    
    const isMedic = uid.includes('medic') || uid.includes('doctor');
    const profile = isMedic ? MOCK_MEDIC_PROFILE : MOCK_FIGHTER_PROFILE;
    const pii = isMedic ? MOCK_MEDIC_PII : MOCK_FIGHTER_PII;
    const roleData = isMedic ? MOCK_COACH_DATA : MOCK_FIGHTER_DATA;
    
    return {
      success: true,
      data: buildUserProfile(profile, pii, roleData.status)
    };
  }

  async updateProfile(uid: string, request: UpdateProfileRequest): Promise<ApiResponse<ProfileResponse>> {
    await delay();
    
    const isMedic = uid.includes('medic') || uid.includes('doctor');
    const baseProfile = isMedic ? MOCK_MEDIC_PROFILE : MOCK_FIGHTER_PROFILE;
    
    return {
      success: true,
      data: {
        ...baseProfile,
        profileId: uid,
        name: request.name,
        email: request.email || baseProfile.email,
        mobile: request.mobile || baseProfile.mobile
      }
    };
  }

  // Fighter endpoints
  async getFighter(uid: string): Promise<ApiResponse<FighterResponse>> {
    await delay();
    return { success: true, data: MOCK_FIGHTER_DATA };
  }

  async updateFighter(uid: string): Promise<ApiResponse<FighterResponse>> {
    await delay();
    return { success: true, data: MOCK_FIGHTER_DATA };
  }

  // Coach endpoints
  async getCoach(uid: string): Promise<ApiResponse<CoachResponse>> {
    await delay();
    return { success: true, data: MOCK_COACH_DATA };
  }

  async updateCoach(uid: string): Promise<ApiResponse<CoachResponse>> {
    await delay();
    return { success: true, data: MOCK_COACH_DATA };
  }

  // PII endpoints
  async getPii(uid: string): Promise<ApiResponse<PiiResponse>> {
    await delay();
    
    const isMedic = uid.includes('medic') || uid.includes('doctor');
    return {
      success: true,
      data: isMedic ? MOCK_MEDIC_PII : MOCK_FIGHTER_PII
    };
  }

  async updatePii(uid: string): Promise<ApiResponse<PiiResponse>> {
    await delay();
    
    const isMedic = uid.includes('medic') || uid.includes('doctor');
    return {
      success: true,
      data: isMedic ? MOCK_MEDIC_PII : MOCK_FIGHTER_PII
    };
  }

  // Address endpoints (return empty objects per Swagger spec)
  async searchAddresses(query: string): Promise<ApiResponse<AddressSuggestionResponse>> {
    await delay();
    return { success: true, data: {} };
  }

  async getAddressFromSuggestion(placeId: string): Promise<ApiResponse<AddressFromSuggestionResponse>> {
    await delay();
    return { success: true, data: {} };
  }

  // Personalization endpoints
  async updatePersonalization(uid: string, scopes: string[]): Promise<ApiResponse<ProfileResponse>> {
    await delay();

    const isMedic = scopes.includes('personalise:role:medic');
    const baseProfile = isMedic ? MOCK_MEDIC_PROFILE : MOCK_FIGHTER_PROFILE;

    return {
      success: true,
      data: { ...baseProfile, profileId: uid, scopes }
    };
  }

  // Health endpoint
  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    await delay();
    return { success: true, data: {} };
  }
}

export const mockDataService = new MockDataService();
