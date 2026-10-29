import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatDate } from '../utils/formatters';
import { computeMonthBreakdown } from '../utils/paymentBreakdown';
import { PaymentBreakdownBar } from './PaymentBreakdownBar';
import { IDCardViewerModal } from './IDCardViewerModal';
import { Search, IdCard, Eye, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { PageHeaderActions } from './PageHeaderActions';
import { PropertyTabs } from './PropertyTabs';
import { StoredDocumentImage } from './StoredDocumentImage';
import { storeIdScan } from '../utils/storedDocuments';

export const GuestIDCards = () => {
  const { bookings: allBookings, updateBooking, isRegisterOpen } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingForView, setSelectedBookingForView] = useState(null);

  // Documents of unconfirmed drafts stay in the Drafts section until the booking is confirmed
  const bookings = allBookings.filter((b) => b.status !== 'Draft');

  const filteredBookings = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.guestName.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term) ||
      b.room.toLowerCase().includes(term) ||
      (b.phone && b.phone.includes(term))
    );
  });

  // Each saved document is shown as its own card; a booking with no document list falls back to its single ID scan
  const documentsOf = (booking) => {
    const docs = (booking.documents || []).filter((d) => d && (d.docId || d.dataUrl));
    if (docs.length > 0) return docs;
    return booking.idCard
      ? [{ dataUrl: booking.idCard, fileName: booking.idCardName, type: booking.idCardType, number: booking.idCardNumber }]
      : [];
  };

  const totalUploadedIDs = bookings.reduce((count, b) => count + documentsOf(b).length, 0);

  // The new scan goes to Dropbox and replaces the booking's first document; any other documents are kept
  const handleFileUploadForBooking = async (bookingId, e) => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to upload guest ID cards.');
      return;
    }
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const booking = allBookings.find((b) => b.id === bookingId);
    try {
      const scan = await storeIdScan(file, bookingId, { type: booking?.idCardType, number: booking?.idCardNumber, guestName: booking?.guestName });
      const otherDocs = documentsOf(booking).slice(1);
      await updateBooking(bookingId, {
        documents: [scan, ...otherDocs],
        idCard: '',
        idCardName: file.name
      });
    } catch (err) {
      alert(`The ID scan could not be stored in Dropbox: ${err.message}`);
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
        <PageHeaderActions />
      </div>

      <PropertyTabs />

      {/* Executive Metric Cards */}
      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '18px' }}>
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Verified Documents</span>
            <div className="metric-icon-badge emerald">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value" style={{ color: '#047857' }}>{totalUploadedIDs}</span>
            <span className="metric-tag-sub">Files</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot emerald" />
            <span>Government IDs & photo scans on file</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Pending Uploads</span>
            <div className="metric-icon-badge amber">
              <AlertCircle size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value" style={{ color: bookings.length - totalUploadedIDs > 0 ? '#b45309' : 'inherit' }}>
              {Math.max(0, bookings.length - totalUploadedIDs)}
            </span>
            <span className="metric-tag-sub">Missing</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot amber" />
            <span>Stays requiring document upload</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Total Registered Stays</span>
            <div className="metric-icon-badge blue">
              <IdCard size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{bookings.length}</span>
            <span className="metric-tag-sub">Profiles</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot blue" />
            <span>All guest profiles tracked in registry</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <PaymentBreakdownBar items={computeMonthBreakdown(allBookings)} />
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
          {filteredBookings.flatMap((booking) => {
            const docs = documentsOf(booking);
            if (docs.length === 0) {
              return [{ booking, doc: null, index: 0, total: 0 }];
            }
            return docs.map((doc, index) => ({ booking, doc, index, total: docs.length }));
          }).map(({ booking, doc, index, total }) => {
            const isPdf = doc && (
              (doc.fileName && doc.fileName.toLowerCase().endsWith('.pdf')) ||
              (doc.dataUrl && doc.dataUrl.startsWith('data:application/pdf'))
            );

            return (
              <div key={`${booking.id}-${index}`} className="id-card-box">
                <div className="id-card-img-wrapper">
                  {doc ? (
                    isPdf ? (
                      <div style={{ textAlign: 'center', color: '#be123c', padding: '24px', background: '#fff1f2', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={42} color="#dc2626" style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>PDF Document</div>
                        <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px', wordBreak: 'break-all', padding: '0 8px' }}>
                          {doc.fileName || 'identity_scan.pdf'}
                        </div>
                      </div>
                    ) : (
                      <StoredDocumentImage doc={doc} alt={`ID Document for ${booking.guestName}`} />
                    )
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                      <AlertCircle size={36} color="#be123c" style={{ marginBottom: '8px', opacity: 0.7 }} />
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Document Pending</div>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>Attach photo or PDF scan below</div>
                    </div>
                  )}

                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                    {doc ? (
                      <>
                        {total > 1 && (
                          <span className="id-status-badge has-id">Doc {index + 1} of {total}</span>
                        )}
                        <span className="id-status-badge has-id">
                          <CheckCircle2 size={12} /> {isPdf ? 'PDF Verified' : 'Photo Verified'}
                        </span>
                      </>
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
                    {doc && (
                      <button
                        className="btn-sub"
                        style={{ flex: 1, padding: '7px', fontSize: '12px', justifyContent: 'center' }}
                        onClick={() => setSelectedBookingForView({
                          ...booking,
                          idCard: doc.dataUrl || null,
                          idCardDocId: doc.docId || null,
                          idCardName: doc.fileName,
                          idCardType: doc.type,
                          idCardNumber: doc.number
                        })}
                      >
                        <Eye size={14} color="#d97706" /> Inspect Document
                      </button>
                    )}

                    {index === 0 && (
                      <>
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
                          <Upload size={14} color="#047857" /> {doc ? 'Replace' : 'Upload ID'}
                        </label>
                      </>
                    )}
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

