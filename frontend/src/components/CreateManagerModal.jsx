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
  Users
} from 'lucide-react';

export const CreateManagerModal = ({ isOpen, onClose }) => {
  const { propertiesList, createManager } = useHotel();

  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'list'
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Managers List
  const [managersList, setManagersList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const generateRandomPassword = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Mgr@';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
  }, []);

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
      setError('Please select a property to assign this manager.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter the manager full name.');
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
      const res = await createManager(name.trim(), email.trim(), effectivePropertyId, tempPassword.trim());
      if (res.success) {
        setSuccessData(res.manager);
        setName('');
        setEmail('');
        generateRandomPassword();
        fetchManagers();
      } else {
        setError(res.message || 'Failed to create manager.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successData) return;
    const loginUrl = window.location.origin;
    const text = 
`🏨 *HOTEL PROPERTY MANAGER CREDENTIALS*
Property: ${successData.propertyName}
Manager Name: ${successData.name}
Login Email: ${successData.email}
Temporary Password: ${successData.tempPassword}

Login Portal: ${loginUrl}
(You can change your password anytime after login from Settings)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
              <h3 className="modal-heading" style={{ fontSize: '18px' }}>Create Property Manager</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Set up manager login credentials and assign to a property
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
            <UserPlus size={14} /> New Manager
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
            <Users size={14} /> Existing Managers ({managersList.length})
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
                      Manager Account Created!
                    </h4>
                    <span style={{ fontSize: '12px', color: '#065f46' }}>
                      Credentials are active immediately. Share them with the manager.
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
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Property:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{successData.propertyName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Manager Name:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{successData.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Login Email:</span>
                    <strong style={{ color: '#0284c7' }}>{successData.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Temporary Password:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                      {successData.tempPassword}
                    </strong>
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
                    onClick={handleCopyCredentials}
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
                
                {/* Property Dropdown */}
                <div className="form-group">
                  <label className="form-label">
                    Assign Property <span style={{ color: '#e11d48' }}>*</span>
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
                    The manager will operate this hotel dashboard upon signing in.
                  </span>
                </div>

                {/* Manager Name */}
                <div className="form-group">
                  <label className="form-label">
                    Manager Full Name <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input icon-padded"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Manager Email */}
                <div className="form-group">
                  <label className="form-label">
                    Manager Email ID (Login Username) <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      className="form-input icon-padded"
                      placeholder="e.g. manager@hotel.com"
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
                      Temporary Password <span style={{ color: '#e11d48' }}>*</span>
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
                    The manager can change their password at any time in Settings.
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
                    {loading ? 'Creating Manager...' : <><UserPlus size={16} /> Create Manager Account</>}
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
          /* MANAGERS LIST TAB */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading managers...
              </div>
            ) : managersList.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No property managers registered yet. Use the "New Manager" tab to create one.
              </div>
            ) : (
              managersList.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#047857',
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
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                      {m.propertyName || 'No property assigned'}
                    </div>
                    <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      Active
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};
