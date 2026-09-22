import React, { useState, useEffect, useCallback } from 'react';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';
import { 
  UserPlus, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  Building2, 
  Mail, 
  Lock, 
  User, 
  RefreshCw, 
  ShieldAlert,
  Users,
  Shield,
  Eye,
  Briefcase
} from 'lucide-react';

export const CreateManagerModal = ({ isOpen, onClose }) => {
  const { propertiesList, createManager, currentUser, isSuperAdmin, impersonateUser } = useHotel();

  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'list'
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Manager'); // 'Manager' | 'Admin'
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);

  // Managers List
  const [managersList, setManagersList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const generateRandomPassword = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = role === 'Admin' ? 'Adm@' : 'Mgr@';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
  }, [role]);

  const fetchManagers = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.getManagers();
      setManagersList(data || []);
    } catch {
      // Fallback
    } finally {
      setLoadingList(false);
    }
  }, []);

  const effectivePropertyId = selectedPropertyId || (propertiesList[0] ? propertiesList[0].firmId : '');

  useEffect(() => {
    if (isOpen) {
      generateRandomPassword();
      fetchManagers();
    }
  }, [isOpen, generateRandomPassword, fetchManagers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessData(null);

    if (!effectivePropertyId) {
      setError('Please select a property to assign.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter the full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!tempPassword.trim() || tempPassword.trim().length < 6) {
      setError('Temporary password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const effectiveRole = isSuperAdmin ? role : 'Manager';
      const res = await createManager(name.trim(), email.trim(), effectivePropertyId, tempPassword.trim(), effectiveRole);
      if (res.success) {
        setSuccessData({
          ...res.manager,
          role: effectiveRole
        });
        setName('');
        setEmail('');
        generateRandomPassword();
        fetchManagers();
      } else {
        setError(res.message || 'Failed to create account.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = (data = successData) => {
    if (!data) return;
    const loginUrl = window.location.origin;
    const text = 
`🏨 *HOTEL PROPERTY PORTAL CREDENTIALS*
Assigned Role: ${data.role || 'Manager'}
Property: ${data.propertyName || 'Hotel'}
Full Name: ${data.name}
Login Email: ${data.email}
Initial / Temp Password: ${data.tempPassword}

Login Portal: ${loginUrl}
(Note: If you change your password later, both this password and your new password will remain valid for login)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleViewDashboard = async (userId) => {
    setImpersonatingId(userId);
    const res = await impersonateUser(userId);
    setImpersonatingId(null);
    if (res.success) {
      onClose();
    } else {
      setError(res.message || 'Failed to switch to user dashboard.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        
        {/* Header */}
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserPlus size={22} color="#047857" />
            </div>
            <div>
              <h3 className="modal-heading" style={{ fontSize: '18px' }}>
                {isSuperAdmin ? 'Create Admin or Manager' : 'Create Property Manager'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {isSuperAdmin 
                  ? 'Provision Admin or Manager login credentials and assign to properties' 
                  : 'Provision manager credentials for front-desk operations'}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', margin: '14px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <button
            type="button"
            className={activeTab === 'create' ? 'btn-main' : 'btn-sub'}
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={() => setActiveTab('create')}
          >
            <UserPlus size={14} /> New Account
          </button>
          <button
            type="button"
            className={activeTab === 'list' ? 'btn-main' : 'btn-sub'}
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={() => {
              setActiveTab('list');
              fetchManagers();
            }}
          >
            <Users size={14} /> Existing Accounts ({managersList.length})
          </button>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} color="#e11d48" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'create' ? (
          <div>
            {/* SUCCESS VIEW */}
            {successData ? (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={24} color="#047857" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#047857', fontWeight: 700 }}>
                      {successData.role || 'User'} Account Created!
                    </h4>
                    <span style={{ fontSize: '12px', color: '#065f46' }}>
                      Credentials are active immediately. Share them with the user.
                    </span>
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Role:</span>
                    <strong style={{
                      color: successData.role === 'Admin' ? '#4f46e5' : '#047857',
                      background: successData.role === 'Admin' ? '#eef2ff' : '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {successData.role || 'Manager'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Property:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{successData.propertyName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{successData.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Login Email:</span>
                    <strong style={{ color: '#0284c7' }}>{successData.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Initial / Temp Password:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                      {successData.tempPassword}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Dual-Password Policy:</span>
                    <span style={{ color: '#047857', fontSize: '11px', fontWeight: 600 }}>
                      Both initial and future new passwords remain valid
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Login URL:</span>
                    <span style={{ color: 'var(--text-main)', fontSize: '12px' }}>{window.location.origin}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-main"
                    style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#047857', borderColor: '#047857' }}
                    onClick={() => handleCopyCredentials(successData)}
                  >
                    {copied ? <><Check size={16} /> Credentials Copied!</> : <><Copy size={16} /> Copy Login Credentials</>}
                  </button>
                  <button
                    type="button"
                    className="btn-sub"
                    style={{ padding: '10px 16px', fontSize: '13px' }}
                    onClick={() => setSuccessData(null)}
                  >
                    Create Another
                  </button>
                </div>
              </div>
            ) : (
              /* CREATION FORM */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                
                {/* Role Selector (Super Admin only can choose Admin vs Manager) */}
                {isSuperAdmin && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Account Role <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${role === 'Manager' ? '#047857' : '#e2e8f0'}`,
                        background: role === 'Manager' ? '#ecfdf5' : '#ffffff',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="userRole"
                          value="Manager"
                          checked={role === 'Manager'}
                          onChange={() => setRole('Manager')}
                          style={{ accentColor: '#047857' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: role === 'Manager' ? '#047857' : 'var(--text-main)' }}>
                            Manager
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Front-desk & bookings operations
                          </div>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${role === 'Admin' ? '#4f46e5' : '#e2e8f0'}`,
                        background: role === 'Admin' ? '#eef2ff' : '#ffffff',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="userRole"
                          value="Admin"
                          checked={role === 'Admin'}
                          onChange={() => setRole('Admin')}
                          style={{ accentColor: '#4f46e5' }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: role === 'Admin' ? '#4f46e5' : 'var(--text-main)' }}>
                            Admin
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            All properties oversight & staff
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Property Dropdown */}
                <div className="form-group">
                  <label className="form-label">
                    Assign Primary Property <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Building2 size={16} className="input-icon" />
                    <select
                      className="form-input icon-padded"
                      value={effectivePropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      required
                    >
                      {propertiesList.map((p) => (
                        <option key={p.firmId} value={p.firmId}>
                          {p.firmName} ({p.firmId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {role === 'Admin' 
                      ? 'Admins can manage all properties, starting with this primary property.' 
                      : 'The manager will operate this hotel dashboard upon signing in.'}
                  </span>
                </div>

                {/* Name */}
                <div className="form-group">
                  <label className="form-label">
                    Full Name <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input icon-padded"
                      placeholder={role === 'Admin' ? 'e.g. Operational Admin' : 'e.g. John Doe'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label">
                    Email ID (Login Username) <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      className="form-input icon-padded"
                      placeholder={role === 'Admin' ? 'e.g. admin@hotel.com' : 'e.g. manager@hotel.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Temporary Password */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">
                      Initial Temporary Password <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#047857',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600
                      }}
                    >
                      <RefreshCw size={12} /> Regenerate
                    </button>
                  </div>
                  <div className="input-icon-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input icon-padded mono"
                      placeholder="e.g. Mgr@1234"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Even if the user updates this password in Settings, this initial password remains valid for login.
                  </span>
                </div>

                {/* Submit button */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn-main"
                    disabled={loading || propertiesList.length === 0}
                    style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                  >
                    {loading ? 'Creating Account...' : <><UserPlus size={16} /> Create {role} Account</>}
                  </button>
                  <button
                    type="button"
                    className="btn-sub"
                    onClick={onClose}
                    style={{ padding: '12px 18px', fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* MANAGERS & ADMINS LIST TAB */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading accounts...
              </div>
            ) : managersList.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No property staff registered yet. Use the "New Account" tab to create one.
              </div>
            ) : (
              managersList.map((m) => {
                const isAdminUser = m.role === 'Admin';
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isAdminUser ? '#4f46e5' : '#047857',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700
                      }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{m.name}</span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isAdminUser ? '#eef2ff' : '#ecfdf5',
                            color: isAdminUser ? '#4f46e5' : '#047857',
                            border: `1px solid ${isAdminUser ? '#c7d2fe' : '#a7f3d0'}`
                          }}>
                            {m.role ? m.role.toUpperCase() : 'MANAGER'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Property: <strong>{m.propertyName || 'All Properties'}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                      {/* Super Admin Credential & Impersonate Controls */}
                      {m.tempPassword && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                          <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 600 }}>Pwd:</span>
                          <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: '#b45309' }}>
                            {m.tempPassword}
                          </span>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ padding: '2px', color: '#b45309' }}
                            title="Copy Password"
                            onClick={() => handleCopyCredentials(m)}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      )}

                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="btn-sub"
                          disabled={impersonatingId === m.id}
                          style={{
                            padding: '5px 10px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#0284c7',
                            color: '#ffffff',
                            borderColor: '#0284c7'
                          }}
                          onClick={() => handleViewDashboard(m.id)}
                          title={`Log in and view dashboard as ${m.name}`}
                        >
                          <Eye size={12} /> {impersonatingId === m.id ? 'Switching...' : 'View Dashboard'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
};
