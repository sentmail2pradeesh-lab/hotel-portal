import React, { useState, useRef, useEffect } from 'react';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';
import { Building2, KeyRound, User, Mail, ShieldCheck, ArrowRight, Clock, Upload, FileSignature, Plus, CheckCircle2, Lock } from 'lucide-react';

export const AuthView = () => {
  const { manager, propertiesList, managerLogin, adminRegister, addProperty, authNotice, isAdminRegistered } = useHotel();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'invite'

  // Invitation Activation State
  const [inviteToken, setInviteToken] = useState('');
  const [inviteDetails, setInviteDetails] = useState(null);

  // Manager Login State
  const [loginIdentity, setLoginIdentity] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Admin / Manager Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Initial Onboarding 1st Property State
  const [firmName, setFirmName] = useState('');
  const [firmLogo, setFirmLogo] = useState(null);
  const [eSignature, setESignature] = useState(null);
  const [signatureMode, setSignatureMode] = useState('upload'); // 'upload' | 'draw'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check URL token parameter on mount
  useEffect(() => {
    const extractToken = () => {
      const href = window.location.href;
      if (!href.includes('token=')) return '';
      const match = href.match(/token=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : '';
    };

    const tokenVal = extractToken();
    if (tokenVal) {
      setInviteToken(tokenVal);
      setAuthMode('invite');
      setLoading(true);
      api.getInvitationDetails(tokenVal)
        .then((details) => {
          setInviteDetails(details);
          setRegEmail(details.email || '');
        })
        .catch((err) => {
          setError(err.message || 'Invalid or expired invitation link.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  // Handle Overall Admin Registration (One-Time Setup)
  const handleAdminRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill out all admin setup fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await adminRegister(regName.trim(), regEmail.trim(), regPassword);
      if (res && !res.success) {
        setError(res.message || 'Admin registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Manager Login
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
        setError(res.message || 'Sign in failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Invitation Acceptance & Activation
  const handleAcceptInviteSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regPassword) {
      setError('Please enter your manager name and set a password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.acceptManagerInvitation(inviteToken, regName.trim(), regPassword);
      if (res && res.token) {
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.message || 'Failed to activate manager account.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Initial 1st Property Creation after Manager registration
  const handleFirstPropertySubmit = async (e) => {
    e.preventDefault();
    if (!firmName.trim()) {
      setError('Please enter the property name.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await addProperty({
      firmName: firmName.trim(),
      firmLogo,
      eSignature
    });
    setLoading(false);
    if (res && !res.success) {
      setError(res.message || 'Failed to create property.');
    }
  };

  // Logo file upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFirmLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // E-Signature file upload handler
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setESignature(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) setESignature(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setESignature(null);
    }
  };

  // IF MANAGER IS LOGGED IN BUT HAS 0 PROPERTIES -> SHOW 1ST PROPERTY ONBOARDING SCREEN
  if (manager && propertiesList.length === 0) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '520px' }}>
          <div className="auth-header">
            <div className="auth-logo">
              <Building2 size={28} color="#d97706" />
            </div>
            <h1 className="auth-title">Welcome, {manager.name}!</h1>
            <p className="auth-subtitle">Add your 1st property to launch your multi-property dashboard</p>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

          <form onSubmit={handleFirstPropertySubmit} className="auth-form" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Property / Hotel Name <span style={{ color: '#be123c' }}>*</span></label>
              <div className="input-icon-wrapper">
                <Building2 size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Enter property name"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Property Logo */}
            <div className="form-group">
              <label className="form-label">Property Header Logo (Optional)</label>
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
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {firmLogo ? (
                    <img src={firmLogo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Building2 size={24} color="#f59e0b" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {firmLogo ? 'Custom Logo Uploaded' : 'No Logo Uploaded'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG, JPG or SVG</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="first-prop-logo"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  <label htmlFor="first-prop-logo" className="btn-sub" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
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

            {/* E-Signature */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Manager E-Signature (Optional)</label>
                <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: signatureMode === 'upload' ? '#ffffff' : 'transparent',
                      color: signatureMode === 'upload' ? '#0f172a' : '#64748b',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSignatureMode('upload')}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: signatureMode === 'draw' ? '#ffffff' : 'transparent',
                      color: signatureMode === 'draw' ? '#0f172a' : '#64748b',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSignatureMode('draw')}
                  >
                    Draw Signature
                  </button>
                </div>
              </div>

              {signatureMode === 'upload' ? (
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
                    width: '90px',
                    height: '42px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {eSignature ? (
                      <img src={eSignature} alt="Signature Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <FileSignature size={20} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {eSignature ? 'Digital Signature Attached' : 'No Signature Attached'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Transparent PNG scan</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="first-prop-esign"
                      style={{ display: 'none' }}
                      onChange={handleSignatureUpload}
                    />
                    <label htmlFor="first-prop-esign" className="btn-sub" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                      <Upload size={13} /> {eSignature ? 'Change' : 'Upload'}
                    </label>
                    {eSignature && (
                      <button type="button" className="btn-sub" style={{ padding: '6px 8px', fontSize: '12px', color: '#be123c' }} onClick={() => setESignature(null)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={95}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'crosshair',
                      touchAction: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sign inside box using mouse or touch</span>
                    <button type="button" className="btn-sub" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={clearCanvas}>
                      Clear Drawing
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? 'Creating Property...' : <><Plus size={16} /> Create Property & Launch Dashboard</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STANDARD MANAGER LOGIN & REGISTER FORMS
  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Auth Brand Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <Building2 size={28} color="#000000" />
          </div>
          <h1 className="auth-title">
            {!isAdminRegistered && authMode !== 'invite' ? 'System Initial Setup' : 'Hotel Operations Portal'}
          </h1>
          <p className="auth-subtitle">
            {!isAdminRegistered && authMode !== 'invite'
              ? 'Register master Overall Admin account to launch system'
              : 'Sign in as Overall Admin or Property Manager'}
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

        {/* INVITATION ACTIVATION FORM */}
        {authMode === 'invite' ? (
          <form onSubmit={handleAcceptInviteSubmit} className="auth-form">
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} color="#047857" style={{ flexShrink: 0 }} />
              <span>You are invited by Admin ({inviteDetails?.senderEmail || 'Admin'}) to manage this property.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Property Name (Fixed by Admin)</label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <Building2 size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  value={inviteDetails?.propertyName || 'Loading property...'}
                  disabled
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#334155', fontWeight: 700 }}
                />
                <Lock size={14} color="#64748b" style={{ position: 'absolute', right: '12px', top: '13px' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Manager Email Address (Fixed)</label>
              <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="form-input icon-padded"
                  value={inviteDetails?.email || regEmail || ''}
                  disabled
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#334155', fontWeight: 700 }}
                />
                <Lock size={14} color="#64748b" style={{ position: 'absolute', right: '12px', top: '13px' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Manager Full Name <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Enter full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Create Password <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  className="form-input icon-padded"
                  placeholder="Enter password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? 'Activating Account...' : <><ArrowRight size={16} /> Activate Account & Sign In</>}
            </button>
          </form>
        ) : !isAdminRegistered ? (
          /* ONE-TIME INITIAL OVERALL ADMIN REGISTRATION FORM */
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
              <span>Initial Setup: Register master Overall Admin credentials.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Full Name <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Enter admin full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Master Email <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="form-input icon-padded"
                  placeholder="Enter admin email address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Master Password <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  className="form-input icon-padded"
                  placeholder="Enter password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? 'Creating Master Admin...' : <><ShieldCheck size={16} /> Register Overall Admin & Launch System</>}
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
              <div className="input-icon-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  className="form-input icon-padded"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
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
