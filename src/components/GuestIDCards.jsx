import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatDate } from '../utils/formatters';
import { IDCardViewerModal } from './IDCardViewerModal';
import { Search, IdCard, Eye, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export const GuestIDCards = () => {
  const { bookings, updateBooking, isRegisterOpen } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingForView, setSelectedBookingForView] = useState(null);

  const filteredBookings = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.guestName.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term) ||
      b.room.toLowerCase().includes(term) ||
      (b.phone && b.phone.includes(term))
    );
  });

  const totalUploadedIDs = bookings.filter((b) => Boolean(b.idCard)).length;

  const handleFileUploadForBooking = (bookingId, e) => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to upload guest ID cards.');
      return;
    }
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBooking(bookingId, {
          idCard: reader.result,
          idCardName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="guest-ids-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Guest Identity Documents</h1>
          <p className="page-subheading">
            Government identity verification cards (Photos & PDFs) mapped to active guest stay profiles.
          </p>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="search-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search documents by guest, stay ID, or suite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '20px' }}>
          <span>
            Verified Documents: <strong style={{ color: '#047857' }}>{totalUploadedIDs}</strong>
          </span>
          <span>
            Total Registered Stays: <strong>{bookings.length}</strong>
          </span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card-container" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <IdCard size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Identity Documents Uploaded</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            When stay records are added, guest ID photo scans and PDF documents appear here automatically.
          </p>
        </div>
      ) : (
        <div className="id-gallery">
          {filteredBookings.map((booking) => {
            const isPdf = (booking.idCardName && booking.idCardName.toLowerCase().endsWith('.pdf')) || 
                          (booking.idCard && booking.idCard.startsWith('data:application/pdf'));

            return (
              <div key={booking.id} className="id-card-box">
                <div className="id-card-img-wrapper">
                  {booking.idCard ? (
                    isPdf ? (
                      <div style={{ textAlign: 'center', color: '#be123c', padding: '24px', background: '#fff1f2', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={42} color="#dc2626" style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>PDF Document</div>
                        <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px', wordBreak: 'break-all', padding: '0 8px' }}>
                          {booking.idCardName || 'identity_scan.pdf'}
                        </div>
                      </div>
                    ) : (
                      <img src={booking.idCard} alt={`ID Document for ${booking.guestName}`} />
                    )
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                      <AlertCircle size={36} color="#be123c" style={{ marginBottom: '8px', opacity: 0.7 }} />
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Document Pending</div>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>Attach photo or PDF scan below</div>
                    </div>
                  )}

                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    {booking.idCard ? (
                      <span className="id-status-badge has-id">
                        <CheckCircle2 size={12} /> {isPdf ? 'PDF Verified' : 'Photo Verified'}
                      </span>
                    ) : (
                      <span className="id-status-badge no-id">
                        Missing Scan
                      </span>
                    )}
                  </div>
                </div>

                <div className="id-card-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tag-badge">{booking.id}</span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: '#0284c7' }}>Suite {booking.room}</span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: '2px 0' }}>
                      {booking.guestName}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      Contact: {booking.phone || '—'}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Check-in: {formatDate(booking.checkIn)}
                  </div>

                  <div style={{ marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                    {booking.idCard && (
                      <button
                        className="btn-sub"
                        style={{ flex: 1, padding: '7px', fontSize: '12px', justifyContent: 'center' }}
                        onClick={() => setSelectedBookingForView(booking)}
                      >
                        <Eye size={14} color="#d97706" /> Inspect Document
                      </button>
                    )}

                    <input
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      id={`id-upload-gallery-${booking.id}`}
                      disabled={!isRegisterOpen}
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUploadForBooking(booking.id, e)}
                    />
                    <label
                      htmlFor={`id-upload-gallery-${booking.id}`}
                      className="btn-sub"
                      style={{
                        flex: 1,
                        padding: '7px',
                        fontSize: '12px',
                        justify: 'center',
                        margin: 0,
                        cursor: isRegisterOpen ? 'pointer' : 'not-allowed',
                        opacity: isRegisterOpen ? 1 : 0.55
                      }}
                      title={isRegisterOpen ? "Upload or replace ID card" : "Shift Register is Closed (View-Only Mode)"}
                    >
                      <Upload size={14} color="#047857" /> {booking.idCard ? 'Replace' : 'Upload ID'}
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedBookingForView && (
        <IDCardViewerModal
          booking={selectedBookingForView}
          onClose={() => setSelectedBookingForView(null)}
        />
      )}
    </div>
  );
};

