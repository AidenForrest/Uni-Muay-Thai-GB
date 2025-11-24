import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AthleteQRCode from '../components/QRCode/AthleteQRCode';

export default function Dashboard() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  if (!userProfile) {
    return (
      <div className="dashboard-loading">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-content">
          <div className="logo">
            <h2>Muay Thai GB</h2>
          </div>
          <div className="nav-actions">
            <span className="user-greeting">Welcome, {userProfile.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Your Dashboard</h1>
          <p>Welcome to your Muay Thai GB member portal</p>
        </div>

        <div className="user-info-card">
          <h2>Profile Information</h2>
          <div className="profile-details">
            <div className="profile-item">
              <label>Name:</label>
              <span>{userProfile.name}</span>
            </div>
            <div className="profile-item">
              <label>Email:</label>
              <span>{userProfile.email}</span>
            </div>
            <div className="profile-item">
              <label>Account Type:</label>
              <span className="user-type">{userProfile.userType === 'fighter' ? 'Fighter/Athlete' : 'Medical Professional'}</span>
            </div>
            <div className="profile-item">
              <label>Mobile:</label>
              <span>{userProfile.mobile}</span>
            </div>
            <div className="profile-item">
              <label>Email Verified:</label>
              <span>{userProfile.emailVerified ? '✅ Verified' : '❌ Not Verified'}</span>
            </div>
            <div className="profile-item">
              <label>Mobile Verified:</label>
              <span>{userProfile.mobileVerified ? '✅ Verified' : '❌ Not Verified'}</span>
            </div>
            <div className="profile-item">
              <label>Member Code:</label>
              <span>{userProfile.memberCode}</span>
            </div>
            {userProfile.status && (
              <div className="profile-item">
                <label>Status:</label>
                <span className={`status ${userProfile.status.toLowerCase()}`}>
                  {userProfile.status.charAt(0).toUpperCase() + userProfile.status.slice(1)}
                </span>
              </div>
            )}
            {userProfile.userType === 'fighter' && (
              <>
                {userProfile.dateOfBirth && (
                  <div className="profile-item">
                    <label>Date of Birth:</label>
                    <span>{userProfile.dateOfBirth}</span>
                  </div>
                )}
                {userProfile.biologicalSex && (
                  <div className="profile-item">
                    <label>Biological Sex:</label>
                    <span>{userProfile.biologicalSex.charAt(0).toUpperCase() + userProfile.biologicalSex.slice(1)}</span>
                  </div>
                )}
                {userProfile.addresses && userProfile.addresses.length > 0 && (
                  <div className="profile-item">
                    <label>Address:</label>
                    <span>
                      {userProfile.addresses.join('; ')}
                    </span>
                  </div>
                )}
                {userProfile.emergencyContacts && userProfile.emergencyContacts.length > 0 && (
                  <div className="profile-item">
                    <label>Emergency Contacts:</label>
                    <span>
                      {userProfile.emergencyContacts.join('; ')}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-icon">📷</div>
            <h3>{userProfile.userType === 'fighter' ? 'Medical Pass QR Code' : 'Scan QR Code'}</h3>
            <p>{userProfile.userType === 'fighter' ? 'View your unique QR code and download for medical checks' : 'Scan QR code to view and manage Fighter information'}</p>
            {userProfile.userType === 'fighter' ? (
              <AthleteQRCode
                profileId={userProfile.profileId}
                athleteName={userProfile.name || 'Athlete'}
              />
            ) : (
              <button className="card-button" disabled>
                Coming Soon
              </button>
            )}
          </div>

          <div className="dashboard-card">
            <div className="card-icon">⚙️</div>
            <h3>Account</h3>
            <p>View and manage your account info.</p>
            <button className="card-button" onClick={() => navigate('/account-settings')}>
              Manage Account
            </button>
          </div>

        <div className="dashboard-card">
            <div className="card-icon">📈</div>
            <h3>More features</h3>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <button className="card-button" disabled>
                Coming Soon
            </button>
        </div>
        </div>

        <div className="welcome-message">
          <h2>Welcome to Muay Thai GB! 🥊</h2>
          <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>

      </main>
    </div>
  );
}