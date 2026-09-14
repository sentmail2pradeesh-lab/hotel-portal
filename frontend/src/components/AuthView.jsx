import React, { useState, useRef } from 'react';
import { useHotel } from '../context/HotelContext';
import { 
  Building2, 
  KeyRound, 
  User, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Upload, 
  Plus, 
  CheckCircle2, 
  Lock,
  Hotel,
  Eye,
  EyeOff
} from 'lucide-react';

export const AuthView = () => {
  const { manager, propertiesList, managerLogin, adminRegister, addProperty, authNotice, isAdminRegistered } = useHotel();

  // Manager Login State
  const [loginIdentity, setLoginIdentity] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Super Admin Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Initial Onboarding 1st Property State
  const [firmName, setFirmName] = useState('');
  const [firmLogo, setFirmLogo] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Super Admin Registration (One-Time First Run Setup)
  const handleAdminRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill out all admin registration fields.');
      return;
    }
    if (!regEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminRegister(regName.trim(), regEmail.trim(), regPassword);
      if (res && !res.success) {
        setError(res.message || 'Super Admin registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to register Super Admin. Please ensure backend server is reachable.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginIdentity.trim() || !loginPassword) {
      setError('Please enter your email/username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await managerLogin(loginIdentity.trim(), loginPassword);
      if (res && !res.success) {
        setError(res.message || 'Sign in failed. Check your email and password.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Handle First Property Creation (If Super Admin has 0 properties)
  const handleCreateFirstProperty = async (e) => {
    e.preventDefault();
    if (!firmName.trim()) {
      setError('Please enter your initial property or hotel name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await addProperty({
        firmName: firmName.trim(),
        firmLogo: firmLogo,
        eSignature: null
      });
      if (!res.success) {
        setError(res.message || 'Failed to create initial property.');
      }
    } catch (err) {
      setError(err.message || 'Error creating property.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo image file must be smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFirmLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ONBOARDING SCREEN (Super Admin logged in but has no properties yet)
  if (manager && propertiesList.length === 0) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '520px' }}>
          <div className="auth-header">
            <div className="auth-logo" style={{ background: '#d97706' }}>
              <Hotel size={28} color="#ffffff" />
            </div>
            <h1 className="auth-title">Welcome, {manager.name}!</h1>
            <p className="auth-subtitle">
              Create your first hotel property to launch your management dashboard.
            </p>
          </div>

          {error && (
            <div className="auth-error-banner">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateFirstProperty} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Property / Hotel Name <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <Building2 size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. Grand Horizon Hotel & Suites"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Property Logo */}
            <div className="form-group">
              <label className="form-label">Property Brand Logo (Optional)</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed #cbd5e1'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {firmLogo ? (
                    <img src={firmLogo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Building2 size={24} color="#94a3b8" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {firmLogo ? 'Custom Logo Selected' : 'No Logo Uploaded'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG, JPG or SVG (Max 2MB)</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="first-prop-logo"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  <label htmlFor="first-prop-logo" className="btn-sub" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                    <Upload size={13} /> {firmLogo ? 'Change' : 'Upload'}
                  </label>
                  {firmLogo && (
                    <button type="button" className="btn-sub" style={{ padding: '6px 8px', fontSize: '12px', color: '#be123c' }} onClick={() => setFirmLogo(null)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? 'Creating Property...' : <><Plus size={16} /> Create Property & Launch Dashboard</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STANDARD AUTH SCREENS
  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Auth Brand Header */}
        <div className="auth-header">
          <div className="auth-logo" style={{ background: !isAdminRegistered ? '#d97706' : '#000000' }}>
            {!isAdminRegistered ? <ShieldCheck size={28} color="#ffffff" /> : <Building2 size={28} color="#ffffff" />}
          </div>
          <h1 className="auth-title">
            {!isAdminRegistered ? 'System Setup — Super Admin' : 'Hotel Operations Portal'}
          </h1>
          <p className="auth-subtitle">
            {!isAdminRegistered
              ? 'Welcome! Register your master Super Admin account to launch the portal.'
              : 'Sign in to access your hotel management dashboard'}
          </p>
        </div>

        {authNotice && (
          <div style={{
            background: '#fffbe5',
            border: '1px solid #fef08a',
            color: '#854d0e',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <span>{authNotice}</span>
          </div>
        )}

        {error && (
          <div className="auth-error-banner">
            {error}
          </div>
        )}

        {!isAdminRegistered ? (
          /* ONE-TIME INITIAL SUPER ADMIN REGISTRATION FORM */
          <form onSubmit={handleAdminRegisterSubmit} className="auth-form">
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={18} color="#1d4ed8" style={{ flexShrink: 0 }} />
              <span>Initial System Bootstrap: Set up master Super Admin credentials.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Super Admin Full Name <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Enter your full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Master Admin Email <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="form-input icon-padded"
                  placeholder="admin@aszenventures.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Master Password <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <KeyRound size={16} className="input-icon" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  className="form-input icon-padded"
                  placeholder="Create master password (min. 6 characters)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  tabIndex={-1}
                  title={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Master Password <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <Lock size={16} className="input-icon" />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  className="form-input icon-padded"
                  placeholder="Confirm password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  tabIndex={-1}
                  title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? 'Setting Up Super Admin...' : <><ShieldCheck size={16} /> Register Super Admin & Launch System</>}
            </button>
          </form>
        ) : (
          /* STANDARD LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email ID or Username</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Enter email address or username"
                  value={loginIdentity}
                  onChange={(e) => setLoginIdentity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <KeyRound size={16} className="input-icon" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  className="form-input icon-padded"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  tabIndex={-1}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? 'Signing In...' : <><ArrowRight size={16} /> Sign In to Portal</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
