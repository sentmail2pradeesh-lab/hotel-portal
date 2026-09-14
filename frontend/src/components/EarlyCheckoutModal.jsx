import React, { useState } from 'react';
import { LogOut, Calendar, Sparkles, X, ShieldAlert } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const EarlyCheckoutModal = ({ isOpen = true, onClose, booking, onConfirm }) => {
  const [createHiddenSlot, setCreateHiddenSlot] = useState(true);

  if (!booking || isOpen === false) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const handleConfirm = () => {
    onConfirm(booking.id, createHiddenSlot);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogOut size={22} color="#dc2626" />
            <h2 className="modal-heading">Early Check-Out Release</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '8px 0' }}>
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <ShieldAlert size={20} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#9f1239', lineHeight: 1.5 }}>
              <strong>{booking.guestName}</strong> is checking out early from <strong>Room {booking.room}</strong>.
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                Scheduled Check-out: <strong>{formatDate(booking.checkOut)}</strong> &bull; Early Check-out Date: <strong>{formatDate(todayStr)}</strong>
              </div>
            </div>
          </div>

          {/* Hidden Booking Re-allocation Option */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={createHiddenSlot}
                onChange={(e) => setCreateHiddenSlot(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#0f172a', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#d97706" /> Release remaining dates as a Hidden Booking
                </span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                  This creates an available <strong>Hidden Booking slot</strong> for Room {booking.room} from {formatDate(todayStr)} to {formatDate(booking.checkOut)} so Admin can re-allocate the room to another guest.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '8px' }}>
          <button type="button" className="btn-sub" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-main" style={{ background: '#be123c' }} onClick={handleConfirm}>
            <LogOut size={15} /> Confirm Early Check-Out
          </button>
        </div>
      </div>
    </div>
  );
};
