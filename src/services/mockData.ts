/**
 * Mock Data Service
 *
 * Provides simulated API responses for features not yet implemented in the backend.
 * This service is used for:
 * - Medic login (any email containing 'medic' or 'doctor')
 * - Medical pass viewing and management
 * - Medical entry creation
 * - Suspension management
 *
 * Important: Fighter authentication and profile features use the REAL API.
 * This mock service only handles the medical pass features which are still
 * being developed on the backend.
 *
 * Data is stored in memory and resets when the page refreshes.
 */

import {
  ApiResponse,
  ProfileResponse,
  FighterResponse,
  CoachResponse,
  PiiResponse,
  UserProfile,
  AuthUser,
  MedicalEntry,
  Suspension,
  MedicalPassResponse,
  AddMedicalEntryRequest
} from '../types/api.types';
import { CONFIG } from '../config/features';

/**
 * Simulates network latency to make the demo feel more realistic.
 * Uses the delay configured in CONFIG.MOCK_API_DELAY (default ~300ms).
 */
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

// ============================================================================
// Mock Data Constants
// These match the structure returned by the real MTGB API endpoints
// ============================================================================

/** Demo fighter profile - used for testing fighter features */
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

/** Demo medic profile - used when logging in with 'medic' or 'doctor' email */
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

/** Fighter role-specific data */
const MOCK_FIGHTER_DATA: FighterResponse = {
  status: 'active'
};

/** Medic/coach role-specific data */
const MOCK_COACH_DATA: CoachResponse = {
  status: 'active'
};

/** Demo fighter's personal information */
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

/** Demo medic's personal information */
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

// ============================================================================
// In-Memory Data Stores (Demo Only)
// These store medical records during the session - resets on page refresh
// ============================================================================

/**
 * Medical history entries indexed by fighter profile ID.
 * Pre-populated with sample entries for the mock-fighter-123 demo account.
 */
const medicalHistoryByFighter: Record<string, MedicalEntry[]> = {
  'mock-fighter-123': [
    {
      id: 'entry-001',
      entryType: 'pre_fight_check',
      notes: 'Vitals normal. Cleared for competition.',
      medicName: 'Dr. Test Medic',
      medicId: 'mock-medic-456',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),  // 30 days ago
    },
    {
      id: 'entry-002',
      entryType: 'injury_assessment',
      notes: 'Right shin bruise, no fracture suspected. Advised icing and light training.',
      medicName: 'Dr. Test Medic',
      medicId: 'mock-medic-456',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),  // 14 days ago
    },
    {
      id: 'entry-003',
      entryType: 'medical_clearance',
      notes: 'Follow-up complete. Cleared for full training.',
      medicName: 'Dr. Test Medic',
      medicId: 'mock-medic-456',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),   // 7 days ago
    },
  ],
};

/**
 * Suspension records indexed by fighter profile ID.
 * Pre-populated with a cleared (inactive) suspension for demo purposes.
 */
const suspensionByFighter: Record<string, Suspension | undefined> = {
  'mock-fighter-123': {
    active: false,
    reason: 'Previous mild concussion - cleared',
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),  // Started 21 days ago
    endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),     // Ended 7 days ago
    issuedBy: 'Dr. Test Medic',
    notes: 'Cleared after follow-up exam.',
  },
};

/**
 * Combines mock API response data into a complete UserProfile object.
 * Mirrors the real buildUserProfile function in api.ts.
 */
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

/**
 * Mock Data Service Class
 *
 * Provides simulated API endpoints for demo and testing purposes.
 * All methods include artificial delay to simulate network latency.
 */
export class MockDataService {
  /**
   * Gets or generates fighter record data for a given profile ID.
   * Returns the pre-defined mock fighter for 'mock-fighter-123',
   * or generates placeholder data for any other ID.
   */
  private getFighterRecord(profileId: string) {
    const isKnown = profileId === MOCK_FIGHTER_PROFILE.profileId;

    // Use pre-defined data for known mock fighter, generate for others
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

  /**
   * Gets medical history for a fighter, initialising empty array if none exists.
   */
  private getHistory(profileId: string) {
    if (!medicalHistoryByFighter[profileId]) {
      medicalHistoryByFighter[profileId] = [];
    }
    return medicalHistoryByFighter[profileId];
  }

  /**
   * Updates or clears a fighter's suspension record.
   */
  private upsertSuspension(profileId: string, suspension?: Suspension) {
    suspensionByFighter[profileId] = suspension;
    return suspensionByFighter[profileId];
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Mock login - determines user type based on email content.
   * Emails containing 'medic' or 'doctor' get medic profile, others get fighter.
   */
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

  // ============================================================================
  // Profile Endpoints
  // ============================================================================

  /**
   * Mock profile fetch - returns user data based on UID.
   */
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

  // ============================================================================
  // Medical Pass Endpoints (Mock Only)
  // These simulate the medical pass API that's not yet built in the backend
  // ============================================================================

  /**
   * Retrieves a fighter's complete medical pass data.
   * Includes profile, PII, medical history, and suspension status.
   * History is sorted with most recent entries first.
   */
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

  /**
   * Adds a new medical entry to a fighter's record.
   * Generates a unique ID and timestamps the entry automatically.
   * Returns the updated medical pass data.
   */
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

  /**
   * Sets or clears a medical suspension on a fighter.
   * Pass undefined to clear an existing suspension.
   * Returns the updated medical pass data.
   */
  async setSuspension(
    profileId: string,
    suspension: Suspension | undefined
  ): Promise<ApiResponse<MedicalPassResponse>> {
    await delay();
    this.upsertSuspension(profileId, suspension);
    return this.getMedicalPass(profileId);
  }
}

/** Singleton instance of the mock data service */
export const mockDataService = new MockDataService();
