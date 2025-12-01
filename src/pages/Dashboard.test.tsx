import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { MedicalPassResponse, UserProfile } from '../types/api.types';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  return {
    __esModule: true,
    useNavigate: () => mockNavigate
  };
}, { virtual: true });

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    getMedicalPass: jest.fn(),
    addMedicalEntry: jest.fn(),
    setSuspension: jest.fn()
  }
}));
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock QR Code component
jest.mock('../components/QRCode/AthleteQRCode', () => {
  return function MockAthleteQRCode({ profileId, athleteName }: { profileId: string; athleteName: string }) {
    return <div data-testid="mock-qr-code">QR: {athleteName}</div>;
  };
});

const buildMedicProfile = (): UserProfile => ({
  profileId: 'medic-123',
  memberCode: 'MTG-MEDIC',
  name: 'Dr. Test Medic',
  email: 'medic@test.com',
  emailVerified: true,
  mobile: '+447999999999',
  mobileVerified: true,
  scopes: ['personalise:role:medic'],
  userType: 'medic',
  uid: 'medic-123',
  status: 'active',
  createdAt: new Date()
});

const buildFighterProfile = (): UserProfile => ({
  profileId: 'fighter-123',
  memberCode: 'MTG-FIGHTER',
  name: 'Test Fighter',
  email: 'fighter@test.com',
  emailVerified: true,
  mobile: '+447777777777',
  mobileVerified: true,
  scopes: ['personalise:role:athlete'],
  userType: 'fighter',
  uid: 'fighter-123',
  status: 'active',
  createdAt: new Date()
});

const buildMedicalPassResponse = (overrides = {}): MedicalPassResponse => ({
  profile: {
    profileId: 'mock-fighter-123',
    memberCode: 'MTG123456',
    name: 'John Fighter',
    email: 'john@fighter.com',
    emailVerified: true,
    mobile: '+447111111111',
    mobileVerified: true,
    scopes: ['personalise:role:athlete']
  },
  pii: {
    dateOfBirth: '1990-05-15',
    biologicalSex: 'male'
  },
  status: 'active',
  history: [
    {
      id: 'entry-1',
      entryType: 'pre_fight_check',
      notes: 'All clear for competition',
      medicName: 'Dr. Smith',
      medicId: 'dr-smith',
      createdAt: new Date().toISOString()
    }
  ],
  suspension: undefined,
  ...overrides
});

