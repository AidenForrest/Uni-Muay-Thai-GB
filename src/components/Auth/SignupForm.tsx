import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../../config/features';

export default function SignupForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'fighter' | 'medic'>('fighter');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    mobile: '',
    dateOfBirth: '',
    biologicalSex: '' as 'male' | 'female' | '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postcode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      const userData = {
        name: formData.name,
        userType,
        mobile: formData.mobile,
        ...(userType === 'fighter' && {
          dateOfBirth: formData.dateOfBirth,
          biologicalSex: formData.biologicalSex as 'male' | 'female',
          address: {
            line1: formData.addressLine1,
            line2: formData.addressLine2,
            city: formData.city,
            county: formData.county,
            postcode: formData.postcode,
            country: 'United Kingdom'
          },
          emergencyContact: {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone,
            relationship: formData.emergencyContactRelationship
          }
        })
      };

      await signup(formData.email, formData.password, userData);
      navigate('/dashboard');
    } catch (error: any) {
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Join Muay Thai GB</h2>
          {CONFIG.USE_MOCK_API ? (
            <p>Create your account and start your journey</p>
          ) : (
            <p>New user registration is currently handled manually. Please use your provided test credentials to log in.</p>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {CONFIG.USE_MOCK_API ? (
          // Show full signup form for mock API
          <>
            <div className="user-type-selector">
          <button
            type="button"
            className={`user-type-btn ${userType === 'fighter' ? 'active' : ''}`}
            onClick={() => setUserType('fighter')}
          >
            Fighter/Athlete
          </button>
          <button
            type="button"
            className={`user-type-btn ${userType === 'medic' ? 'active' : ''}`}
            onClick={() => setUserType('medic')}
          >
            Medical Professional
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="mobile">Mobile Number</label>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                placeholder="Your mobile number"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>
          </div>

          {userType === 'fighter' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="biologicalSex">Biological Sex</label>
                  <select
                    id="biologicalSex"
                    name="biologicalSex"
                    value={formData.biologicalSex}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Address Information</h3>
                <div className="form-group">
                  <label htmlFor="addressLine1">Address Line 1</label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    required
                    placeholder="Street address"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="addressLine2">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="county">County</label>
                    <input
                      type="text"
                      id="county"
                      name="county"
                      value={formData.county}
                      onChange={handleChange}
                      required
                      placeholder="County"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="postcode">Postcode</label>
                    <input
                      type="text"
                      id="postcode"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      required
                      placeholder="Postcode"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Emergency Contact</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="emergencyContactName">Contact Name</label>
                    <input
                      type="text"
                      id="emergencyContactName"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      required
                      placeholder="Emergency contact full name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyContactRelationship">Relationship</label>
                    <input
                      type="text"
                      id="emergencyContactRelationship"
                      name="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Spouse, Parent, Sibling"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="emergencyContactPhone">Contact Phone</label>
                  <input
                    type="tel"
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    required
                    placeholder="Emergency contact phone number"
                  />
                </div>
              </div>
            </>
          )}

              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </>
        ) : (
          // Show login redirect for real API
          <div className="signup-redirect">
            <div className="info-box">
              <h3>Registration Process</h3>
              <p>New member registration for Muay Thai GB is currently handled through a manual verification process.</p>
              <ul>
                <li>Fighters register and are verified by the admin team</li>
                <li>Medics register with <strong>personalise:role:medic</strong> scope</li>
                <li>Manual verification happens via our admin console</li>
                <li>Once approved, you can access all features</li>
              </ul>
              <button 
                className="auth-button" 
                onClick={() => navigate('/login')}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <p>
            {CONFIG.USE_MOCK_API 
              ? "Already have an account?" 
              : "Have test credentials?"
            } 
            <span onClick={() => navigate('/login')} className="auth-link">Sign in</span>
          </p>
        </div>
      </div>
    </div>
  );
}