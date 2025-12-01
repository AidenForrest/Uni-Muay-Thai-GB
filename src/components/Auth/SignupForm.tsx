import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignupForm() {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Join Muay Thai GB</h2>
          <p>Become a member of the Muay Thai GB community</p>
        </div>

        <div className="signup-info">
          <p>
            To join Muay Thai GB as a fighter or medical professional, please contact us directly.
          </p>
          <p className="contact-details">
            <strong>Email:</strong> enquiries@muaythaigb.org
          </p>
          <p className="contact-details">
            <strong>Website:</strong> muaythaigb.org
          </p>
          <p className="signup-note">
            Our team will guide you through the registration process and verify your credentials.
          </p>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} className="auth-link">Sign in</span>
          </p>
        </div>
      </div>
    </div>
  );
}
