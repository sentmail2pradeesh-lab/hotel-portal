import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { generateId } from '../utils/formatters';
import { Upload, X, CheckCircle2, FileText, Sparkles } from 'lucide-react';

export const BookingModal = ({ isOpen, onClose, initialData = null }) => {
  const { bookings, roomsList, addBooking, updateBooking } = useHotel();

  // Find currently occupied rooms (excluding current booking being edited)
  const occupiedRooms = bookings
    .filter((b) => !initialData || b.id !== initialData.id)
    .map((b) => b.room);

  const availableRooms = roomsList.filter(r => !occupiedRooms.includes(r));

  const [id, setId] = useState(initialData?.id || generateId('OYO'));
  const [guestName, setGuestName] = useState(initialData?.guestName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [room, setRoom] = useState(initialData?.room || availableRooms[0] || roomsList[0] || '');
  const [checkIn, setCheckIn] = useState(initialData?.checkIn || new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(initialData?.checkOut || '');
  const [amountPaid, setAmountPaid] = useState(initialData?.amountPaid || 0);
  const [paidVia, setPaidVia] = useState(initialData?.paidVia || 'Cash');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  // ID Card document upload state (Photo or PDF)
  const [idCardDataUrl, setIdCardDataUrl] = useState(initialData?.idCard || null);
  const [idCardFileName, setIdCardFileName] = useState(initialData?.idCardName || '');

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
    if (!guestName.trim()) {
      alert('Please enter guest name.');
      return;
    }
    if (!room) {
      alert('Please select an available room.');
      return;
    }

    const bookingPayload = {
      id: id.trim() || generateId('OYO'),
      guestName: guestName.trim(),
      phone: phone.trim(),
      room: room.trim(),
      checkIn,
      checkOut,
      amountPaid: parseFloat(amountPaid) || 0,
      paidVia,
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

        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Booking ID</label>
              <input
                type="text"
                className="form-input mono"
                placeholder="e.g. OYO-10234"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Guest Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Full guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input mono"
                placeholder="Contact number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Select Available Room Suite</label>
              <select
                className="form-select mono"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
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
              <label className="form-label">Check-in Date (DD/MM/YYYY)</label>
              <input
                type="date"
                className="form-input"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Check-out Date (DD/MM/YYYY)</label>
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
            <button type="submit" className="btn-main">
              Save Stay Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
