import React from 'react';
import { X, Download, IdCard, CheckCircle2, ShieldCheck } from 'lucide-react';

export const IDCardViewerModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const isPdf = (booking.idCardName && booking.idCardName.toLowerCase().endsWith('.pdf')) || 
                (booking.idCard && booking.idCard.startsWith('data:application/pdf'));

  const handleDownload = () => {
    if (!booking.idCard) return;
    const link = document.createElement('a');
    link.href = booking.idCard;
    link.download = booking.idCardName || `${booking.id}_guest_document${isPdf ? '.pdf' : '.png'}`;
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#047857" />
            <h2 className="modal-heading">Identity Verification Document</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ 
            background: '#f8fafc', 
            padding: '18px 22px', 
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px',
            fontSize: '13px'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, display: 'block', letterSpacing: '0.05em' }}>MAPPED GUEST NAME</span>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>{booking.guestName}</strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, display: 'block', letterSpacing: '0.05em' }}>STAY ID</span>
              <span className="tag-badge">{booking.id}</span>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, display: 'block', letterSpacing: '0.05em' }}>ROOM SUITE</span>
              <span className="mono" style={{ fontWeight: 700, color: '#0284c7' }}>Suite {booking.room}</span>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, display: 'block', letterSpacing: '0.05em' }}>DOCUMENT FILE & TYPE</span>
              <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                {booking.idCardType ? `${booking.idCardType} • ` : ''}{booking.idCardName || (isPdf ? 'PDF Scan' : 'Photo Scan')}
              </span>
              {booking.idCardNumber && (
                <div style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                  ID Ref: {booking.idCardNumber}
                </div>
              )}
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontSize: '13px', fontWeight: 700, paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
              <CheckCircle2 size={16} /> Verified Document ({isPdf ? 'PDF Document' : 'Photo Image'}) mapped to {booking.guestName} ({booking.id})
            </div>
          </div>

          <div style={{
            background: '#f1f5f9',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '340px',
            overflow: 'hidden'
          }}>
            {booking.idCard ? (
              isPdf ? (
                <iframe
                  src={booking.idCard}
                  title={`PDF Document for ${booking.guestName}`}
                  style={{
                    width: '100%',
                    height: '420px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1'
                  }}
                />
              ) : (
                <img
                  src={booking.idCard}
                  alt={`ID Card for ${booking.guestName}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '10px',
                    objectFit: 'contain',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              )
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                <IdCard size={48} style={{ opacity: 0.4, marginBottom: '10px' }} />
                <div>No document uploaded yet for this stay.</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-sub" onClick={onClose}>Close</button>
          {booking.idCard && (
            <button className="btn-main" onClick={handleDownload}>
              <Download size={15} /> Download Document {isPdf ? '(PDF)' : '(Image)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

