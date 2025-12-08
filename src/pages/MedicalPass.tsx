/**
 * Medical Pass Page (Public)
 *
 * Displays a fighter's medical pass information.
 * This page is accessed via QR code scan at events.
 *
 * URL format: /medical/:profileId
 *
 * Displays:
 * - Fighter's basic info (name, DOB, contact details)
 * - Current suspension status (cleared/suspended)
 * - Suspension details if active
 * - Complete medical history timeline
 *
 * This is a public page - no authentication required.
 * Medical professionals scan the athlete's QR code to access this page.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { MedicalEntry, MedicalPassResponse } from '../types/api.types';

/** Human-readable labels for medical entry types */
const entryLabels: Record<string, string> = {
  pre_fight_check: 'Pre-fight Check',
  injury_assessment: 'Injury Assessment',
  medical_clearance: 'Medical Clearance',
  suspension_issued: 'Suspension Issued',
  suspension_cleared: 'Suspension Cleared',
  note: 'Note',
};

/** Formats an ISO date string to a human-readable local format */
const formatDate = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString();
};

export default function MedicalPass() {
  const { profileId } = useParams<{ profileId: string }>();
  const [data, setData] = useState<MedicalPassResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!profileId) {
        setError('No profile ID provided.');
        setLoading(false);
        return;
      }

      const response = await apiService.getMedicalPass(profileId);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Unable to load medical pass');
      }
      setLoading(false);
    };

    load();
  }, [profileId]);

  if (loading) {
    return (
      <div className="medical-pass-page">
        <p>Loading medical pass...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="medical-pass-page">
        <p className="error-text">{error || 'No data found.'}</p>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  const { profile, pii, suspension, history, status } = data;
  const isSuspended = suspension?.active;

  return (
    <div className="medical-pass-page">
      <div className="medical-pass-card">
        <header className="medical-pass-header">
          <div>
            <p className="eyebrow">Muay Thai GB Medical Pass</p>
            <h1>{profile.name || 'Fighter'}</h1>
            <p className="muted">Member #{profile.memberCode}</p>
            <p className="muted">Profile ID: {profile.profileId}</p>
          </div>
          <div className={`badge ${isSuspended ? 'badge-danger' : 'badge-success'}`}>
            {isSuspended ? 'Suspended' : 'Cleared'}
          </div>
        </header>

        <div className="medical-pass-grid">
          <div className="medical-pass-section">
            <h3>Basics</h3>
            <ul>
              {pii.dateOfBirth && (
                <li>
                  <strong>DOB:</strong> {pii.dateOfBirth}
                </li>
              )}
              {pii.biologicalSex && (
                <li>
                  <strong>Sex:</strong> {pii.biologicalSex}
                </li>
              )}
              {profile.mobile && (
                <li>
                  <strong>Mobile:</strong> {profile.mobile}
                </li>
              )}
              {pii.addresses && (
                <li>
                  <strong>Address:</strong> {pii.addresses.map((a) => (typeof a === 'string' ? a : a.value)).join('; ')}
                </li>
              )}
              {pii.emergencyContacts && (
                <li>
                  <strong>Emergency Contact:</strong>{' '}
                  {pii.emergencyContacts.map((c) => (typeof c === 'string' ? c : c.value)).join('; ')}
                </li>
              )}
              {status && (
                <li>
                  <strong>Status:</strong> {status}
                </li>
              )}
            </ul>
          </div>

          <div className="medical-pass-section">
            <h3>Suspension</h3>
            {suspension ? (
              <ul>
                <li>
                  <strong>Reason:</strong> {suspension.reason}
                </li>
                <li>
                  <strong>Start:</strong> {formatDate(suspension.startDate)}
                </li>
                {suspension.endDate && (
                  <li>
                    <strong>End:</strong> {formatDate(suspension.endDate)}
                  </li>
                )}
                {suspension.notes && (
                  <li>
                    <strong>Notes:</strong> {suspension.notes}
                  </li>
                )}
                <li>
                  <strong>Issued by:</strong> {suspension.issuedBy}
                </li>
              </ul>
            ) : (
              <p className="muted">No active or historical suspensions.</p>
            )}
          </div>
        </div>

        <div className="medical-pass-section">
          <h3>Medical History</h3>
          {history.length === 0 ? (
            <p className="muted">No medical entries recorded.</p>
          ) : (
            <div className="timeline">
              {history.map((entry: MedicalEntry) => (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-meta">
                    <span className="timeline-title">{entryLabels[entry.entryType] || entry.entryType}</span>
                    <span className="muted">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p>{entry.notes}</p>
                  <p className="muted">By {entry.medicName}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="medical-pass-footer">
          <Link to="/">Back to home</Link>
        </footer>
      </div>
    </div>
  );
}
