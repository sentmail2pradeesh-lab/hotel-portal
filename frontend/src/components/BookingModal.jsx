import React, { useState, useMemo } from 'react';
import { useHotel } from '../context/HotelContext';
import { generateSystemBookingId, getAutoStayStatus, calculateNights, formatCurrency } from '../utils/formatters';
import { 
  Upload, X, CheckCircle2, FileText, Sparkles, User, Phone, 
  Mail, BedDouble, Calendar, CreditCard, Hash, FileCheck, ShieldCheck,
  Users, Minus, Plus, AlertCircle 
} from 'lucide-react';

export const BookingModal = ({ isOpen, onClose, initialData = null }) => {
  const { bookings, roomsList, roomsDetails, addBooking, updateBooking, isRegisterOpen } = useHotel();

  // Exclude staff quarters from sellable guest rooms
  const staffRoomNumbers = useMemo(() => {
    return new Set((roomsDetails || []).filter(r => r.isStaffRoom).map(r => r.roomNumber));
  }, [roomsDetails]);

  const guestSellableRooms = useMemo(() => {
    return (roomsList || []).filter(r => !staffRoomNumbers.has(r));
  }, [roomsList, staffRoomNumbers]);

  // Find currently occupied or reserved rooms (excluding current booking being edited and completed stays)
  const occupiedRooms = useMemo(() => {
    return bookings
      .filter((b) => (!initialData || b.id !== initialData.id) && b.status !== 'Completed' && b.room)
      .map((b) => b.room);
  }, [bookings, initialData]);

  const availableRooms = useMemo(() => {
    return guestSellableRooms.filter(r => !occupiedRooms.includes(r));
  }, [guestSellableRooms, occupiedRooms]);

  // Default dates: check-in today, check-out tomorrow
  const todayIso = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowIso = tomorrowObj.toISOString().split('T')[0];

  const isHiddenAllocation = Boolean(initialData?.isHidden);
  const [id] = useState(initialData?.id || generateSystemBookingId(bookings));
  const [manualId, setManualId] = useState(initialData?.manualId || '');
  const [guestName, setGuestName] = useState(
    initialData?.guestName && initialData.guestName.startsWith('[HIDDEN BOOKING]') ? '' : (initialData?.guestName || '')
  );
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  
  // Guest count breakdown
  const [adults, setAdults] = useState(initialData?.adults || 1);
  const [children, setChildren] = useState(initialData?.children || 0);
  const guestCount = adults + children;

  const [checkIn, setCheckIn] = useState(initialData?.checkIn || todayIso);
  const [checkOut, setCheckOut] = useState(initialData?.checkOut || tomorrowIso);
  const [amountPaid, setAmountPaid] = useState(initialData?.amountPaid ?? 0);
  const [paidVia, setPaidVia] = useState(initialData?.paidVia || 'Cash');
  const [txnId, setTxnId] = useState(initialData?.txnId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  // ID Card document upload state (Photo or PDF)
  const [idCardDataUrl, setIdCardDataUrl] = useState(initialData?.idCard || null);
  const [idCardFileName, setIdCardFileName] = useState(initialData?.idCardName || '');

  // Booking Type & Prepaid Classification
  const [bookingType, setBookingType] = useState(initialData?.bookingType || 'Walk-in');
  const [isPrepaid, setIsPrepaid] = useState(Boolean(initialData?.isPrepaid));

  // Room state: if initialData has a room, use it; else if walk-in or paid, suggest available room
  const [room, setRoom] = useState(
    initialData?.room && !staffRoomNumbers.has(initialData.room) ? initialData.room : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Electronic/Net Payment check (requires Txn ID except Cash and Pending)
  const isNetPayment = paidVia !== 'Cash' && paidVia !== 'Pending';
  
  // Guarantee condition: full payment, online pre-paid, or explicit prepaid
  const isGuaranteed = Boolean(
    isPrepaid || 
    bookingType === 'Online Pre-paid' || 
    (paidVia !== 'Pending' && parseFloat(amountPaid) > 0)
  );

  // Dynamic calculated nights
  const nights = calculateNights(checkIn, checkOut);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!manualId.trim()) {
      alert('Please enter mandatory Manual Booking / Reference ID.');
      return;
    }
    if (!guestName.trim()) {
      alert('Please enter guest full name.');
      return;
    }
    if (!phone.trim()) {
      alert('Phone number is mandatory for reservation.');
      return;
    }
    if (!email.trim()) {
      alert('Guest Email address is mandatory for reservation.');
      return;
    }
    
    let finalRoom = room ? room.trim() : '';

    // Guard against staff room allotment
    if (finalRoom && staffRoomNumbers.has(finalRoom)) {
      alert(`Room ${finalRoom} is a designated staff room and cannot be allotted to guests.`);
      return;
    }

    // For walk-ins: auto-assign first available room if not explicitly picked
    if (bookingType === 'Walk-in' && !finalRoom) {
      if (availableRooms.length > 0) {
        finalRoom = availableRooms[0];
      } else {
        alert('Cannot register walk-in: All rooms are currently occupied or reserved for these stay dates!');
        return;
      }
    }

    // For guaranteed/paid guests: ensure a room is locked for them
    if (isGuaranteed && !finalRoom) {
      if (availableRooms.length > 0) {
        finalRoom = availableRooms[0];
      } else {
        alert('Cannot confirm guaranteed paid booking: All rooms are occupied or reserved for these stay dates!');
        return;
      }
    }

    if (isNetPayment && !txnId.trim()) {
      alert(`Please enter the Transaction ID / Reference Number for ${paidVia} payment.`);
      return;
    }

    // Auto-calculate stay status from stay dates
    const autoStatus = getAutoStayStatus(checkIn, checkOut, initialData?.status);

    const bookingPayload = {
      id: id.trim(),
      manualId: manualId.trim(),
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      room: finalRoom || null,
      adults: parseInt(adults, 10) || 1,
      children: parseInt(children, 10) || 0,
      guestCount: parseInt(adults, 10) + parseInt(children, 10),
      checkIn,
      checkOut,
      amountPaid: parseFloat(amountPaid) || 0,
      paidVia,
      txnId: isNetPayment ? txnId.trim() : null,
      status: initialData?.status || autoStatus,
      bookingType: bookingType || 'Walk-in',
      isPrepaid: Boolean(isPrepaid),
      isGuaranteed: Boolean(isGuaranteed),
      notes: notes.trim(),
      idCard: idCardDataUrl,
      idCardName: idCardFileName,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    setSubmitting(true);
    setErrorMsg('');
    try {
      if (initialData) {
        await updateBooking(initialData.id, bookingPayload);
      } else {
        await addBooking(bookingPayload);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save stay booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card booking-modal-pro" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="booking-modal-header-pro">
          <div className="booking-header-left">
            <div className="booking-header-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="booking-header-title">
                {initialData ? 'Edit Stay Record' : 'Register New Stay'}
              </h2>
              <div className="booking-header-sub">
                Front-Desk PMS • Guest Stay Reservation & Room Check-in
              </div>
            </div>
          </div>
          <div className="booking-header-right">
            <div className="system-id-pill" title="Auto-Generated System Booking ID">
              <Hash size={13} />
              <span>{id}</span>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            margin: '12px 24px 0',
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="booking-modal-body-pro">
            {isHiddenAllocation && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '12px 16px', borderRadius: '10px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Allocating Early-Released Hidden Slot:</strong> Room <strong>Room {room}</strong> and Reference <strong>{manualId || id}</strong> are bound to this schedule. Enter new guest information below.
                </span>
              </div>
            )}

            {/* Section 1: Guest Information */}
            <div className="booking-form-section">
              <div className="booking-form-section-header">
                <div className="booking-section-title">
                  <User size={16} color="#d97706" />
                  <span>1. Guest Identification & Contact</span>
                </div>
                <span className="booking-section-badge">Required Info</span>
              </div>

              <div className="form-grid-2-pro">
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Guest Full Name</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <User size={15} className="form-input-icon" />
                    <input
                      type="text"
                      className="form-input-pro"
                      placeholder="e.g. Rajesh Kumar"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Phone Number</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <Phone size={15} className="form-input-icon" />
                    <input
                      type="tel"
                      className="form-input-pro mono"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Guest Mail ID</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <Mail size={15} className="form-input-icon" />
                    <input
                      type="email"
                      className="form-input-pro"
                      placeholder="guest@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Guest ID Document (Photo / PDF)</span>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>Optional</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    onChange={handleFileUpload}
                    id="guestIdUploadInput"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="guestIdUploadInput" className="upload-zone-pro">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={15} color="#d97706" />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                        {idCardFileName ? 'Change Document' : 'Upload ID Proof'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {idCardFileName || 'PDF / JPG / PNG'}
                    </span>
                  </label>
                </div>
              </div>

              {/* ID Document Preview Thumbnail */}
              {idCardDataUrl && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ecfdf5',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #a7f3d0',
                  marginTop: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isPdfDocument ? (
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} />
                      </div>
                    ) : (
                      <img 
                        src={idCardDataUrl} 
                        alt="ID Preview" 
                        style={{ width: '48px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }} 
                      />
                    )}
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> {isPdfDocument ? 'PDF Document' : 'Photo Proof'} Attached
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>{idCardFileName}</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="icon-btn"
                    onClick={() => { setIdCardDataUrl(null); setIdCardFileName(''); }}
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Section 2: Stay, Guest Count & Room Allocation */}
            <div className="booking-form-section">
              <div className="booking-form-section-header">
                <div className="booking-section-title">
                  <BedDouble size={16} color="#0284c7" />
                  <span>2. Stay Period, Guest Count & Room Allocation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="badge-guest-count">
                    <Users size={12} color="#0284c7" />
                    <span>{guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                  <div className="stay-duration-chip" title="Calculated Duration of Stay">
                    <Calendar size={13} />
                    <span>{nights} {nights === 1 ? 'Night' : 'Nights'} Stay</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2-pro">
                {/* Guest Count: Adults Stepper */}
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Adults (Ages 12+)</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="guest-stepper-wrapper">
                    <button 
                      type="button" 
                      className="guest-stepper-btn" 
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      title="Decrease Adults"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="guest-stepper-val">{adults}</span>
                    <button 
                      type="button" 
                      className="guest-stepper-btn" 
                      onClick={() => setAdults(Math.min(10, adults + 1))}
                      disabled={adults >= 10}
                      title="Increase Adults"
                    >
                      <Plus size={14} />
                    </button>
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: 'auto', fontWeight: 600 }}>
                      {adults === 1 ? '1 Adult' : `${adults} Adults`}
                    </span>
                  </div>
                </div>

                {/* Guest Count: Children Stepper */}
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Children (Ages 0-11)</span>
                  </label>
                  <div className="guest-stepper-wrapper">
                    <button 
                      type="button" 
                      className="guest-stepper-btn" 
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      title="Decrease Children"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="guest-stepper-val">{children}</span>
                    <button 
                      type="button" 
                      className="guest-stepper-btn" 
                      onClick={() => setChildren(Math.min(6, children + 1))}
                      disabled={children >= 6}
                      title="Increase Children"
                    >
                      <Plus size={14} />
                    </button>
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: 'auto', fontWeight: 600 }}>
                      {children === 0 ? '0 Children' : (children === 1 ? '1 Child' : `${children} Children`)}
                    </span>
                  </div>
                </div>

                {/* Real-time Guarantee Shield Banner */}
                <div style={{ gridColumn: 'span 2' }}>
                  {isGuaranteed ? (
                    <div className="guarantee-banner-card guaranteed">
                      <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Definite Room Guarantee Active:</strong> Full payment is accepted. A physical room will be locked in hotel inventory and cannot be overbooked by walk-ins.
                      </div>
                    </div>
                  ) : (
                    <div className="guarantee-banner-card tentative">
                      <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Tentative Inquiry (Soft Hold):</strong> Held for {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}. Room will be officially allotted upon arrival and payment at the front desk.
                      </div>
                    </div>
                  )}
                </div>

                {/* Check-In Date */}
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Check-in Date</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <Calendar size={15} className="form-input-icon" />
                    <input
                      type="date"
                      className="form-input-pro"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Check-Out Date */}
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Check-out Date</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <Calendar size={15} className="form-input-icon" />
                    <input
                      type="date"
                      className="form-input-pro"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn}
                      required
                    />
                  </div>
                </div>

                {/* Booking Channel */}
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Booking Channel / Source</span>
                  </label>
                  <select
                    className="form-select-pro no-icon"
                    value={bookingType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingType(val);
                      if (val === 'Online Pre-paid') {
                        setIsPrepaid(true);
                      }
                    }}
                  >
                    <option value="Walk-in">Walk-in (Direct Front-Desk)</option>
                    <option value="Online Pre-paid">Online Pre-paid (Advance Payment)</option>
                    <option value="OTA">OTA / Travel Agent (MakeMyTrip, Booking.com, Agoda)</option>
                  </select>
                </div>

                {/* Room Allotment Selector (Manager / Front-Desk Controlled) */}
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Allot Room Suite</span>
                  </label>
                  <div className="form-input-wrapper">
                    <BedDouble size={15} className="form-input-icon" />
                    <select
                      className="form-select-pro mono"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      disabled={isHiddenAllocation}
                      style={isHiddenAllocation ? { background: '#f8fafc', cursor: 'not-allowed' } : {}}
                    >
                      <option value="">
                        {bookingType === 'Walk-in'
                          ? (availableRooms.length > 0 ? `👉 Auto-Assign Available Room (Room ${availableRooms[0]})` : '⚠️ No Clean Rooms Available')
                          : isGuaranteed
                            ? `🛡️ Auto-Assign Free Room (${availableRooms[0] ? `Room ${availableRooms[0]}` : 'Auto-Hold'})`
                            : `⏳ Unallocated (Hold for ${guestCount} Guests • Allot on Arrival)`
                        }
                      </option>
                      {guestSellableRooms.map((r) => {
                        const isOccupied = occupiedRooms.includes(r);
                        return (
                          <option key={r} value={r} disabled={isOccupied}>
                            Room {r} {isOccupied ? '• (Occupied/Reserved)' : '• (Available)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Manual Booking Reference ID */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label-pro">
                    <span>Manual Booking / Reference ID</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="form-input-wrapper">
                    <Hash size={15} className="form-input-icon" />
                    <input
                      type="text"
                      className="form-input-pro mono"
                      placeholder="e.g. OYO-10234, MMT-9821, or FrontDesk-01"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      readOnly={isHiddenAllocation}
                      style={isHiddenAllocation ? { background: '#f8fafc', color: '#b45309', cursor: 'not-allowed' } : {}}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Billing & Payment Reconciliation */}
            <div className="booking-form-section">
              <div className="booking-form-section-header">
                <div className="booking-section-title">
                  <CreditCard size={16} color="#059669" />
                  <span>3. Billing & Payment Details</span>
                </div>
                <span className="booking-section-badge">Front-Desk Cash & Net</span>
              </div>

              <div className="form-grid-2-pro">
                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Amount Paid (₹)</span>
                  </label>
                  <div className="form-input-wrapper">
                    <CreditCard size={15} className="form-input-icon" />
                    <input
                      type="number"
                      step="0.01"
                      className="form-input-pro mono"
                      placeholder="0.00"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-pro">
                    <span>Payment Channel</span>
                  </label>
                  <select
                    className="form-select-pro no-icon"
                    value={paidVia}
                    onChange={(e) => setPaidVia(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm / QR)</option>
                    <option value="Credit Card">Credit Card (POS Terminal)</option>
                    <option value="Debit Card">Debit Card (POS Terminal)</option>
                    <option value="Net Banking">Net Banking / NEFT / IMPS</option>
                    <option value="Pending">Pending / Unpaid (Pay at Checkout)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Transaction ID Field for Net / Electronic Payments */}
              {isNetPayment && (
                <div className="txn-highlight-box">
                  <div className="txn-highlight-header">
                    <label className="form-label-pro" style={{ margin: 0, color: '#0369a1' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCheck size={15} />
                        Transaction ID / UTR / Reference Number
                      </span>
                      <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 8px', borderRadius: '4px' }}>
                      Required for {paidVia}
                    </span>
                  </div>
                  <div className="form-input-wrapper" style={{ marginTop: '8px' }}>
                    <Hash size={15} className="form-input-icon" color="#0284c7" />
                    <input
                      type="text"
                      className="form-input-pro mono"
                      style={{ borderColor: '#38bdf8', background: '#ffffff' }}
                      placeholder="Enter UPI Ref / UTR / Card Auth / Bank Txn ID"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      required={isNetPayment}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: isPrepaid ? '#047857' : '#334155' }}>
                  <input
                    type="checkbox"
                    checked={isPrepaid}
                    onChange={(e) => setIsPrepaid(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#047857', cursor: 'pointer' }}
                  />
                  <span>Compulsory Pre-paid / Paid in Full</span>
                </label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Locks reservation against cancellation
                </span>
              </div>

              <div className="form-group" style={{ marginTop: '14px' }}>
                <label className="form-label-pro">
                  <span>Internal Stay Notes</span>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>Optional</span>
                </label>
                <input
                  type="text"
                  className="form-input-pro no-icon"
                  placeholder="Special requests, arrival notes, VIP status..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="booking-modal-footer-pro">
            <div className="footer-summary">
              <span className="footer-summary-chip">Room {room || '—'}</span>
              <span>•</span>
              <span className="footer-summary-chip">{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
              <span>•</span>
              <span className="footer-amount-chip">{formatCurrency(amountPaid)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" className="btn-sub" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-main" 
                disabled={!isRegisterOpen || submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
                title={isRegisterOpen ? 'Save Stay Record' : 'Shift Register is Closed (View-Only Mode)'}
              >
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Saving...' : (initialData ? 'Update Stay Record' : 'Save Stay Record')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
