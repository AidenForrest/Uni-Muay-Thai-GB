/**
 * App Component - Application Root
 *
 * Sets up the application routing and authentication context.
 *
 * Route Structure:
 * - / (Home) - Public landing page
 * - /login - Login form (public)
 * - /signup - Signup info page (public)
 * - /dashboard - Main user dashboard (protected)
 * - /account-settings - Profile management (protected)
 * - /medical/:profileId - Medical pass view (public, accessed via QR)
 *
 * Authentication Flow:
 * - Unauthenticated users can access public routes
 * - Attempting to access protected routes redirects to login
 * - Authenticated users accessing public routes are redirected to dashboard
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AccountSettings from './pages/AccountSettings';
import LoginForm from './components/Auth/LoginForm';
import SignupForm from './components/Auth/SignupForm';
import MedicalPass from './pages/MedicalPass';
import './styles/App.css';

/**
 * Route wrapper that requires authentication.
 * Redirects to login if user is not authenticated.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

/**
 * Route wrapper for public-only pages.
 * Redirects authenticated users to the dashboard.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return !currentUser ? <>{children}</> : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            } />
            <Route path="/login" element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            } />
            <Route path="/signup" element={
              <PublicRoute>
                <SignupForm />
              </PublicRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/account-settings" element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            } />
            <Route path="/medical/:profileId" element={<MedicalPass />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
