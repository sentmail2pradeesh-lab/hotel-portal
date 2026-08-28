import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { Building2, KeyRound, User, Mail, ShieldCheck, ArrowRight } from 'lucide-react';

export const AuthView = () => {
  const { login, register } = useHotel();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFirmName, setRegFirmName] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setError('Please enter your manager username or property email and password.');
      return;
    }
    setError('');
    const res = login(loginUsername.trim(), loginPassword);
    if (res && !res.success) {
      setError(res.message);
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regFirmName.trim() || !regName.trim() || !regPassword) {
      setError('Please fill out all required property registration fields.');
      return;
    }
    setError('');
    const res = register(regFirmName.trim(), regName.trim(), regEmail.trim(), regPassword);
    if (res && !res.success) {
      setError(res.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Auth Brand Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <Building2 size={28} color="#000000" />
          </div>
          <h1 className="auth-title">Property Portal</h1>
          <p className="auth-subtitle">Property Manager Dashboard Sign In</p>
        </div>

        {/* Auth Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => { setAuthMode('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => { setAuthMode('register'); setError(''); }}
          >
            Register New Property
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Manager Username or Property Email</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Enter manager username or email"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  className="form-input icon-padded"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-main" style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              Sign In to Property Dashboard <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Property / Hotel Name</label>
              <div className="input-icon-wrapper">
                <Building2 size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. Grand Horizon Hotel & Suites"
                  value={regFirmName}
                  onChange={(e) => setRegFirmName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Property Manager Name / Username</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. Alex Morgan"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Manager Work Email (Optional)</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="form-input icon-padded"
                  placeholder="e.g. manager@horizon.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account Password</label>
              <div className="input-icon-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  className="form-input icon-padded"
                  placeholder="Create property account password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-main" style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              Register Property & Launch Dashboard <ShieldCheck size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