const baseAuthValue = {
  currentUser: null,
  userProfile: null,
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  updateUserProfile: jest.fn(),
  loading: false
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Fighter view', () => {
    it('shows QR code for fighter users', () => {
      const profile = buildFighterProfile();
      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
        userProfile: profile
      });

      render(<Dashboard />);

      expect(screen.getByTestId('mock-qr-code')).toBeInTheDocument();
      expect(screen.getByText(/Medical Pass QR Code/i)).toBeInTheDocument();
    });

    it('does not show medic portal for fighter users', () => {
      const profile = buildFighterProfile();
      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
        userProfile: profile
      });

      render(<Dashboard />);

      expect(screen.queryByText(/Medical Portal/i)).not.toBeInTheDocument();
    });
  });

  describe('Medic view', () => {
    beforeEach(() => {
      const profile = buildMedicProfile();
      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
        userProfile: profile
      });
    });

    it('shows medic portal for medic users', () => {
      render(<Dashboard />);

      expect(screen.getByText(/Medical Portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Find Fighter/i)).toBeInTheDocument();
    });

    it('has fighter search input', () => {
      render(<Dashboard />);

      const searchInput = screen.getByPlaceholderText(/Enter fighter's profile ID/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('search button is disabled when input is empty', () => {
      render(<Dashboard />);

      const searchButton = screen.getByRole('button', { name: /Search Fighter/i });
      expect(searchButton).toBeDisabled();
    });

    it('search button is enabled when input has value', async () => {
      render(<Dashboard />);

      const searchInput = screen.getByPlaceholderText(/Enter fighter's profile ID/i);
      await userEvent.type(searchInput, 'fighter-123');

      const searchButton = screen.getByRole('button', { name: /Search Fighter/i });
      expect(searchButton).toBeEnabled();
    });

    it('calls API when search button clicked', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse()
      });

      render(<Dashboard />);

      const searchInput = screen.getByPlaceholderText(/Enter fighter's profile ID/i);
      await userEvent.type(searchInput, 'mock-fighter-123');

      const searchButton = screen.getByRole('button', { name: /Search Fighter/i });
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(mockApiService.getMedicalPass).toHaveBeenCalledWith('mock-fighter-123');
      });
    });

    it('displays fighter profile after successful search', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse()
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('John Fighter')).toBeInTheDocument();
        expect(screen.getByText(/MTG123456/i)).toBeInTheDocument();
      });
    });

    it('shows CLEARED status for fighter without suspension', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse({ suspension: undefined })
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('CLEARED')).toBeInTheDocument();
      });
    });

    it('shows SUSPENDED status for fighter with active suspension', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse({
          suspension: {
            active: true,
            reason: 'Concussion protocol',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            issuedBy: 'Dr. Smith'
          }
        })
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('SUSPENDED')).toBeInTheDocument();
        expect(screen.getByText(/Concussion protocol/i)).toBeInTheDocument();
      });
    });

    it('displays error message on API failure', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: false,
        error: 'Fighter not found'
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'invalid-id');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('Fighter not found')).toBeInTheDocument();
      });
    });

    it('displays medical history entries', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse()
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('All clear for competition')).toBeInTheDocument();
        expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument();
      });
    });
  });

  describe('Add Medical Entry', () => {
    beforeEach(() => {
      const profile = buildMedicProfile();
      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
        userProfile: profile
      });

      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse()
      });
    });

    it('shows add entry form after fighter search', async () => {
      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('Add Medical Entry')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Entry type select
        expect(screen.getByPlaceholderText(/Enter your medical notes/i)).toBeInTheDocument();
      });
    });

    it('add entry button disabled when notes empty', async () => {
      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /Add Entry/i });
        expect(addButton).toBeDisabled();
      });
    });

    it('calls API when adding entry with notes', async () => {
      mockApiService.addMedicalEntry.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse()
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('Add Medical Entry')).toBeInTheDocument();
      });

      const notesTextarea = screen.getByPlaceholderText(/Enter your medical notes/i);
      await userEvent.type(notesTextarea, 'Fighter cleared after examination');

      const addButton = screen.getByRole('button', { name: /Add Entry/i });
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(mockApiService.addMedicalEntry).toHaveBeenCalledWith(
          'mock-fighter-123',
          expect.objectContaining({
            entryType: 'pre_fight_check',
            notes: 'Fighter cleared after examination'
          })
        );
      });
    });

    it('allows selecting different entry types', async () => {
      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'injury_assessment');

      expect(select).toHaveValue('injury_assessment');
    });
  });

  describe('Manage Suspension', () => {
    beforeEach(() => {
      const profile = buildMedicProfile();
      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
        userProfile: profile
      });

      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse()
      });
    });

    it('shows suspension management form after fighter search', async () => {
      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('Manage Suspension')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Concussion protocol/i)).toBeInTheDocument(); // Suspension reason input
        expect(screen.getByRole('spinbutton')).toBeInTheDocument(); // Duration number input
      });
    });

    it('calls API when issuing suspension', async () => {
      mockApiService.setSuspension.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse({
          suspension: {
            active: true,
            reason: 'Concussion protocol',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            issuedBy: 'Dr. Test Medic'
          }
        })
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByText('Manage Suspension')).toBeInTheDocument();
      });

      const reasonInput = screen.getByPlaceholderText(/Concussion protocol/i);
      await userEvent.clear(reasonInput);
      await userEvent.type(reasonInput, 'Concussion protocol');

      const issueButton = screen.getByRole('button', { name: /Issue Suspension/i });
      await userEvent.click(issueButton);

      await waitFor(() => {
        expect(mockApiService.setSuspension).toHaveBeenCalledWith(
          'mock-fighter-123',
          expect.objectContaining({
            active: true,
            reason: 'Concussion protocol'
          })
        );
      });
    });

    it('clear suspension button disabled when no active suspension', async () => {
      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /Clear Suspension/i });
        expect(clearButton).toBeDisabled();
      });
    });

    it('clear suspension button enabled when fighter has active suspension', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse({
          suspension: {
            active: true,
            reason: 'Test suspension',
            startDate: new Date().toISOString(),
            issuedBy: 'Dr. Test'
          }
        })
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /Clear Suspension/i });
        expect(clearButton).toBeEnabled();
      });
    });

    it('calls API to clear suspension', async () => {
      mockApiService.getMedicalPass.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse({
          suspension: {
            active: true,
            reason: 'Test suspension',
            startDate: new Date().toISOString(),
            issuedBy: 'Dr. Test'
          }
        })
      });

      mockApiService.setSuspension.mockResolvedValue({
        success: true,
        data: buildMedicalPassResponse({ suspension: undefined })
      });

      render(<Dashboard />);

      await userEvent.type(screen.getByPlaceholderText(/Enter fighter's profile ID/i), 'mock-fighter-123');
      await userEvent.click(screen.getByRole('button', { name: /Search Fighter/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear Suspension/i })).toBeEnabled();
      });

      await userEvent.click(screen.getByRole('button', { name: /Clear Suspension/i }));

      await waitFor(() => {
        expect(mockApiService.setSuspension).toHaveBeenCalledWith('mock-fighter-123', undefined);
      });
    });
  });

  describe('Logout', () => {
    it('calls logout and navigates to home', async () => {
      const logoutMock = jest.fn().mockResolvedValue(undefined);
      const profile = buildFighterProfile();

      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
        userProfile: profile,
        logout: logoutMock
      });

      render(<Dashboard />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(logoutMock).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });
});
