import React, { useState } from 'react';
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
  Lock,
  Hotel,
  Eye,
  EyeOff,
  Phone,
  Hash,
  UserCheck,
  Zap
} from 'lucide-react';

export const AuthView = () => {
  const { manager, propertiesList, managerLogin, adminRegister, addProperty, authNotice, isAdminRegistered } = useHotel();

  // Manager Login State
  const [loginIdentity, setLoginIdentity] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Super Admin Register State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Initial Onboarding 1st Property State
  const [firstPropCode, setFirstPropCode] = useState('PR001');
  const [firmName, setFirmName] = useState('');
  const [firstOwnerName, setFirstOwnerName] = useState('');
  const [firstOwnerPhone, setFirstOwnerPhone] = useState('');
  const [firstTnebNumber, setFirstTnebNumber] = useState('');
  const [firmLogo, setFirmLogo] = useState(null);

  // Initial Rooms Setup State
  const [firstRoomMode, setFirstRoomMode] = useState('range'); // 'range' | 'custom' | 'default' | 'none'
  const [firstStartRoom, setFirstStartRoom] = useState('101');
  const [firstEndRoom, setFirstEndRoom] = useState('110');
  const [firstRoomType, setFirstRoomType] = useState('Standard Room');
  const [firstCustomRoomsText, setFirstCustomRoomsText] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Handle Super Admin Registration (One-Time First Run Setup)
  const handleAdminRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill out all registration fields: Name, Phone Number, Username/Email, and Password.');
      return;
    }
    if (regPhone.trim().replace(/[^0-9]/g, '').length < 7) {
      setError('Please enter a valid contact phone number.');
      return;
    }
    if (regEmail.trim().length < 3) {
      setError('Username or Email must be at least 3 characters.');
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
    setLoadingMessage('Registering Super Admin...');
    try {
      const res = await adminRegister(regName.trim(), regPhone.trim(), regEmail.trim(), regPassword);
      if (res && !res.success) {
        setError(res.message || 'Super Admin registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to register Super Admin. Please ensure backend server is reachable.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle Standard Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginIdentity.trim() || !loginPassword) {
      setError('Please enter your username/email and password.');
      return;
    }
    setError('');
    setLoading(true);
    setLoadingMessage('Signing in...');

    // If server was asleep (Render/Railway cold start), give friendly live feedback after 2.5s
    const coldStartTimer = setTimeout(() => {
      setLoadingMessage('Connecting to secure cloud server... (waking up service, please hold on)');
    }, 2500);

    try {
      const res = await managerLogin(loginIdentity.trim(), loginPassword);
      clearTimeout(coldStartTimer);
      if (res && !res.success) {
        setError(res.message || 'Sign in failed. Check your username and password.');
      }
    } catch (err) {
      clearTimeout(coldStartTimer);
      setError(err.message || 'Failed to connect to backend server. Make sure server is running.');
    } finally {
      clearTimeout(coldStartTimer);
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Helper to compute initial rooms to pass
  const getComputedInitialRooms = () => {
    if (firstRoomMode === 'default') {
      return null; // Signals backend to use DEFAULT_ROOMS
    }
    if (firstRoomMode === 'none') {
      return []; // Explicit empty array means 0 initial rooms
    }
    if (firstRoomMode === 'range') {
      const start = parseInt(firstStartRoom, 10);
      const end = parseInt(firstEndRoom, 10);
      if (isNaN(start) || isNaN(end) || start > end) return null;
      const count = Math.min(Math.max(end - start + 1, 0), 200);
      const generated = [];
      for (let i = 0; i < count; i++) {
        generated.push({
          roomNumber: String(start + i),
          roomType: firstRoomType,
          isStaffRoom: false
        });
      }
      return generated;
    }
    if (firstRoomMode === 'custom') {
      const nums = firstCustomRoomsText
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
      return nums.map(num => ({
        roomNumber: num,
        roomType: firstRoomType,
        isStaffRoom: false
      }));
    }
    return null;
  };

  // Handle First Property Creation (If Super Admin has 0 properties)
  const handleCreateFirstProperty = async (e) => {
    e.preventDefault();
    if (!firstPropCode.trim()) {
      setError('Please enter a property code (e.g. PR001).');
      return;
    }
    const cleanFirm = firmName.trim() || firstPropCode.trim().toUpperCase();
    setError('');
    setLoading(true);
    setLoadingMessage('Creating property & generating initial rooms...');
    try {
      const initialRooms = getComputedInitialRooms();
      const res = await addProperty({
        propertyCode: firstPropCode.trim().toUpperCase(),
        firmName: cleanFirm,
        ownerName: firstOwnerName.trim() || null,
        ownerPhone: firstOwnerPhone.trim() || null,
        tnebNumber: firstTnebNumber.trim() || null,
        firmLogo: firmLogo,
        eSignature: null,
        initialRooms
      });
      if (!res.success) {
        setError(res.message || 'Failed to create initial property.');
      }
    } catch (err) {
      setError(err.message || 'Error creating property.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
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
        <div className="auth-card" style={{ maxWidth: '540px' }}>
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

          <form onSubmit={handleCreateFirstProperty} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Property Code <span style={{ color: '#e11d48' }}>*</span></label>
                <div className="input-icon-wrapper">
                  <Hash size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input icon-padded"
                    placeholder="e.g. PR001"
                    value={firstPropCode}
                    onChange={(e) => setFirstPropCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Property / Hotel Name <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>(Optional)</span></label>
                <div className="input-icon-wrapper">
                  <Building2 size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input icon-padded"
                    placeholder="Defaults to Property Code if blank"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Property Owner Name</label>
                <div className="input-icon-wrapper">
                  <UserCheck size={16} className="input-icon" />
                  <input
                    type="text"
                    className="form-input icon-padded"
                    placeholder="e.g. Mr. Rajesh Sharma"
                    value={firstOwnerName}
                    onChange={(e) => setFirstOwnerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Owner Number / Phone</label>
                <div className="input-icon-wrapper">
                  <Phone size={16} className="input-icon" />
                  <input
                    type="tel"
                    className="form-input icon-padded"
                    placeholder="e.g. +91 98765 43210"
                    value={firstOwnerPhone}
                    onChange={(e) => setFirstOwnerPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">TNEB Account Number</label>
              <div className="input-icon-wrapper">
                <Zap size={16} className="input-icon" color="#d97706" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. 04-123-456-7890 (EB Consumer No)"
                  value={firstTnebNumber}
                  onChange={(e) => setFirstTnebNumber(e.target.value)}
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

            {/* Initial Rooms Configuration (Bulk Add) */}
            <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginTop: '4px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Initial Rooms Setup (Bulk Add)</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                  {firstRoomMode === 'default' ? '20 Standard Rooms' : firstRoomMode === 'range' ? `${Math.max(0, parseInt(firstEndRoom || 0) - parseInt(firstStartRoom || 0) + 1)} Rooms` : firstRoomMode === 'custom' ? 'Custom Rooms' : '0 Rooms'}
                </span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', margin: '4px 0 10px' }}>
                {[
                  { id: 'range', label: 'By Range' },
                  { id: 'custom', label: 'Custom List' },
                  { id: 'default', label: 'Preset (20)' },
                  { id: 'none', label: 'Add Later' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFirstRoomMode(mode.id)}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: firstRoomMode === mode.id ? '#0f172a' : '#cbd5e1',
                      background: firstRoomMode === mode.id ? '#0f172a' : '#ffffff',
                      color: firstRoomMode === mode.id ? '#ffffff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {firstRoomMode === 'range' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start Room No</span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 101"
                        value={firstStartRoom}
                        onChange={(e) => setFirstStartRoom(e.target.value)}
                        style={{ marginTop: '2px', padding: '6px 10px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>End Room No</span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 120"
                        value={firstEndRoom}
                        onChange={(e) => setFirstEndRoom(e.target.value)}
                        style={{ marginTop: '2px', padding: '6px 10px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Room Category</span>
                      <select
                        className="form-select"
                        value={firstRoomType}
                        onChange={(e) => setFirstRoomType(e.target.value)}
                        style={{ marginTop: '2px', padding: '6px 10px', fontSize: '13px' }}
                      >
                        <option value="Standard Room">Standard Room</option>
                        <option value="Deluxe Suite">Deluxe Suite</option>
                        <option value="Executive Room">Executive Room</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', background: '#f0fdf4', padding: '6px 10px', borderRadius: '4px' }}>
                    Will automatically generate rooms from <strong>{firstStartRoom || '?'}</strong> to <strong>{firstEndRoom || '?'}</strong>.
                  </div>
                </div>
              )}

              {firstRoomMode === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    className="form-input"
                    placeholder="Enter room numbers separated by commas (e.g. 101, 102, 103, 104, 201, 202)"
                    value={firstCustomRoomsText}
                    onChange={(e) => setFirstCustomRoomsText(e.target.value)}
                    rows={2}
                    style={{ fontSize: '12px', padding: '8px 10px' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Category:</span>
                    <select
                      className="form-select"
                      value={firstRoomType}
                      onChange={(e) => setFirstRoomType(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      <option value="Standard Room">Standard Room</option>
                      <option value="Deluxe Suite">Deluxe Suite</option>
                      <option value="Executive Room">Executive Room</option>
                    </select>
                  </div>
                </div>
              )}

              {firstRoomMode === 'default' && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Generates default 20 rooms: 101-105, 201-205, 301-305, 401-405 (Standard).
                </div>
              )}

              {firstRoomMode === 'none' && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  No rooms will be created now. You can add rooms anytime from Settings &gt; Rooms Inventory.
                </div>
              )}
            </div>

            {loading && loadingMessage && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ width: '12px', height: '12px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                <span>{loadingMessage}</span>
              </div>
            )}

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? (loadingMessage || 'Creating Property...') : <><Plus size={16} /> Create Property & Launch Dashboard</>}
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
              <label className="form-label">Contact / Mobile Number <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  type="tel"
                  className="form-input icon-padded"
                  placeholder="e.g. +91 98765 43210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Master Admin Username or Email <span style={{ color: '#e11d48' }}>*</span></label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. admin or myname@hotel.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Can be any username (e.g. admin, superadmin) or an email address.
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
              <label className="form-label">Username or Email</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Enter your username or email"
                  value={loginIdentity}
                  onChange={(e) => setLoginIdentity(e.target.value)}
                  required
                  autoFocus
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

            {loading && loadingMessage && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ width: '12px', height: '12px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                <span>{loadingMessage}</span>
              </div>
            )}

            <button type="submit" className="btn-main" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}>
              {loading ? (loadingMessage || 'Signing In...') : <><ArrowRight size={16} /> Sign In to Portal</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
