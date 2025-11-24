import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import LoginForm from './components/Auth/LoginForm';
import { useAuth } from './contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    __esModule: true,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Route: ({ path, element }: { path: string; element: React.ReactElement }) => {
      const currentPath = globalThis.location?.pathname || '/';
      if (path === '*' || path === currentPath) {
        return element;
      }
      return null;
    },
    Navigate: ({ to }: { to: string }) => <div>Redirected to {to}</div>,
    useNavigate: () => mockNavigate,
    MemoryRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>
  };
}, { virtual: true });

jest.mock('./contexts/AuthContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    useAuth: jest.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const baseAuth = {
  currentUser: null,
  userProfile: null,
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  updateUserProfile: jest.fn(),
  loading: false
};

const buildUserProfile = () => ({
  profileId: 'profile-1',
  memberCode: 'MT-123',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: true,
  mobile: '0123456789',
  mobileVerified: true,
  scopes: [],
  userType: 'fighter' as const,
  uid: 'user-1',
  status: 'active',
  addresses: ['123 Street'],
  emergencyContacts: ['Coach John'],
  dateOfBirth: '2000-01-01',
  biologicalSex: 'male',
  createdAt: new Date('2024-01-01')
});

const buildAuthValue = (overrides = {}) => ({
  ...baseAuth,
  ...overrides
});

describe('App routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  test('renders home page for guests', () => {
    mockUseAuth.mockReturnValue(buildAuthValue());

    window.history.pushState({}, 'Home', '/');
    render(<App />);

    expect(screen.getByText(/Welcome to Muay Thai GB/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /login/i })[0]).toBeEnabled();
  });

  test('redirects logged in users to dashboard when visiting login', () => {
    const profile = buildUserProfile();
    mockUseAuth.mockReturnValue(buildAuthValue({
      currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
      userProfile: profile
    }));

    window.history.pushState({}, 'Login', '/login');
    render(<App />);

    expect(screen.getByText(/Redirected to \/dashboard/i)).toBeInTheDocument();
  });

  test('shows dashboard content for authenticated users', () => {
    const profile = buildUserProfile();
    mockUseAuth.mockReturnValue(buildAuthValue({
      currentUser: { uid: profile.uid, email: profile.email || '', displayName: profile.name || '' },
      userProfile: profile
    }));

    window.history.pushState({}, 'Dashboard', '/dashboard');
    render(<App />);

    expect(screen.getByText(/Your Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome, Test User/i)).toBeInTheDocument();
  });
});

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submits credentials through login handler', async () => {
    const loginMock = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(buildAuthValue({ login: loginMock }));

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('user@example.com', 'password123'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });
});
