import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { UserProfile, AuthUser } from '../types/api.types';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: UserProfile) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, userData: Partial<UserProfile>) {
    throw new Error('Signup is not available with the production API. Registration is handled manually.');
  }

  async function login(email: string, password: string) {
    const response = await apiService.login(email, password);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to login');
    }

    setCurrentUser(response.data.user);
    setUserProfile(response.data.profile);
  }

  async function logout() {
    // Clear API service tokens
    await apiService.logout();
    // Also sign out from Firebase SDK
    await auth.signOut();
    // Manually clear state
    setCurrentUser(null);
    setUserProfile(null);
  }

  function updateUserProfile(profile: UserProfile) {
    setUserProfile(profile);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // User is signed in, fetch their profile
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
            // Firebase user exists but no profile - sign them out
            await auth.signOut();
            setCurrentUser(null);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
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

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}