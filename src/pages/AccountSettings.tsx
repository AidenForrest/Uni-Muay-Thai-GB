import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { UserProfile } from '../types/api.types';

export default function AccountSettings() {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    dateOfBirth: userProfile?.dateOfBirth || '',
    biologicalSex: userProfile?.biologicalSex || 'male',
    addresses: userProfile?.addresses || [],
    emergencyContacts: userProfile?.emergencyContacts || []
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        dateOfBirth: userProfile.dateOfBirth || '',
        biologicalSex: userProfile.biologicalSex || 'male',
        addresses: userProfile.addresses || [],
        emergencyContacts: userProfile.emergencyContacts || []
      });
    }
  }, [userProfile]);

  const handleInputChange = (field: string, value: any) => {
    if (field !== 'dateOfBirth' && field !== 'biologicalSex') {
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleListChange = (field: 'addresses' | 'emergencyContacts', value: string) => {
    const items = value
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleSave = async () => {
    if (!userProfile) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const updates: Partial<UserProfile> = {
        dateOfBirth: formData.dateOfBirth || undefined,
        biologicalSex: formData.biologicalSex || undefined,
        addresses: formData.addresses ?? [],
        emergencyContacts: formData.emergencyContacts ?? []
      };

      const response = await apiService.updateUserProfile(userProfile.uid, updates);
      
      if (response.success && response.data) {
        updateUserProfile(response.data);
        setIsEditing(false);
        setSuccess('Profile updated successfully!');
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      dateOfBirth: userProfile?.dateOfBirth || '',
      biologicalSex: userProfile?.biologicalSex || 'male',
      addresses: userProfile?.addresses || [],
      emergencyContacts: userProfile?.emergencyContacts || []
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

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
        <p>Loading your account settings...</p>
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
            <button onClick={() => navigate('/dashboard')} className="nav-link-btn">
              Dashboard
            </button>
            <span className="user-greeting">Welcome, {userProfile.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Account Settings</h1>
          <p>Manage your account information and preferences</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="settings-container">
          <div className="settings-card">
            <div className="card-header">
              <h2>Profile Information</h2>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="edit-btn">
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    onClick={handleSave} 
                    disabled={isLoading}
                    className="save-btn"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={handleCancel} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="settings-form">
              <div className="form-message">
                <p>
                  You can update your date of birth, biological sex, address, and emergency contacts here. For every other detail,
                  please contact the Muay Thai GB admin team.
                </p>
              </div>
              {/* Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>
                
                <div className="form-group">
                  <label>Full Name</label>
                  <span className="form-value readonly">{userProfile.name}</span>
                  <small className="form-note">Name updates must be requested via the Muay Thai GB admin team.</small>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <span className="form-value">
                    {userProfile.email}
                    <span className={`verification-badge ${userProfile.emailVerified ? 'verified' : 'unverified'}`}>
                      {userProfile.emailVerified ? ' ✅ Verified' : ' ❌ Not Verified'}
                    </span>
                  </span>
                  <small className="form-note">Email address updates must be requested via the Muay Thai GB admin team.</small>
                </div>

                <div className="form-group">
                  <label>Mobile</label>
                  <span className="form-value">
                    {userProfile.mobile}
                    <span className={`verification-badge ${userProfile.mobileVerified ? 'verified' : 'unverified'}`}>
                      {userProfile.mobileVerified ? ' ✅ Verified' : ' ❌ Not Verified'}
                    </span>
                  </span>
                  <small className="form-note">Mobile number updates must be requested via the Muay Thai GB admin team.</small>
                </div>

                <div className="form-group">
                  <label>Member Code</label>
                  <span className="form-value readonly">{userProfile.memberCode}</span>
                  <small className="form-note">Member code changes must be requested via the Muay Thai GB admin team.</small>
                </div>

                <div className="form-group">
                  <label>Account Type</label>
                  <span className="form-value readonly">
                    {userProfile.userType === 'fighter' ? 'Fighter/Athlete' : 'Medical Professional'}
                  </span>
                  <small className="form-note">Account type updates must be requested via the Muay Thai GB admin team.</small>
                </div>
              </div>

              {/* Personal Details */}
              <div className="form-section">
                <h3>Personal Details</h3>
                
                <div className="form-group">
                  <label>Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="form-input"
                    />
                  ) : (
                    <span className="form-value">{userProfile.dateOfBirth || 'Not provided'}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Biological Sex</label>
                  {isEditing ? (
                    <select
                      value={formData.biologicalSex}
                      onChange={(e) => handleInputChange('biologicalSex', e.target.value)}
                      className="form-select"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  ) : (
                    <span className="form-value">
                      {userProfile.biologicalSex ? 
                        userProfile.biologicalSex.charAt(0).toUpperCase() + userProfile.biologicalSex.slice(1) 
                        : 'Not provided'
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="form-section">
                <h3>Address</h3>
                
                <div className="form-group">
                  <label>Address</label>
                  {isEditing ? (
                    <textarea
                      value={(formData.addresses || []).join('\n')}
                      onChange={(e) => handleListChange('addresses', e.target.value)}
                      className="form-input"
                      rows={4}
                    />
                  ) : (
                    <span className="form-value readonly">
                      {userProfile.addresses && userProfile.addresses.length > 0 
                        ? userProfile.addresses.join('; ') 
                        : 'Not provided'
                      }
                    </span>
                  )}
                  <small className="form-note">Enter one address per line when editing.</small>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="form-section">
                <h3>Emergency Contact</h3>
                
                <div className="form-group">
                  <label>Emergency Contacts</label>
                  {isEditing ? (
                    <textarea
                      value={(formData.emergencyContacts || []).join('\n')}
                      onChange={(e) => handleListChange('emergencyContacts', e.target.value)}
                      className="form-input"
                      rows={4}
                    />
                  ) : (
                    <span className="form-value readonly">
                      {userProfile.emergencyContacts && userProfile.emergencyContacts.length > 0 
                        ? userProfile.emergencyContacts.join('; ') 
                        : 'Not provided'
                      }
                    </span>
                  )}
                  <small className="form-note">Enter one emergency contact per line when editing.</small>
                </div>
              </div>

              {/* Medic-specific fields are managed separately in the real API */}
              {userProfile.userType === 'medic' && (
                <div className="form-section">
                  <h3>Medical Professional Details</h3>
                  
                  <div className="form-group">
                    <label>Professional Status</label>
                    <span className="form-value readonly">
                      Medic account (uses personalise:role:medic scope)
                    </span>
                    <small className="form-note">Professional credentials are verified manually by the admin team</small>
                    <small className="form-note">Professional status updates must be requested via the Muay Thai GB admin team.</small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
