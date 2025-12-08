/**
 * Home Page (Landing Page)
 *
 * The public-facing landing page for Muay Thai GB.
 * Displays:
 * - Navigation with login/signup buttons
 * - Hero section with call-to-action
 * - Features grid highlighting the medical pass system
 * - Footer with contact information and quick links
 *
 * This page is only accessible to unauthenticated users.
 * Authenticated users are redirected to the dashboard.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <nav className="nav-bar">
        <div className="nav-content">
          <div className="logo">
            <h2>Muay Thai GB</h2>
          </div>
          <div className="nav-actions">
            <button onClick={() => navigate('/login')} className="nav-btn secondary">
              Login
            </button>
            <button onClick={() => navigate('/signup')} className="nav-btn primary">
              Join Now
            </button>
          </div>
        </div>
      </nav>

      <header className="hero-section">
        <div className="hero-content">
          <h1>Welcome to Muay Thai GB</h1>
          <p className="hero-subtitle">
            Your gateway to the authentic world of Muay Thai. Connect with certified trainers, 
            track your progress, and become part of the UK's premier Muay Thai community.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/signup')} className="cta-button">
              Start Your Journey
            </button>
            <button onClick={() => navigate('/login')} className="cta-button secondary">
              Member Login
            </button>
          </div>
        </div>
      </header>

      <section className="features-section">
        <div className="container">
          <h2>Why Choose Muay Thai GB?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏥</div>
              <h3>Digital Medical Pass</h3>
              <p>Secure QR code-based medical records ensuring athlete safety at every event.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Instant Verification</h3>
              <p>Medics can instantly access and update fighter medical history with a simple scan.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Athlete Safety</h3>
              <p>Automatic suspension management protects fighters and ensures compliance.</p>
            </div>
          </div>
        </div>
      </section>


      <section className="cta-section">
        <div className="container">
          <h2>Ready to Begin Your Muay Thai Journey?</h2>
          <p>Join thousands of athletes across the UK who trust Muay Thai GB</p>
          <button onClick={() => navigate('/signup')} className="cta-button large">
            Get Started Today
          </button>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Muay Thai GB</h4>
              <p>The national governing body for Muay Thai in Great Britain, dedicated to athlete safety and sport development.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><span onClick={() => navigate('/login')}>Login</span></li>
                <li><span onClick={() => navigate('/signup')}>Join Now</span></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>enquiries@muaythaigb.org</p>
              <p>muaythaigb.org</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Muay Thai GB. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}