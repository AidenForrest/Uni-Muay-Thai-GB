/**
 * Authentication Context
 *
 * Provides global authentication state management for the application.
 * This context wraps the entire app and makes auth state available to all components
 * via the useAuth() hook.
 *
 * Features:
 * - Tracks current user and their full profile
 * - Syncs with Firebase auth state changes
 * - Provides login/logout/signup methods
 * - Shows loading state while auth is being determined
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { UserProfile, AuthUser } from '../types/api.types';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

/**
 * Shape of the authentication context value.
 * All components using useAuth() will have access to these properties and methods.
 */
interface AuthContextType {
  currentUser: AuthUser | null;        // Basic auth info (uid, email, displayName)
  userProfile: UserProfile | null;     // Full profile from MTGB API
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: UserProfile) => void;
  loading: boolean;                    // True while determining initial auth state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to access auth context from any component.
 * Must be used within an AuthProvider.
 *
 * @example
 * const { currentUser, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Provider component that wraps the app and manages authentication state.
 * Place this at the root of your component tree (typically in App.tsx).
 *
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Signup is disabled - MTGB registration is handled manually via email.
   * This method exists to satisfy the interface but always throws.
   */
  async function signup(email: string, password: string, userData: Partial<UserProfile>) {
    throw new Error('Signup is not available with the production API. Registration is handled manually.');
  }

  /**
   * Authenticates a user with email and password.
   * On success, updates both currentUser and userProfile state.
   * On failure, throws an error with a descriptive message.
   */
  async function login(email: string, password: string) {
    const response = await apiService.login(email, password);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to login');
    }

    setCurrentUser(response.data.user);
    setUserProfile(response.data.profile);
  }

  /**
   * Logs out the current user.
   * Clears both the API service tokens and Firebase SDK auth state.
   */
  async function logout() {
    await apiService.logout();      // Clear API service tokens
    await auth.signOut();           // Sign out from Firebase SDK
    setCurrentUser(null);           // Clear local state
    setUserProfile(null);
  }

  /**
   * Updates the cached user profile in state.
   * Use this after making profile updates to keep the UI in sync.
   */
  function updateUserProfile(profile: UserProfile) {
    setUserProfile(profile);
  }

  /**
   * Subscribe to Firebase auth state changes on mount.
   * This handles:
   * - Page refresh: Re-fetches profile if Firebase user exists
   * - Sign in/out from other tabs: Syncs state across tabs
   * - Initial load: Determines if user is already logged in
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Firebase says user is signed in - fetch their profile from MTGB API
        try {
          const profileResponse = await apiService.getUserProfile();

          if (profileResponse.success && profileResponse.data) {
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: profileResponse.data.name || firebaseUser.email || 'User'
            });
            setUserProfile(profileResponse.data);
          } else {
            // Firebase user exists but can't get MTGB profile - sign them out
            // This handles edge cases like deleted accounts
            await auth.signOut();
            setCurrentUser(null);
            setUserProfile(null);
          }
        } catch {
          // Error fetching profile - sign out for safety
          await auth.signOut();
          setCurrentUser(null);
          setUserProfile(null);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setUserProfile(null);
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    signup,
    logout,
    updateUserProfile,
    loading
  };

  // Don't render children until we've determined auth state
  // This prevents flashing of login screens for authenticated users
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}