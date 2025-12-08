/**
 * Dashboard Page
 *
 * Main authenticated user interface that displays different content based on user type:
 *
 * For Fighters:
 * - Profile information display
 * - QR code for their digital medical pass
 * - Quick access to account settings
 *
 * For Medics:
 * - All of the above, plus...
 * - Medical Portal: Search for fighters and manage their medical records
 * - Add medical entries (pre-fight checks, injury assessments, etc.)
 * - Issue or clear medical suspensions
 * - View complete medical history timeline
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AthleteQRCode from '../components/QRCode/AthleteQRCode';
import { apiService } from '../services/api';
import { MedicalEntry, MedicalPassResponse, Suspension } from '../types/api.types';

export default function Dashboard() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // ============================================================================
  // Medic Portal State
  // These state variables are only used when the logged-in user is a medic
  // ============================================================================
  const [medicTargetId, setMedicTargetId] = useState('');           // Fighter ID being searched/viewed
  const [medicData, setMedicData] = useState<MedicalPassResponse | null>(null);  // Loaded fighter data
  const [medicLoading, setMedicLoading] = useState(false);          // Loading state for API calls
  const [medicError, setMedicError] = useState<string | null>(null); // Error messages

  // Medical entry form state
  const [entryNotes, setEntryNotes] = useState('');
  const [entryType, setEntryType] = useState<MedicalEntry['entryType']>('pre_fight_check');

  // Suspension form state
  const [suspensionReason, setSuspensionReason] = useState('Medical suspension for observation');
  const [suspensionDays, setSuspensionDays] = useState(7);

  /**
   * Logs the user out and redirects to home page.
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      // Silent fail - user can retry
    }
  };

  // Show loading state while profile is being fetched
  if (!userProfile) {
    return (
      <div className="dashboard-loading">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  // ============================================================================
  // Medic Portal Functions
  // These functions handle the medical record management features
  // ============================================================================

  /**
   * Searches for a fighter by their profile ID and loads their medical pass data.
   * Called when the medic clicks "Search Fighter" button.
   */
  const loadMedicRecord = async () => {
    if (!medicTargetId) return;
    setMedicLoading(true);
    setMedicError(null);
    const response = await apiService.getMedicalPass(medicTargetId.trim());
    if (response.success && response.data) {
      setMedicData(response.data);
    } else {
      setMedicError(response.error || 'Unable to load record');
    }
    setMedicLoading(false);
  };

  /**
   * Adds a new medical entry to the fighter's record.
   * The entry includes type (pre-fight check, injury assessment, etc.),
   * notes from the medic, and is timestamped automatically.
   */
  const addEntry = async () => {
    if (!medicTargetId || !entryNotes) return;
    setMedicLoading(true);
    const response = await apiService.addMedicalEntry(medicTargetId.trim(), {
      entryType,
      notes: entryNotes,
      medicName: userProfile?.name,
      medicId: userProfile?.profileId,
    });
    if (response.success && response.data) {
      setMedicData(response.data);
      setEntryNotes('');  // Clear form after successful submission
    } else {
      setMedicError(response.error || 'Unable to add entry');
    }
    setMedicLoading(false);
  };

  /**
   * Issues or clears a medical suspension on a fighter.
   *
   * @param clear - If true, removes existing suspension. If false, creates new suspension.
   *
   * When issuing a suspension:
   * - Start date is set to now
   * - End date is calculated from suspensionDays state
   * - Records the issuing medic's name
   */
  const setSuspension = async (clear = false) => {
    if (!medicTargetId) return;
    setMedicLoading(true);

    // Build suspension object or undefined to clear
    const suspension: Suspension | undefined = clear
      ? undefined
      : {
          active: true,
          reason: suspensionReason || 'Medical suspension',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000).toISOString(),
          issuedBy: userProfile?.name || 'Demo Medic',
          notes: 'Issued via demo panel',
        };

    const response = await apiService.setSuspension(medicTargetId.trim(), suspension);
    if (response.success && response.data) {
      setMedicData(response.data);
    } else {
      setMedicError(response.error || 'Unable to update suspension');
    }
    setMedicLoading(false);
  };

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
            <h3>Events & Competitions</h3>
            <p>Register for upcoming events, view competition schedules, and track your fight record.</p>
            <button className="card-button" disabled>
                Coming Soon
            </button>
        </div>
        </div>

        {userProfile.userType === 'medic' && (
          <div className="medic-portal">
            <div className="medic-portal-header">
              <div className="medic-portal-icon">+</div>
              <div className="medic-portal-title">
                <h2>Medical Portal</h2>
                <p>Search for a fighter, review their medical history, and manage their records</p>
              </div>
            </div>

            {/* Step 1: Fighter Search */}
            <div className="medic-section">
              <div className="medic-section-header">
                <span className="medic-step">1</span>
                <h3>Find Fighter</h3>
              </div>
              <div className="medic-search-box">
                <div className="medic-search-input-wrapper">
                  <input
                    type="text"
                    value={medicTargetId}
                    onChange={(e) => setMedicTargetId(e.target.value)}
                    placeholder="Enter fighter's profile ID (e.g., mock-fighter-123)"
                    className="medic-search-input"
                  />
                </div>
                <button
                  className="medic-search-btn"
                  onClick={loadMedicRecord}
                  disabled={medicLoading || !medicTargetId.trim()}
                >
                  {medicLoading ? (
                    <>
                      <span className="spinner"></span>
                      Searching...
                    </>
                  ) : (
                    'Search Fighter'
                  )}
                </button>
              </div>
              {medicError && (
                <div className="medic-error">
                  {medicError}
                </div>
              )}
            </div>

            {/* Step 2: Fighter Profile Card */}
            {medicData && (
              <>
                <div className="medic-section">
                  <div className="medic-section-header">
                    <span className="medic-step">2</span>
                    <h3>Fighter Profile</h3>
                  </div>
                  <div className="fighter-profile-card">
                    <div className="fighter-profile-main">
                      <div className="fighter-avatar">
                        {medicData.profile.name?.charAt(0).toUpperCase() || 'F'}
                      </div>
                      <div className="fighter-info">
                        <h4>{medicData.profile.name}</h4>
                        <p className="fighter-member-code">Member #{medicData.profile.memberCode}</p>
                        <p className="fighter-id">ID: {medicData.profile.profileId}</p>
                      </div>
                      <div className={`fighter-status ${medicData.suspension?.active ? 'status-suspended' : 'status-cleared'}`}>
                        <span className="status-text">{medicData.suspension?.active ? 'SUSPENDED' : 'CLEARED'}</span>
                      </div>
                    </div>
                    {medicData.suspension?.active && (
                      <div className="suspension-details">
                        <p><strong>Reason:</strong> {medicData.suspension.reason}</p>
                        <p><strong>Until:</strong> {medicData.suspension.endDate ? new Date(medicData.suspension.endDate).toLocaleDateString() : 'Indefinite'}</p>
                        <p><strong>Issued by:</strong> {medicData.suspension.issuedBy}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Actions */}
                <div className="medic-section">
                  <div className="medic-section-header">
                    <span className="medic-step">3</span>
                    <h3>Take Action</h3>
                  </div>

                  <div className="medic-action-cards">
                    {/* Add Medical Entry Card */}
                    <div className="medic-action-card">
                      <div className="action-card-header">
                        <h4>Add Medical Entry</h4>
                      </div>
                      <p className="action-description">Record a medical observation, assessment, or clearance</p>

                      <div className="action-form">
                        <div className="form-field">
                          <label>Entry Type</label>
                          <select
                            value={entryType}
                            onChange={(e) => setEntryType(e.target.value as MedicalEntry['entryType'])}
                            className="medic-select"
                          >
                            <option value="pre_fight_check">Pre-fight Check</option>
                            <option value="injury_assessment">Injury Assessment</option>
                            <option value="medical_clearance">Medical Clearance</option>
                            <option value="suspension_issued">Suspension Issued</option>
                            <option value="suspension_cleared">Suspension Cleared</option>
                            <option value="note">General Note</option>
                          </select>
                        </div>

                        <div className="form-field">
                          <label>Notes</label>
                          <textarea
                            value={entryNotes}
                            onChange={(e) => setEntryNotes(e.target.value)}
                            placeholder="Enter your medical notes here..."
                            rows={4}
                            className="medic-textarea"
                          />
                        </div>

                        <button
                          className="action-btn action-btn-primary"
                          onClick={addEntry}
                          disabled={medicLoading || !entryNotes.trim()}
                        >
                          {medicLoading ? 'Adding...' : 'Add Entry'}
                        </button>
                      </div>
                    </div>

                    {/* Manage Suspension Card */}
                    <div className="medic-action-card">
                      <div className="action-card-header">
                        <h4>Manage Suspension</h4>
                      </div>
                      <p className="action-description">Issue or clear a medical suspension for this fighter</p>

                      <div className="action-form">
                        <div className="form-field">
                          <label>Suspension Reason</label>
                          <input
                            type="text"
                            value={suspensionReason}
                            onChange={(e) => setSuspensionReason(e.target.value)}
                            placeholder="e.g., Concussion protocol"
                            className="medic-input"
                          />
                        </div>

                        <div className="form-field">
                          <label>Duration (days)</label>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={suspensionDays}
                            onChange={(e) => setSuspensionDays(Number(e.target.value))}
                            className="medic-input"
                          />
                        </div>

                        <div className="suspension-btn-group">
                          <button
                            className="action-btn action-btn-danger"
                            onClick={() => setSuspension(false)}
                            disabled={medicLoading || !suspensionReason.trim()}
                          >
                            {medicLoading ? 'Processing...' : 'Issue Suspension'}
                          </button>
                          <button
                            className="action-btn action-btn-success"
                            onClick={() => setSuspension(true)}
                            disabled={medicLoading || !medicData.suspension?.active}
                          >
                            Clear Suspension
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Medical History */}
                <div className="medic-section">
                  <div className="medic-section-header">
                    <span className="medic-step">4</span>
                    <h3>Medical History</h3>
                    <span className="history-count">{medicData.history.length} entries</span>
                  </div>

                  {medicData.history.length === 0 ? (
                    <div className="empty-history">
                      <p>No medical entries recorded yet</p>
                    </div>
                  ) : (
                    <div className="medical-timeline">
                      {medicData.history.map((entry, index) => (
                        <div key={entry.id} className="timeline-entry">
                          <div className="timeline-marker">
                            <span className="timeline-dot"></span>
                            {index < medicData.history.length - 1 && <span className="timeline-line"></span>}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className={`entry-type-badge entry-type-${entry.entryType.replace(/_/g, '-')}`}>
                                {entry.entryType.replace(/_/g, ' ')}
                              </span>
                              <span className="timeline-date">
                                {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="timeline-notes">{entry.notes}</p>
                            <p className="timeline-medic">Recorded by {entry.medicName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        )}

        <div className="welcome-message">
          <h2>About Muay Thai GB</h2>
          <p>
            Muay Thai GB is dedicated to advancing the sport of Muay Thai across Great Britain. Our digital medical pass system ensures athlete safety by providing secure, QR code-based medical records that can be instantly verified at any event. We're committed to providing a governing body fully representative of the whole Muay Thai community, raising participation, and becoming the recognized National Governing Body for Muay Thai in the UK.
          </p>
        </div>

      </main>
    </div>
  );
}
