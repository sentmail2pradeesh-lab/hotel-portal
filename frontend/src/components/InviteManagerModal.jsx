import React, { useState, useEffect } from 'react';
import { Mail, Building2, Send, X, Copy, Check, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';

export const InviteManagerModal = ({ isOpen, onClose }) => {
  const { propertiesList } = useHotel();
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertiesList[0]?.firmId || '');
  const [managerEmail, setManagerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdInviteUrl, setCreatedInviteUrl] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [invitationsList, setInvitationsList] = useState([]);

  useEffect(() => {
    if (propertiesList.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(propertiesList[0].firmId);
    }
  }, [propertiesList, selectedPropertyId]);

  const loadInvitations = async () => {
    try {
      const list = await api.getInvitations();
      setInvitationsList(list);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      setError('Please select a property.');
      return;
    }
    if (!managerEmail.trim()) {
      setError('Please enter the manager email address.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setCreatedInviteUrl('');
    setLoading(true);

    try {
      const res = await api.sendManagerInvitation(selectedPropertyId, managerEmail.trim());
      setSuccessMsg(`Invitation sent successfully to ${managerEmail.trim()}!`);
      setCreatedInviteUrl(res.inviteUrl || '');
      setManagerEmail('');
      loadInvitations();
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(''), 3000);
  };

  const handleOpenMailClient = (email, propName, url) => {
    const subject = encodeURIComponent(`Invitation to manage ${propName}`);
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited by Admin (mail2pradeesh1621@gmail.com) to register as Property Manager for '${propName}'.\n\nPlease click the secure activation link below to set your password and activate your manager account:\n${url}\n\nBest regards,\nHotel Operations Team`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        
        {/* Header */}
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={20} color="#047857" />
            </div>
            <div>
              <h3 className="modal-heading" style={{ fontSize: '18px' }}>Invite Property Manager</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Email sent from Admin (mail2pradeesh1621@gmail.com)
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ margin: '14px 0' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 600,
            margin: '14px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#047857" />
              <span>{successMsg}</span>
            </div>
            {createdInviteUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                <div className="mono" style={{ fontSize: '11px', wordBreak: 'break-all', color: '#334155' }}>
                  {createdInviteUrl}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-main"
                    style={{ padding: '6px 12px', fontSize: '12px', flex: 1, background: '#047857', borderColor: '#047857' }}
                    onClick={() => {
                      const targetProp = propertiesList.find(p => p.firmId === selectedPropertyId);
                      handleOpenMailClient(createdInviteUrl.split('email=')[1] || 'manager@hotel.com', targetProp?.firmName || 'Property', createdInviteUrl);
                    }}
                  >
                    <Mail size={13} /> Open Email App to Send
                  </button>
                  <button
                    type="button"
                    className="btn-sub"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleCopyLink(createdInviteUrl, 'new')}
                  >
                    {copiedToken === 'new' ? <><Check size={13} color="#047857" /> Copied!</> : <><Copy size={13} /> Copy Activation Link</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite Form */}
        <form onSubmit={handleSendInvite} style={{ margin: '16px 0' }}>
          <div className="form-group">
            <label className="form-label">Select Target Property</label>
            <div className="input-icon-wrapper">
              <Building2 size={16} className="input-icon" />
              <select
                className="form-input icon-padded"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                required
              >
                {propertiesList.map((p) => (
                  <option key={p.firmId} value={p.firmId}>
                    {p.firmName} (ID: {p.firmId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Manager Email Address</label>
            <div className="input-icon-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                className="form-input icon-padded"
                placeholder="Enter manager email address"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-main"
            disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '6px' }}
          >
            {loading ? 'Sending Invitation...' : <><Send size={15} /> Send Email Invitation</>}
          </button>
        </form>

        {/* Sent Invitations Audit History */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} color="#d97706" /> Sent Invitations Log ({invitationsList.length})
          </div>

          {invitationsList.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
              No manager invitations sent yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {invitationsList.map((inv) => {
                const isAccepted = inv.status === 'accepted';
                return (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: isAccepted ? '#ecfdf5' : '#f8fafc',
                      border: `1px solid ${isAccepted ? '#a7f3d0' : '#e2e8f0'}`,
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {inv.email}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Property: <strong>{inv.propertyName}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-pill ${isAccepted ? 'in-house' : 'upcoming'}`}>
                        {isAccepted ? 'Accepted & Active' : 'Pending Activation'}
                      </span>

                      {!isAccepted && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ padding: '4px', color: '#0284c7' }}
                          onClick={() => handleCopyLink(inv.inviteUrl, inv.id)}
                          title="Copy Invitation Link"
                        >
                          {copiedToken === inv.id ? <Check size={14} color="#047857" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
