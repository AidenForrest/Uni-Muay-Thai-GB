// TypeScript types based on MuayThai GB API swagger specification

// Base API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Address Types (per swagger spec - empty schema)
export interface Address {
  value?: string;
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  isDefault?: boolean;
  [key: string]: any;
}

// Emergency Contact (per swagger spec - empty schema)
export interface EmergencyContact {
  value?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  [key: string]: any;
}

// Profile Types
export interface ProfileResponse {
  profileId: string;
  memberCode: string;
  name?: string;
  email?: string;
  emailVerified: boolean;
  mobile: string;
  mobileVerified: boolean;
  scopes: string[];
}

export interface UpdateProfileRequest {
  name: string;
  email?: string;
  mobile?: string;
}

// Fighter Types (per swagger spec)
export interface FighterResponse {
  status: string; // 'active' | 'inactive' | 'pending' | 'retired' | 'suspended'
}

// Coach Types (per swagger spec - this is what medics use)
export interface CoachResponse {
  status: string; // 'active' | 'inactive' | 'pending' | 'retired' | 'suspended'
}

// PII Types (Personal Identifiable Information - separate endpoint)
export interface PiiResponse {
  dateOfBirth?: string; // ISO format like "2000-02-08"
  biologicalSex?: string; // 'male' or 'female'
  addresses?: Array<Address | string>;
  emergencyContacts?: Array<EmergencyContact | string>;
}

export interface UpdatePiiRequest {
  dateOfBirth?: string; // ISO format like "2000-02-08"
  biologicalSex?: string; // 'male' or 'female'
  addresses?: Address[]; // Array of Address objects
  emergencyContacts?: EmergencyContact[]; // Array of EmergencyContact objects
}

// Personalization Types
export interface UpdateScopeRequest {
  scope: string[];
}

// Medical Types (mock/demo only)
export type MedicalEntryType =
  | 'pre_fight_check'
  | 'injury_assessment'
  | 'medical_clearance'
  | 'suspension_issued'
  | 'suspension_cleared'
  | 'note';

export interface MedicalEntry {
  id: string;
  entryType: MedicalEntryType;
  notes: string;
  medicName: string;
  medicId: string;
  createdAt: string; // ISO datetime
}

export interface Suspension {
  active: boolean;
  reason: string;
  startDate: string;
  endDate?: string;
  issuedBy: string;
  notes?: string;
}

export interface MedicalPassResponse {
  profile: ProfileResponse;
  pii: PiiResponse;
  status?: string;
  history: MedicalEntry[];
  suspension?: Suspension;
}

export interface AddMedicalEntryRequest {
  entryType: MedicalEntryType;
  notes: string;
  medicName?: string;
  medicId?: string;
}

// Firebase REST API Auth Types
export interface FirebaseSignInRequest {
  email: string;
  password: string;
  returnSecureToken: boolean;
}

export interface FirebaseSignInResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered: boolean;
  displayName?: string;
}

export interface FirebaseTokenExchangeResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
  refresh_token: string;
  id_token: string;
  user_id: string;
  project_id: string;
}

// Combined User Profile (internal app model - combines API responses)
export interface UserProfile {
  // From ProfileResponse
  profileId: string;
  memberCode: string;
  name?: string;
  email?: string;
  emailVerified: boolean;
  mobile: string;
  mobileVerified: boolean;
  scopes: string[];
  
  // Derived from scopes  
  userType: 'fighter' | 'medic';
  
  // From PiiResponse
  dateOfBirth?: string;
  biologicalSex?: string;
  addresses?: string[];
  emergencyContacts?: string[];
  
  // From FighterResponse/CoachResponse
  status?: string;
  
  // Firebase Auth data
  uid: string;
  firebaseToken?: string;
  
  // Internal fields
  createdAt: Date;
}

// Auth Types (Firebase)
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

// API Error Response
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}
