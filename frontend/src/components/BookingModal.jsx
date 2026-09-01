import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { generateSystemBookingId, getAutoStayStatus } from '../utils/formatters';
import { Upload, X, CheckCircle2, FileText, Sparkles, Hash, FileCheck } from 'lucide-react';

export const BookingModal = ({ isOpen, onClose, initialData = null }) => {
  const { bookings, roomsList, addBooking, updateBooking, isRegisterOpen } = useHotel();

  // Find currently occupied rooms (excluding current booking being edited and completed stays)
  const occupiedRooms = bookings
    .filter((b) => (!initialData || b.id !== initialData.id) && b.status !== 'Completed')
    .map((b) => b.room);

  const availableRooms = roomsList.filter(r => !occupiedRooms.includes(r));

  const isHiddenAllocation = Boolean(initialData?.isHidden);
  const [id, setId] = useState(initialData?.id || generateSystemBookingId(bookings));
  const [manualId, setManualId] = useState(initialData?.manualId || '');
  const [guestName, setGuestName] = useState(
    initialData?.guestName && initialData.guestName.startsWith('[HIDDEN BOOKING]') ? '' : (initialData?.guestName || '')
  );
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [room, setRoom] = useState(initialData?.room || availableRooms[0] || roomsList[0] || '');
  const [checkIn, setCheckIn] = useState(initialData?.checkIn || new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(initialData?.checkOut || '');
  const [amountPaid, setAmountPaid] = useState(initialData?.amountPaid || 0);
  const [paidVia, setPaidVia] = useState(initialData?.paidVia || 'Cash');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  // ID Card document upload state (Photo or PDF)
  const [idCardDataUrl, setIdCardDataUrl] = useState(initialData?.idCard || null);
  const [idCardFileName, setIdCardFileName] = useState(initialData?.idCardName || '');

  // Compute status automatically based on dates
  const computedStatus = getAutoStayStatus(checkIn, checkOut, initialData?.status);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdCardFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const isPdfDocument = idCardFileName.toLowerCase().endsWith('.pdf') || (idCardDataUrl && idCardDataUrl.startsWith('data:application/pdf'));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!manualId.trim()) {
      alert('Please enter mandatory Manual Booking ID.');
      return;
    }
    if (!guestName.trim()) {
      alert('Please enter guest full name.');
      return;
    }
    if (!phone.trim()) {
      alert('Phone number is mandatory for booking.');
      return;
    }
    if (!email.trim()) {
      alert('Guest Mail ID is mandatory for booking.');
      return;
    }
    if (!room) {
      alert('Please select an available room.');
      return;
    }

    const bookingPayload = {
      id: id.trim(),
      manualId: manualId.trim(),
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      room: room.trim(),
      checkIn,
      checkOut,
      amountPaid: parseFloat(amountPaid) || 0,
      paidVia,
      status: computedStatus,
      notes: notes.trim(),
      idCard: idCardDataUrl,
      idCardName: idCardFileName,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    if (initialData) {
      updateBooking(initialData.id, bookingPayload);
    } else {
      addBooking(bookingPayload);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="#d97706" />
            <h2 className="modal-heading">{initialData ? 'Edit Stay Record' : 'Register New Stay'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {isHiddenAllocation && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '10px 14px', borderRadius: '8px', margin: '12px 0', fontSize: '12px' }}>
            <strong>🔒 Allocating Released Hidden Slot:</strong> Room <strong>Room {room}</strong> & Hidden ID <strong>{manualId || id}</strong> are fixed for this early-released stay. Please enter the new guest name, phone, email, and ID document below.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">System Booking ID (Auto-Generated)</label>
              <input
                type="text"
                className="form-input mono"
                value={id}
                readOnly
                style={{ background: '#f8fafc', color: '#0369a1', fontWeight: 700, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Manual Booking / Reference ID <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input mono"
                placeholder="e.g. OYO-10234 or Ref #9921"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                readOnly={isHiddenAllocation}
                style={isHiddenAllocation ? { background: '#f8fafc', color: '#b45309', fontWeight: 700, cursor: 'not-allowed' } : {}}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Guest Full Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter new guest full name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="text"
                className="form-input mono"
                placeholder="Guest phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Guest Mail ID <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="email"
                className="form-input"
                placeholder="guest@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Select Available Room Suite <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="form-select mono"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                disabled={isHiddenAllocation}
                style={isHiddenAllocation ? { background: '#f8fafc', cursor: 'not-allowed', fontWeight: 700 } : {}}
                required
              >
                {roomsList.map((r) => {
                  const isOccupied = occupiedRooms.includes(r);
                  return (
                    <option key={r} value={r} disabled={isOccupied}>
                      Room {r} {isOccupied ? '(Currently Occupied)' : '(Available)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Check-in Date (DD/MM/YYYY) <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                className="form-input"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Check-out Date (DD/MM/YYYY) <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                className="form-input"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount Paid (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input mono"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Channel</label>
              <select
                className="form-select"
                value={paidVia}
                onChange={(e) => setPaidVia(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Pending">Pending / Unpaid</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Internal Stay Notes</label>
            <input
              type="text"
              className="form-input"
              placeholder="Special requests, arrival notes, VIP status..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Guest ID Card Photo/PDF Document Upload Section */}
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Guest Identity Document (Photo / PDF Scan)</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                onChange={handleFileUpload}
                id="idCardUploadInput"
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="idCardUploadInput" 
                className="btn-sub" 
                style={{ cursor: 'pointer', margin: 0, padding: '8px 14px', fontSize: '13px' }}
              >
                <Upload size={14} color="#d97706" /> Upload Photo or PDF ID
              </label>

              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {idCardFileName || 'No document selected'}
              </span>
            </div>

            {/* Document preview thumbnail if uploaded */}
            {idCardDataUrl && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                background: '#ecfdf5',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #a7f3d0',
                marginTop: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isPdfDocument ? (
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={22} />
                    </div>
                  ) : (
                    <img 
                      src={idCardDataUrl} 
                      alt="ID Preview" 
                      style={{ width: '56px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }} 
                    />
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> {isPdfDocument ? 'PDF Document' : 'Photo Document'} Attached & Mapped ({id})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{idCardFileName}</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="icon-btn"
                  onClick={() => { setIdCardDataUrl(null); setIdCardFileName(''); }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-sub" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-main" 
              disabled={!isRegisterOpen}
              title={isRegisterOpen ? 'Save Stay Record' : 'Shift Register is Closed (View-Only Mode)'}
            >
              Save Stay Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
