// Mock data service for demo/medic features only
// Used for: medic login (email contains 'medic' or 'doctor'), medical pass, medical entries, suspensions
// Fighter features use the real API - these mocks are only for features not yet implemented in backend

import {
  ApiResponse,
  ProfileResponse,
  FighterResponse,
  CoachResponse,
  PiiResponse,
  UpdateProfileRequest,
  UserProfile,
  AuthUser,
  MedicalEntry,
  Suspension,
  MedicalPassResponse,
  AddMedicalEntryRequest
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

// Medical history and suspensions (in-memory, demo only)
const medicalHistoryByFighter: Record<string, MedicalEntry[]> = {
  'mock-fighter-123': [
    {
      id: 'entry-001',
      entryType: 'pre_fight_check',
      notes: 'Vitals normal. Cleared for competition.',
      medicName: 'Dr. Test Medic',
      medicId: 'mock-medic-456',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
      id: 'entry-002',
      entryType: 'injury_assessment',
      notes: 'Right shin bruise, no fracture suspected. Advised icing and light training.',
      medicName: 'Dr. Test Medic',
      medicId: 'mock-medic-456',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    },
    {
      id: 'entry-003',
      entryType: 'medical_clearance',
      notes: 'Follow-up complete. Cleared for full training.',
      medicName: 'Dr. Test Medic',
      medicId: 'mock-medic-456',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
  ],
};

const suspensionByFighter: Record<string, Suspension | undefined> = {
  'mock-fighter-123': {
    active: false,
    reason: 'Previous mild concussion - cleared',
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    issuedBy: 'Dr. Test Medic',
    notes: 'Cleared after follow-up exam.',
  },
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
  private getFighterRecord(profileId: string) {
    const isKnown = profileId === MOCK_FIGHTER_PROFILE.profileId;
    const profile: ProfileResponse = isKnown
      ? MOCK_FIGHTER_PROFILE
      : {
          ...MOCK_FIGHTER_PROFILE,
          profileId,
          memberCode: `MTG-${profileId.slice(-4)}`.toUpperCase(),
          name: `Demo Fighter ${profileId.slice(-4)}`,
        };

    const pii: PiiResponse = isKnown
      ? MOCK_FIGHTER_PII
      : {
          dateOfBirth: '1995-01-01',
          biologicalSex: 'female',
          addresses: [
            {
              value: '100 Demo Street, London, SW1A 1AA, United Kingdom',
              isDefault: true,
            },
          ],
          emergencyContacts: [
            {
              value: 'Demo Contact: +441234567890',
              isPrimary: true,
            },
          ],
        };

    const roleStatus = MOCK_FIGHTER_DATA.status;
    return { profile, pii, roleStatus };
  }

  private getHistory(profileId: string) {
    if (!medicalHistoryByFighter[profileId]) {
      medicalHistoryByFighter[profileId] = [];
    }
    return medicalHistoryByFighter[profileId];
  }

  private upsertSuspension(profileId: string, suspension?: Suspension) {
    suspensionByFighter[profileId] = suspension;
    return suspensionByFighter[profileId];
  }

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

  // Medical endpoints (mock-only)
  async getMedicalPass(profileId: string): Promise<ApiResponse<MedicalPassResponse>> {
    await delay();

    const { profile, pii, roleStatus } = this.getFighterRecord(profileId);
    const history = this.getHistory(profileId);
    const suspension = suspensionByFighter[profileId];

    return {
      success: true,
      data: {
        profile,
        pii,
        status: roleStatus,
        history: [...history].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        suspension,
      },
    };
  }

  async addMedicalEntry(
    profileId: string,
    request: AddMedicalEntryRequest
  ): Promise<ApiResponse<MedicalPassResponse>> {
    await delay();

    const history = this.getHistory(profileId);
    const entry: MedicalEntry = {
      id: `entry-${history.length + 1}-${Date.now()}`,
      entryType: request.entryType,
      notes: request.notes,
      medicName: request.medicName || 'Demo Medic',
      medicId: request.medicId || MOCK_MEDIC_PROFILE.profileId,
      createdAt: new Date().toISOString(),
    };

    history.push(entry);
    return this.getMedicalPass(profileId);
  }

  async setSuspension(
    profileId: string,
    suspension: Suspension | undefined
  ): Promise<ApiResponse<MedicalPassResponse>> {
    await delay();
    this.upsertSuspension(profileId, suspension);
    return this.getMedicalPass(profileId);
  }
}

export const mockDataService = new MockDataService();
