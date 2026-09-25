import React, { useState, useMemo } from 'react';
import { useHotel } from '../context/HotelContext';
import { generateSystemBookingId, getAutoStayStatus, calculateNights, formatCurrency } from '../utils/formatters';
import { IDCardViewerModal } from './IDCardViewerModal';
import { 
  Upload, X, CheckCircle2, FileText, Sparkles, User, Phone, 
  Mail, BedDouble, Calendar, CreditCard, Hash, FileCheck, ShieldCheck,
  Users, Minus, Plus, AlertCircle, Eye, Trash2, IdCard, RefreshCw, Clock
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

  // Dynamic calculated nights
  const nights = calculateNights(checkIn, checkOut);

  // ID Card document upload states (Photo or PDF)
  const [idCardType, setIdCardType] = useState(initialData?.idCardType || 'Aadhaar Card');
  const [idCardNumber, setIdCardNumber] = useState(initialData?.idCardNumber || '');
  const [idCardDataUrl, setIdCardDataUrl] = useState(initialData?.idCard || null);
  const [idCardFileName, setIdCardFileName] = useState(initialData?.idCardName || '');
  const [idCardFileSize, setIdCardFileSize] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);

  // Billing & Payment options states
  const initialTotal = useMemo(() => {
    if (initialData?.totalAmount !== undefined && initialData.totalAmount !== null && parseFloat(initialData.totalAmount) > 0) {
      return parseFloat(initialData.totalAmount);
    }
    if (initialData?.amountPaid !== undefined && initialData.amountPaid !== null && parseFloat(initialData.amountPaid) > 0) {
      return parseFloat(initialData.amountPaid);
    }
    return Math.max(1500, nights * 1500);
  }, [initialData, nights]);

  const [totalAmount, setTotalAmount] = useState(initialTotal);

  const getInitialPaymentOption = () => {
    if (initialData?.paymentStatus) return initialData.paymentStatus;
    if (initialData?.isPrepaid || initialData?.bookingType === 'Online Pre-paid') return 'Fully Paid';
    if (initialData?.amountPaid && parseFloat(initialData.amountPaid) > 0) {
      if (initialData?.totalAmount && parseFloat(initialData.amountPaid) < parseFloat(initialData.totalAmount)) {
        return 'Partially Paid';
      }
      return 'Fully Paid';
    }
    if (initialData?.paidVia === 'Pending') return 'Unpaid';
    return 'Fully Paid'; // Default front-desk standard
  };

  const [paymentOption, setPaymentOption] = useState(getInitialPaymentOption());
  const [amountPaid, setAmountPaid] = useState(
    initialData?.amountPaid !== undefined 
      ? initialData.amountPaid 
      : (getInitialPaymentOption() === 'Fully Paid' ? initialTotal : (getInitialPaymentOption() === 'Unpaid' ? 0 : Math.round(initialTotal * 0.5)))
  );
  const [paidVia, setPaidVia] = useState(initialData?.paidVia || 'Cash');
  const [txnId, setTxnId] = useState(initialData?.txnId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Booking Type & Prepaid Classification
  const [bookingType, setBookingType] = useState(initialData?.bookingType || 'Walk-in');
  const [isPrepaid, setIsPrepaid] = useState(Boolean(initialData?.isPrepaid || paymentOption === 'Fully Paid'));

  // Room state: if initialData has a room, use it; else if walk-in or paid, suggest available room
  const [room, setRoom] = useState(
    initialData?.room && !staffRoomNumbers.has(initialData.room) ? initialData.room : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Electronic/Net Payment check (requires Txn ID except Cash and Pending)
  const isNetPayment = paidVia !== 'Cash' && paidVia !== 'Pending';
  
  // Guarantee condition: fully paid, online pre-paid, or explicit prepaid
  const isGuaranteed = Boolean(
    paymentOption === 'Fully Paid' ||
    isPrepaid || 
    bookingType === 'Online Pre-paid' || 
    (paidVia !== 'Pending' && parseFloat(amountPaid) > 0)
  );

  // File upload processing
  const handleFileProcess = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please upload a smaller document image or PDF.');
      return;
    }
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;
    setIdCardFileSize(sizeStr);
    setIdCardFileName(file.name);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdCardDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const isPdfDocument = Boolean(
    (idCardFileName && idCardFileName.toLowerCase().endsWith('.pdf')) || 
    (idCardDataUrl && idCardDataUrl.startsWith('data:application/pdf'))
  );

  // Quick Tariff auto-recalculate based on standard rate
  const handleAutoRecalculateTariff = () => {
    const calculated = Math.max(1, nights) * 1500;
    setTotalAmount(calculated);
    if (paymentOption === 'Fully Paid') {
      setAmountPaid(calculated);
    } else if (paymentOption === 'Partially Paid') {
      setAmountPaid(Math.round(calculated * 0.5));
    }
  };

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

    const finalTotal = parseFloat(totalAmount) || parseFloat(amountPaid) || 0;
    const finalAmountPaid = paymentOption === 'Unpaid' 
      ? 0 
      : (paymentOption === 'Fully Paid' ? finalTotal : (parseFloat(amountPaid) || 0));

    const finalPaidVia = paymentOption === 'Unpaid' ? 'Pending' : paidVia;

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
      amountPaid: finalAmountPaid,
      totalAmount: finalTotal,
      paymentStatus: paymentOption,
      paidVia: finalPaidVia,
      txnId: isNetPayment ? txnId.trim() : null,
      status: initialData?.status || autoStatus,
      bookingType: bookingType || 'Walk-in',
      isPrepaid: Boolean(paymentOption === 'Fully Paid' || isPrepaid),
      isGuaranteed: Boolean(isGuaranteed),
      notes: notes.trim(),
      idCard: idCardDataUrl,
      idCardName: idCardFileName || (idCardDataUrl ? `${idCardType}` : ''),
      idCardType: idCardType,
      idCardNumber: idCardNumber.trim(),
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

  const balanceDue = paymentOption === 'Fully Paid' 
    ? 0 
    : Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(amountPaid) || 0));

  return (
    <>
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

                <div className="form-grid-3-pro">
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
                </div>
              </div>

              {/* Section 2: Dedicated Guest ID Proof & Document Upload Section */}
              <div className="booking-form-section">
                <div className="booking-form-section-header">
                  <div className="booking-section-title">
                    <IdCard size={17} color="#2563eb" />
                    <span>2. Guest Document & ID Verification</span>
                  </div>
                  <span className="booking-section-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                    Govt. KYC Compliance
                  </span>
                </div>

                <div className="form-grid-2-pro">
                  <div className="form-group">
                    <label className="form-label-pro">
                      <span>Document Type</span>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>Govt. Issued</span>
                    </label>
                    <select
                      className="form-select-pro no-icon"
                      value={idCardType}
                      onChange={(e) => setIdCardType(e.target.value)}
                    >
                      <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                      <option value="Passport">Passport (Indian / International)</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter Identity Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Government Employee ID">Government / Official ID</option>
                      <option value="Other Photo ID">Other Government Photo ID</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label-pro">
                      <span>Document / ID Number</span>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>Optional</span>
                    </label>
                    <div className="form-input-wrapper">
                      <Hash size={15} className="form-input-icon" />
                      <input
                        type="text"
                        className="form-input-pro mono"
                        placeholder="e.g. 1234 5678 9012 or Z1234567"
                        value={idCardNumber}
                        onChange={(e) => setIdCardNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Zone & Attachment Preview */}
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  id="guestDocUploadInput"
                  style={{ display: 'none' }}
                />

                {!idCardDataUrl ? (
                  <div
                    className={`doc-upload-dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('guestDocUploadInput').click()}
                  >
                    <div className="dropzone-icon-circle">
                      <Upload size={22} color="#2563eb" />
                    </div>
                    <div className="dropzone-text">
                      <span className="dropzone-main-text">
                        <strong>Click to upload</strong> or drag and drop guest ID document
                      </span>
                      <span className="dropzone-sub-text">
                        Supported formats: PDF, JPG, PNG, WEBP (Max 10 MB) • Verified during front-desk check-in
                      </span>
                    </div>
                    <button type="button" className="btn-browse-file">
                      Browse File
                    </button>
                  </div>
                ) : (
                  <div className="doc-attached-card">
                    <div className="doc-attached-left">
                      {isPdfDocument ? (
                        <div className="doc-file-icon pdf">
                          <FileText size={24} />
                          <span className="doc-file-type-badge">PDF</span>
                        </div>
                      ) : (
                        <div className="doc-file-thumbnail-wrap">
                          <img src={idCardDataUrl} alt="ID Preview" className="doc-file-thumbnail" />
                        </div>
                      )}
                      <div className="doc-file-meta">
                        <div className="doc-file-header">
                          <span className="doc-file-name" title={idCardFileName}>{idCardFileName}</span>
                          <span className="doc-verified-badge">
                            <CheckCircle2 size={13} /> Attached
                          </span>
                        </div>
                        <div className="doc-file-tags">
                          <span className="doc-tag-pill">{idCardType}</span>
                          {idCardNumber && <span className="doc-tag-pill mono">No: {idCardNumber}</span>}
                          {idCardFileSize && <span className="doc-tag-pill size">{idCardFileSize}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="doc-attached-actions">
                      <button
                        type="button"
                        className="btn-doc-action preview"
                        onClick={() => setShowDocPreview(true)}
                        title="Preview Document"
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <button
                        type="button"
                        className="btn-doc-action replace"
                        onClick={() => document.getElementById('guestDocUploadInput').click()}
                        title="Replace Document"
                      >
                        <Upload size={14} /> Replace
                      </button>
                      <button
                        type="button"
                        className="btn-doc-action remove"
                        onClick={() => {
                          setIdCardDataUrl(null);
                          setIdCardFileName('');
                          setIdCardFileSize('');
                        }}
                        title="Remove Attachment"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Stay, Guest Count & Room Allocation */}
              <div className="booking-form-section">
                <div className="booking-form-section-header">
                  <div className="booking-section-title">
                    <BedDouble size={16} color="#0284c7" />
                    <span>3. Stay Period, Guest Count & Room Allocation</span>
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
                          <strong>Definite Room Guarantee Active:</strong> {paymentOption === 'Fully Paid' ? 'Full stay tariff is settled in full' : 'Deposit / guaranteed reservation confirmed'}. A physical room is locked in hotel inventory and cannot be overbooked.
                        </div>
                      </div>
                    ) : (
                      <div className="guarantee-banner-card tentative">
                        <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>Tentative Inquiry (Soft Hold):</strong> Held for {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}. Room will be officially allotted upon arrival and settlement at the front desk.
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
                          setPaymentOption('Fully Paid');
                          setAmountPaid(totalAmount);
                        }
                      }}
                    >
                      <option value="Walk-in">Walk-in (Direct Front-Desk)</option>
                      <option value="Online Pre-paid">Online Pre-paid (Advance Payment)</option>
                      <option value="OTA">OTA / Travel Agent (MakeMyTrip, Booking.com, Agoda)</option>
                    </select>
                  </div>

                  {/* Room Allotment Selector */}
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

              {/* Section 4: Billing & Payment Settlement with "Fully Paid" Option */}
              <div className="booking-form-section">
                <div className="booking-form-section-header">
                  <div className="booking-section-title">
                    <CreditCard size={17} color="#059669" />
                    <span>4. Billing & Payment Settlement</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`booking-section-badge ${paymentOption === 'Fully Paid' ? 'emerald' : paymentOption === 'Partially Paid' ? 'amber' : 'neutral'}`}>
                      {paymentOption === 'Fully Paid' ? '✓ Fully Paid in Full' : paymentOption === 'Partially Paid' ? '⏳ Partial Advance' : '⚪ Unpaid / Pending'}
                    </span>
                  </div>
                </div>

                {/* Prominent Payment Option Selector */}
                <div className="payment-options-selector">
                  <button
                    type="button"
                    className={`payment-option-btn fully-paid ${paymentOption === 'Fully Paid' ? 'active' : ''}`}
                    onClick={() => {
                      setPaymentOption('Fully Paid');
                      setAmountPaid(totalAmount);
                      setIsPrepaid(true);
                      if (paidVia === 'Pending') setPaidVia('Cash');
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div className="pay-btn-title">Fully Paid</div>
                      <div className="pay-btn-desc">100% room tariff settled up-front</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`payment-option-btn partial-paid ${paymentOption === 'Partially Paid' ? 'active' : ''}`}
                    onClick={() => {
                      setPaymentOption('Partially Paid');
                      setIsPrepaid(false);
                      const curAmt = parseFloat(amountPaid) || 0;
                      if (curAmt >= parseFloat(totalAmount) || curAmt === 0) {
                        setAmountPaid(Math.round(parseFloat(totalAmount) * 0.5) || 500);
                      }
                      if (paidVia === 'Pending') setPaidVia('Cash');
                    }}
                  >
                    <Clock size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div className="pay-btn-title">Partially Paid (Advance)</div>
                      <div className="pay-btn-desc">Deposit collected, balance at checkout</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`payment-option-btn unpaid ${paymentOption === 'Unpaid' ? 'active' : ''}`}
                    onClick={() => {
                      setPaymentOption('Unpaid');
                      setAmountPaid(0);
                      setPaidVia('Pending');
                      setIsPrepaid(false);
                    }}
                  >
                    <AlertCircle size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div className="pay-btn-title">Unpaid / Pay at Checkout</div>
                      <div className="pay-btn-desc">0 advance, pay upon arrival/departure</div>
                    </div>
                  </button>
                </div>

                {/* Form Grid for Amounts & Mode */}
                <div className="form-grid-3-pro" style={{ marginTop: '14px' }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label-pro">
                        <span>Total Stay Tariff (₹)</span>
                        <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoRecalculateTariff}
                        className="btn-link-action"
                        title="Auto-calculate: nights × ₹1,500/night"
                      >
                        <RefreshCw size={11} /> Auto Rate
                      </button>
                    </div>
                    <div className="form-input-wrapper">
                      <CreditCard size={15} className="form-input-icon" />
                      <input
                        type="number"
                        step="1"
                        min="0"
                        className="form-input-pro mono"
                        value={totalAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setTotalAmount(val);
                          if (paymentOption === 'Fully Paid') {
                            setAmountPaid(val);
                          }
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label-pro">
                      <span>Amount Paid Now (₹)</span>
                      <span style={{ color: paymentOption === 'Fully Paid' ? '#059669' : '#0284c7', fontSize: '11px', fontWeight: 700 }}>
                        {paymentOption === 'Fully Paid' ? '100% Full' : paymentOption === 'Partially Paid' ? 'Advance Deposit' : 'Zero Advance'}
                      </span>
                    </label>
                    <div className="form-input-wrapper">
                      <CreditCard size={15} className="form-input-icon" />
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={totalAmount}
                        className="form-input-pro mono"
                        value={amountPaid}
                        disabled={paymentOption === 'Fully Paid' || paymentOption === 'Unpaid'}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setAmountPaid(val);
                        }}
                        style={paymentOption === 'Fully Paid' ? { background: '#f0fdf4', color: '#166534', fontWeight: 800 } : {}}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label-pro">
                      <span>Payment Channel / Mode</span>
                      <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      className="form-select-pro no-icon"
                      value={paidVia}
                      disabled={paymentOption === 'Unpaid'}
                      onChange={(e) => setPaidVia(e.target.value)}
                    >
                      <option value="Cash">Cash (Front-Desk Counter)</option>
                      <option value="UPI">UPI (GPay / PhonePe / Paytm / QR)</option>
                      <option value="Credit Card">Credit Card (POS Terminal)</option>
                      <option value="Debit Card">Debit Card (POS Terminal)</option>
                      <option value="Net Banking">Net Banking / NEFT / IMPS</option>
                      <option value="Online Pre-paid">Online Pre-paid (OTA / Web)</option>
                      {paymentOption === 'Unpaid' && <option value="Pending">Pending / Pay at Checkout</option>}
                    </select>
                  </div>
                </div>

                {/* Dynamic Payment Reconciliation Banner */}
                <div style={{ marginTop: '12px' }}>
                  {paymentOption === 'Fully Paid' && (
                    <div className="payment-reconcile-card fully-paid">
                      <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <strong style={{ color: '#065f46', fontSize: '13px' }}>✓ 100% Fully Paid Stay</strong>
                          <span className="reconcile-balance-chip zero">Balance Due: ₹0.00</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                          Full stay tariff of <strong>{formatCurrency(totalAmount)}</strong> received via <strong>{paidVia}</strong>. Room is locked with a definite guarantee against walk-in overbooking.
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentOption === 'Partially Paid' && (
                    <div className="payment-reconcile-card partial">
                      <Clock size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <strong style={{ color: '#92400e', fontSize: '13px' }}>⏳ Advance Payment Collected</strong>
                          <span className="reconcile-balance-chip due">
                            Due at Checkout: {formatCurrency(balanceDue)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                          Advance of <strong>{formatCurrency(amountPaid)}</strong> received via <strong>{paidVia}</strong>. Remaining balance of <strong>{formatCurrency(balanceDue)}</strong> is payable upon check-out or final checkout billing.
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentOption === 'Unpaid' && (
                    <div className="payment-reconcile-card unpaid">
                      <AlertCircle size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <strong style={{ color: '#334155', fontSize: '13px' }}>⚪ Payment Pending / Zero Advance</strong>
                          <span className="reconcile-balance-chip pending">Full Total Due: {formatCurrency(totalAmount)}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          No upfront payment recorded. Full stay charges of <strong>{formatCurrency(totalAmount)}</strong> will be settled at front desk on arrival or check-out.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conditional Transaction ID Field for Net / Electronic Payments */}
                {isNetPayment && (
                  <div className="txn-highlight-box" style={{ marginTop: '14px' }}>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: (paymentOption === 'Fully Paid' || isPrepaid) ? '#047857' : '#334155' }}>
                    <input
                      type="checkbox"
                      checked={paymentOption === 'Fully Paid' || isPrepaid}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsPrepaid(checked);
                        if (checked) {
                          setPaymentOption('Fully Paid');
                          setAmountPaid(totalAmount);
                          if (paidVia === 'Pending') setPaidVia('Cash');
                        } else {
                          setPaymentOption('Partially Paid');
                        }
                      }}
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
                <span className="footer-summary-chip">Total: {formatCurrency(totalAmount)}</span>
                <span>•</span>
                <span className={`footer-amount-chip ${paymentOption === 'Fully Paid' ? 'fully-paid' : ''}`}>
                  Paid: {formatCurrency(amountPaid)}
                </span>
                {balanceDue > 0 && (
                  <span className="footer-due-chip">
                    Due: {formatCurrency(balanceDue)}
                  </span>
                )}
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

      {/* ID Document Preview Modal */}
      {showDocPreview && idCardDataUrl && (
        <IDCardViewerModal
          booking={{
            id: manualId || id,
            guestName: guestName || 'Guest Document',
            room: room || 'Unallocated',
            idCard: idCardDataUrl,
            idCardName: idCardFileName || `${idCardType}`,
            idCardType,
            idCardNumber
          }}
          onClose={() => setShowDocPreview(false)}
        />
      )}
    </>
  );
};
