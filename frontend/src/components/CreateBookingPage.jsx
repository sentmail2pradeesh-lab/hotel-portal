import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../context/HotelContext';
import { localDateStr, generateSystemBookingId, getAutoStayStatus, calculateNights, formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import { computeMonthBreakdown } from '../utils/paymentBreakdown';
import { PaymentBreakdownBar } from './PaymentBreakdownBar';
import { StoredDocumentImage } from './StoredDocumentImage';
import { storeIdScan } from '../utils/storedDocuments';
import {
  ArrowLeft, Upload, X, FileText, User, Phone,
  Mail, Calendar, CreditCard, Hash, ShieldCheck,
  Plus, AlertCircle, Trash2, IdCard, Check, Building2
} from 'lucide-react';

const EMPTY_LIST = [];

const DOC_TYPES = [
  'Aadhaar Card',
  'Passport',
  'Driving License',
  'Voter ID',
  'PAN Card',
  'Other Govt ID'
];

const PAYMENT_OPTIONS = [
  { id: 'UPI (owner upi)', label: 'UPI (Owner UPI)', channel: 'UPI (Owner UPI)', needsTxn: true },
  { id: 'Cash', label: 'Cash', channel: 'Cash', needsTxn: false },
  { id: 'Pre paid', label: 'Pre Paid', channel: 'Online Payment', needsTxn: false },
  { id: 'Partially paid', label: 'Partially Paid', channel: null, needsTxn: false },
  { id: 'Unpaid', label: 'Unpaid', channel: 'Pending', needsTxn: false },
  { id: 'Other UPI', label: 'Other UPI', channel: 'Other UPI', needsTxn: true }
];

const PAYMENT_CHANNELS = [
  'Cash',
  'UPI (Owner UPI)',
  'Other UPI',
  'Online Payment',
  'Credit/Debit Card',
  'Net Banking',
  'Pending'
];

export const CreateBookingPage = () => {
  const {
    bookings: activeBookings = EMPTY_LIST,
    roomsList: activeRooms = EMPTY_LIST,
    roomsDetails: activeRoomDetails = EMPTY_LIST,
    currentUser,
    isRegisterOpen,
    goBack,
    createBookingData,
    setCreateBookingData,
    setActiveTab,
    activePropertyId,
    propertiesList = EMPTY_LIST,
    refreshPropertyData
  } = useHotel();

  // Property this stay is booked on. Defaults to the active property; picking another one
  // loads that property's rooms and bookings for this page only (sidebar selection is unchanged).
  const [targetFirmId, setTargetFirmId] = useState(createBookingData?.firmId || activePropertyId || '');
  const [foreignData, setForeignData] = useState(null);
  const isActiveTarget = !targetFirmId || targetFirmId === activePropertyId;
  const targetCode = (propertiesList || []).find(p => p.firmId === targetFirmId)?.propertyCode || currentUser?.propertyCode;

  useEffect(() => {
    if (isActiveTarget) {
      setForeignData(null);
      return;
    }
    let cancelled = false;
    api.syncPropertyData(targetFirmId)
      .then((data) => {
        if (cancelled) return;
        setForeignData({
          rooms: data?.rooms || [],
          roomDetails: data?.roomDetails || [],
          bookings: data?.bookings || []
        });
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('Could not load rooms for the selected property.');
      });
    return () => { cancelled = true; };
  }, [targetFirmId, activePropertyId, isActiveTarget]);

  const bookings = isActiveTarget ? activeBookings : (foreignData?.bookings || EMPTY_LIST);
  const roomsList = isActiveTarget ? activeRooms : (foreignData?.rooms || EMPTY_LIST);
  const roomsDetails = isActiveTarget ? activeRoomDetails : (foreignData?.roomDetails || EMPTY_LIST);

  // Exclude staff quarters from sellable guest rooms
  const staffRoomNumbers = useMemo(() => {
    return new Set((roomsDetails || []).filter(r => r.isStaffRoom).map(r => r.roomNumber));
  }, [roomsDetails]);

  const guestSellableRooms = useMemo(() => {
    return (roomsList || []).filter(r => !staffRoomNumbers.has(r));
  }, [roomsList, staffRoomNumbers]);

  const occupiedRooms = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'Completed' && b.status !== 'Archived' && b.status !== 'Cancelled' && b.room)
      .map((b) => b.room);
  }, [bookings]);

  const availableRooms = useMemo(() => {
    return guestSellableRooms.filter(r => !occupiedRooms.includes(r));
  }, [guestSellableRooms, occupiedRooms]);

  // Default dates: check-in today, check-out tomorrow
  const todayIso = localDateStr();
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowIso = localDateStr(tomorrowObj);

  const initialData = createBookingData;

  const [id] = useState(initialData?.id || generateSystemBookingId(bookings));
  const [manualId, setManualId] = useState(initialData?.manualId || '');
  const [guestName, setGuestName] = useState(initialData?.guestName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || ''); // Optional as per Req 3
  
  const [adults, setAdults] = useState(initialData?.adults || 1);
  const [children, setChildren] = useState(initialData?.children || 0);

  const [checkIn, setCheckIn] = useState(initialData?.checkIn || todayIso);
  const [checkOut, setCheckOut] = useState(initialData?.checkOut || tomorrowIso);
  const nights = calculateNights(checkIn, checkOut);

  const [bookingType, setBookingType] = useState(initialData?.bookingType || 'Walk-in');
  const [room, setRoom] = useState(
    initialData?.room && !staffRoomNumbers.has(initialData.room) ? initialData.room : ''
  );

  // Multi-Document state: up to 5 documents (Requirement 5)
  const [documents, setDocuments] = useState(() => {
    if (initialData?.documents && Array.isArray(initialData.documents) && initialData.documents.length > 0) {
      return initialData.documents;
    }
    if (initialData?.idCard) {
      return [{
        id: 'doc-1',
        type: initialData.idCardType || 'Aadhaar Card',
        number: initialData.idCardNumber || '',
        dataUrl: initialData.idCard,
        fileName: initialData.idCardName || 'ID_Document',
        fileSize: ''
      }];
    }
    return [{
      id: 'doc-1',
      type: 'Aadhaar Card',
      number: '',
      dataUrl: null,
      fileName: '',
      fileSize: ''
    }];
  });

  // Tariff & Payment States
  const initialTariff = useMemo(() => {
    if (initialData?.totalAmount && parseFloat(initialData.totalAmount) > 0) {
      return parseFloat(initialData.totalAmount);
    }
    return Math.max(1500, nights * 1500);
  }, [initialData, nights]);

  const [totalAmount, setTotalAmount] = useState(initialTariff);
  const [paymentOption, setPaymentOption] = useState(initialData?.paymentOption || 'Cash');
  const [amountPaid, setAmountPaid] = useState(
    initialData?.amountPaid !== undefined ? initialData.amountPaid : initialTariff
  );
  const [paidVia, setPaidVia] = useState(initialData?.paidVia || 'Cash');
  const [txnId, setTxnId] = useState(initialData?.txnId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Pre-submission summary modal state (Requirement 15)
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [pendingActionType, setPendingActionType] = useState('save'); // 'save' | 'draft' | 'save_and_bill'
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto update channel based on payment option (Requirements 8, 9)
  useEffect(() => {
    if (paymentOption === 'Pre paid') {
      setPaidVia('Online Payment');
      setAmountPaid(totalAmount);
    } else if (paymentOption === 'Cash') {
      setPaidVia('Cash');
      setAmountPaid(totalAmount);
    } else if (paymentOption === 'UPI (owner upi)') {
      setPaidVia('UPI (Owner UPI)');
      setAmountPaid(totalAmount);
    } else if (paymentOption === 'Other UPI') {
      setPaidVia('Other UPI');
      setAmountPaid(totalAmount);
    } else if (paymentOption === 'Unpaid') {
      setPaidVia('Pending');
      setAmountPaid(0);
    } else if (paymentOption === 'Partially paid') {
      if (paidVia === 'Pending') setPaidVia('Cash');
      if (parseFloat(amountPaid) >= parseFloat(totalAmount) || parseFloat(amountPaid) === 0) {
        setAmountPaid(Math.round(totalAmount * 0.5));
      }
    }
  }, [paymentOption, totalAmount]);

  // Recalculate dynamic balance due (Requirement 10)
  const balanceDue = useMemo(() => {
    if (paymentOption === 'Unpaid') return parseFloat(totalAmount) || 0;
    if (paymentOption === 'Cash' || paymentOption === 'Pre paid' || paymentOption === 'UPI (owner upi)' || paymentOption === 'Other UPI') {
      return 0;
    }
    const total = parseFloat(totalAmount) || 0;
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, total - paid);
  }, [totalAmount, amountPaid, paymentOption]);

  const monthPaymentBreakdown = computeMonthBreakdown(bookings);

  // Handle Multi-Document Upload in One Section (Requirements 3 & 5)
  const handleMultipleFilesSelected = (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    
    // Check available slots up to 5
    const isBlankSingle = documents.length === 1 && !documents[0].dataUrl && !documents[0].number && !documents[0].fileName;
    const currentCount = isBlankSingle ? 0 : documents.length;
    const availableSlots = 5 - currentCount;
    
    if (availableSlots <= 0) {
      alert('Maximum 5 documents can be attached to a single booking.');
      return;
    }

    if (fileList.length > availableSlots) {
      alert(`Only ${availableSlots} more document(s) could be added (Max 5 limit).`);
    }

    const filesToProcess = fileList.slice(0, availableSlots);
    
    filesToProcess.forEach((file, i) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10MB limit.`);
        return;
      }
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      let guessedType = 'Aadhaar Card';
      const lower = file.name.toLowerCase();
      if (lower.includes('passport')) guessedType = 'Passport';
      else if (lower.includes('license') || lower.includes('dl')) guessedType = 'Driving License';
      else if (lower.includes('voter')) guessedType = 'Voter ID';
      else if (lower.includes('pan')) guessedType = 'PAN Card';

      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments(prev => {
          const isInitialBlank = prev.length === 1 && !prev[0].dataUrl && !prev[0].number && !prev[0].fileName;
          const newDoc = {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type: guessedType,
            number: '',
            file, // uploaded to Dropbox once the booking is saved
            dataUrl: reader.result,
            fileName: file.name,
            fileSize: sizeStr
          };
          if (isInitialBlank) {
            return [newDoc];
          }
          if (prev.length >= 5) return prev;
          return [...prev, newDoc];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddDocumentSection = () => {
    if (documents.length >= 5) {
      alert('Maximum 5 documents can be added to a single booking.');
      return;
    }
    setDocuments(prev => [
      ...prev,
      {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'Aadhaar Card',
        number: '',
        dataUrl: null,
        fileName: '',
        fileSize: ''
      }
    ]);
  };

  const handleRemoveDocumentSection = (index) => {
    if (documents.length <= 1) {
      // Instead of blocking remove, reset the single document to a blank entry
      setDocuments([{
        id: `doc-${Date.now()}`,
        type: 'Aadhaar Card',
        number: '',
        dataUrl: null,
        fileName: '',
        fileSize: ''
      }]);
      return;
    }
    setDocuments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateDocument = (index, field, value) => {
    setDocuments(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  // Pre-Submission Validation (Requirement 3, 14)
  const validateForm = () => {
    if (!manualId.trim()) {
      setErrorMsg('Please enter mandatory Manual Booking / Reference ID.');
      return false;
    }
    if (!guestName.trim()) {
      setErrorMsg('Please enter guest full name.');
      return false;
    }
    if (!phone.trim()) {
      setErrorMsg('Phone number is mandatory for reservation.');
      return false;
    }

    // Requirement 3: doc type is mandate in bookings
    for (let i = 0; i < documents.length; i++) {
      if (!documents[i].type || !documents[i].type.trim()) {
        setErrorMsg(`Document #${i + 1} must have a valid Document Type selected.`);
        return false;
      }
    }

    // Requirement 14: Txn ID / UTR is mandatory ONLY if UPI is opted
    const isUpi = paymentOption === 'UPI (owner upi)' || paymentOption === 'Other UPI' || paidVia.toLowerCase().includes('upi');
    if (isUpi && !txnId.trim()) {
      setErrorMsg(`Transaction ID / UTR is mandatory for ${paymentOption}. Please provide the UTR reference number.`);
      return false;
    }

    let finalRoom = room ? room.trim() : '';
    if (finalRoom && staffRoomNumbers.has(finalRoom)) {
      setErrorMsg(`Room ${finalRoom} is a designated staff quarters and cannot be booked.`);
      return false;
    }

    if (bookingType === 'Walk-in' && !finalRoom) {
      if (availableRooms.length > 0) {
        finalRoom = availableRooms[0];
        setRoom(finalRoom);
      } else {
        setErrorMsg('All rooms are currently occupied or reserved for these stay dates!');
        return false;
      }
    }

    setErrorMsg('');
    return true;
  };

  // Trigger Summary Modal (Requirement 15)
  const handleInitiateSubmit = (actionType) => {
    if (!validateForm()) return;
    setPendingActionType(actionType);
    setShowSummaryModal(true);
  };

  // Final Confirmed Execution
  const handleFinalSubmit = async () => {
    setShowSummaryModal(false);
    setSubmitting(true);
    setErrorMsg('');

    try {
      let finalRoom = room ? room.trim() : '';
      if (!finalRoom && availableRooms.length > 0) {
        finalRoom = availableRooms[0];
      }

      const finalTotal = parseFloat(totalAmount) || 0;
      const finalPaid = paymentOption === 'Unpaid' 
        ? 0 
        : (paymentOption === 'Partially paid' ? parseFloat(amountPaid) || 0 : finalTotal);

      const finalStatus = pendingActionType === 'draft' 
        ? 'Draft' 
        : getAutoStayStatus(checkIn, checkOut, 'Upcoming', 120, new Date().toISOString());

      const primaryDoc = documents[0] || {};

      const payload = {
        id: id.trim(),
        manualId: manualId.trim(),
        guestName: guestName.trim(),
        phone: phone.trim(),
        email: email.trim() || null, // Optional
        adults: parseInt(adults, 10) || 1,
        children: parseInt(children, 10) || 0,
        checkIn,
        checkOut,
        bookingType,
        room: finalRoom,
        // Legacy mirroring for backwards compatibility
        idCardType: primaryDoc.type || 'Aadhaar Card',
        idCardNumber: primaryDoc.number || null,
        // Only older scans are sent as data URLs; new and stored scans are referenced by docId
        idCard: primaryDoc.file || primaryDoc.docId ? '' : (primaryDoc.dataUrl || null),
        idCardName: primaryDoc.fileName || null,
        // Requirement 5: Multiple documents
        documents: documents.map(d => ({
          docId: d.docId,
          type: d.type,
          number: d.number,
          fileName: d.fileName,
          fileSize: d.fileSize,
          dataUrl: d.file || d.docId ? null : d.dataUrl
        })),
        totalAmount: finalTotal,
        amountPaid: finalPaid,
        balanceDue: Math.max(0, finalTotal - finalPaid),
        paymentOption,
        paidVia: paymentOption === 'Unpaid' ? 'Pending' : paidVia,
        txnId: txnId.trim() || null,
        status: finalStatus,
        notes: notes.trim() || null
      };

      // Editing an existing draft updates it in place; otherwise a new booking is created on the selected property
      const res = initialData?.id
        ? await api.updateBooking(initialData.id, payload, targetFirmId)
        : await api.createBooking(payload, targetFirmId);
      setSubmitting(false);

      if (res && (res.id || res.success || res.manualId)) {
        // Newly picked scans are uploaded now that the booking has an id
        if (documents.some((d) => d.file) && res.id) {
          try {
            const storedDocs = [];
            for (const d of documents) {
              if (d.file) {
                storedDocs.push(await storeIdScan(d.file, res.id, { type: d.type, number: d.number }));
              } else {
                storedDocs.push({
                  docId: d.docId,
                  type: d.type,
                  number: d.number,
                  fileName: d.fileName,
                  fileSize: d.fileSize,
                  dataUrl: d.docId ? null : d.dataUrl
                });
              }
            }
            await api.updateBooking(res.id, { documents: storedDocs, idCard: '' }, targetFirmId);
          } catch (scanErr) {
            alert(`The booking is saved, but its ID scan could not be stored in Dropbox: ${scanErr.message}. Upload it again from the Bookings page.`);
          }
        }
        if (isActiveTarget) refreshPropertyData();
        // Open the Bookings page on the tab for what was just saved
        sessionStorage.setItem('bookingsStartTab', pendingActionType === 'draft' ? 'drafts' : 'upcoming');
        setCreateBookingData(null);
        setActiveTab('bookings');
      } else {
        setErrorMsg(res?.message || 'Failed to save booking reservation.');
      }
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err.message || 'An unexpected error occurred while saving booking.');
    }
  };

  return (
    <div className="create-booking-page" style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Top Navigation & Header Row (Requirement 18: Back Button) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            type="button" 
            className="universal-back-btn" 
            onClick={goBack}
            title="Return to previous screen"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
                New Stay Registration
              </h1>
              {targetCode && (
                <span className="badge-room-assigned" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {targetCode}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Dedicated stay registration console with multi-document upload and automated payment routing.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          {propertiesList.length > 1 && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Property</span>
          )}
          {propertiesList.length > 1 && (
            <div
              title="Property this booking will be created on"
              style={{
                display: 'flex',
                alignItems: 'stretch',
                minWidth: '300px',
                height: '44px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
                overflow: 'hidden'
              }}
            >
              <div style={{ width: '44px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0' }}>
                <Building2 size={18} color="#f59e0b" />
              </div>
              <select
                value={targetFirmId}
                onChange={(e) => setTargetFirmId(e.target.value)}
                disabled={submitting || !!initialData?.id}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  padding: '0 14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer'
                }}
              >
                {propertiesList.map((p) => (
                  <option key={p.firmId} value={p.firmId}>
                    {p.propertyCode ? `[${p.propertyCode}] ` : ''}{p.firmName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="mono" style={{ fontSize: '13px', color: '#0284c7', background: '#f0f9ff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bae6fd', fontWeight: 700 }}>
            System ID: {id}
          </span>
        </div>
      </div>

      {/* Month-Wise Payment Breakdown (Requirement 12) */}
      <PaymentBreakdownBar items={monthPaymentBreakdown} />

      {errorMsg && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#991b1b',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Grid */}
      <form onSubmit={(e) => { e.preventDefault(); handleInitiateSubmit('save'); }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Guest Info & Stay Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 1: Guest Information */}
            <div className="pro-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <User size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Guest Profile</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Manual Booking / Ref ID <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Hash size={15} className="input-icon" />
                    <input
                      type="text"
                      className="form-input icon-padded"
                      placeholder="e.g. BK-2026-001"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Guest Full Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <User size={15} className="input-icon" />
                    <input
                      type="text"
                      className="form-input icon-padded"
                      placeholder="e.g. John Doe"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Phone Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Phone size={15} className="input-icon" />
                    <input
                      type="tel"
                      className="form-input icon-padded"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Requirement 3: Guest email is NOT mandatory */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Guest Email ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Mail size={15} className="input-icon" />
                    <input
                      type="email"
                      className="form-input icon-padded"
                      placeholder="e.g. guest@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Guest Counts Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Adults (12+ yrs)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    value={adults}
                    onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Children</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="form-input"
                    value={children}
                    onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Stay Schedule & Room Suite */}
            <div className="pro-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <Calendar size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Stay Duration &amp; Suite</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px', gap: '14px', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Check-In Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Check-Out Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkOut}
                    min={checkIn}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                  />
                </div>

                <div style={{ height: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Calculated Duration</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                    {nights} {nights === 1 ? 'Night' : 'Nights'}
                  </span>
                </div>
              </div>


              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Reservation Channel</label>
                  <select
                    className="form-input"
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value)}
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Online Reservation">Online Reservation</option>
                    <option value="Corporate Booking">Corporate Booking</option>
                    <option value="Phone Call">Direct Phone Call</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Select Room Suite</label>
                  <select
                    className="form-input"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  >
                    <option value="">Auto-Assign Best Room</option>
                    {availableRooms.map(r => (
                      <option key={r} value={r}>Room {r} (Available)</option>
                    ))}
                    {occupiedRooms.map(r => (
                      <option key={r} value={r} disabled>Room {r} (Occupied)</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Card 3: Unified Multi-Document Upload Section (Requirements 3 & 5) */}
            <div className="pro-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IdCard size={18} color="#d97706" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Guest Identity Vault</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Unified multi-document upload section (Max 5 allowed)
                    </span>
                  </div>
                </div>

                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  background: documents.length >= 5 ? '#fef2f2' : '#f0fdf4',
                  color: documents.length >= 5 ? '#dc2626' : '#16a34a',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: `1px solid ${documents.length >= 5 ? '#fecaca' : '#bbf7d0'}`
                }}>
                  {documents.length} / 5 Attached
                </span>
              </div>

              {/* Master Unified Dropzone: accepts multiple files at once */}
              {documents.length < 5 && (
                <div 
                  style={{
                    border: '2px dashed #93c5fd',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '18px 12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '16px'
                  }}
                  onClick={() => document.getElementById('unified-multi-doc-input')?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#f8fafc'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.background = '#f8fafc';
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleMultipleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                >
                  <Upload size={24} color="#2563eb" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    Click or Drag &amp; Drop to Add Documents
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Select single or multiple files (PDF, PNG, JPG) • Up to {5 - (documents.length === 1 && !documents[0].dataUrl && !documents[0].number && !documents[0].fileName ? 0 : documents.length)} more
                  </div>
                  <input
                    type="file"
                    id="unified-multi-doc-input"
                    multiple
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleMultipleFilesSelected(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              )}

              {/* List of Attached Documents in this same section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {documents.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Thumbnail / File Icon */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1'
                    }}>
                      {(doc.docId || (doc.dataUrl && doc.dataUrl.startsWith('data:image'))) && !(doc.fileName || '').toLowerCase().endsWith('.pdf') ? (
                        <StoredDocumentImage doc={doc} alt="doc" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FileText size={20} color="#475569" />
                      )}
                    </div>

                    {/* Document details: Type (Mandatory) & Number */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '10px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px', fontWeight: 700, margin: '0 0 2px' }}>
                          Doc Type <span style={{ color: '#dc2626' }}>* (Mandatory)</span>
                        </label>
                        <select
                          className="form-input"
                          value={doc.type}
                          onChange={(e) => handleUpdateDocument(idx, 'type', e.target.value)}
                          style={{ fontSize: '12px', padding: '5px 8px', height: '32px' }}
                          required
                        >
                          {DOC_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px', fontWeight: 700, margin: '0 0 2px' }}>
                          Doc / ID Number
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 1234 5678 9012"
                          value={doc.number || ''}
                          onChange={(e) => handleUpdateDocument(idx, 'number', e.target.value)}
                          style={{ fontSize: '12px', padding: '5px 8px', height: '32px' }}
                        />
                      </div>
                    </div>

                    {/* File Attachment Name / Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right', maxWidth: '120px', overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.fileName || 'No file attached'}
                        </div>
                        {doc.fileSize && (
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{doc.fileSize}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="icon-btn"
                        style={{ color: '#dc2626', padding: '6px' }}
                        onClick={() => handleRemoveDocumentSection(idx)}
                        title="Remove Document"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* If fewer than 5 documents, also provide a manual entry slot option */}
                {documents.length < 5 && (
                  <button
                    type="button"
                    className="btn-sub"
                    style={{ 
                      alignSelf: 'flex-start', 
                      fontSize: '11px', 
                      padding: '4px 10px', 
                      gap: '4px',
                      marginTop: '4px'
                    }}
                    onClick={handleAddDocumentSection}
                  >
                    <Plus size={12} /> Add Document Entry Manually
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Billing, 6 Payment Options & Dynamic Calculations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 4: Tariff & 6 Payment Options (Requirements 6, 8, 9, 10, 14) */}
            <div className="pro-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="#4f46e5" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Payment &amp; Settlement</h3>
                </div>

                <button
                  type="button"
                  className="btn-sub"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => {
                    const rate = Math.max(1, nights) * 1500;
                    setTotalAmount(rate);
                  }}
                >
                  Auto-Recalculate
                </button>
              </div>

              {/* Total Room Tariff */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Total Room Tariff (₹) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className="input-icon-wrapper">
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    className="form-input icon-padded"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    required
                  />
                </div>
              </div>

              {/* Requirement 6: 6 Payment Options */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px' }}>
                  Payment Option (6 Options)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {PAYMENT_OPTIONS.map(opt => {
                    const isSelected = paymentOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentOption(opt.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid',
                          borderColor: isSelected ? '#4f46e5' : '#cbd5e1',
                          background: isSelected ? '#eef2ff' : '#ffffff',
                          color: isSelected ? '#3730a3' : 'var(--text-main)',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={14} color="#4f46e5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Partial Payment Breakdown (Requirement 10) */}
              {paymentOption === 'Partially paid' && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', marginBottom: '10px' }}>
                    Partial Payment Dynamic Breakdown
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#78350f' }}>
                        Amount Paid Now (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={totalAmount}
                        className="form-input"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Math.min(totalAmount, Math.max(0, parseFloat(e.target.value) || 0)))}
                        style={{ fontSize: '13px', padding: '7px 10px', background: '#ffffff' }}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#78350f' }}>
                        Balance Due (₹)
                      </label>
                      <div style={{
                        padding: '7px 10px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#b45309',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {formatCurrency(balanceDue)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px' }}>
                    * Guest must clear the balance of {formatCurrency(balanceDue)} before checkout is permitted.
                  </div>
                </div>
              )}

              {/* Payment Channel Selector (Requirement 8, 9) */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Payment Channel / Settlement Mode
                </label>
                <select
                  className="form-input"
                  value={paidVia}
                  onChange={(e) => setPaidVia(e.target.value)}
                  disabled={paymentOption !== 'Partially paid'}
                  style={{
                    fontSize: '13px',
                    background: paymentOption !== 'Partially paid' ? '#f1f5f9' : '#ffffff',
                    cursor: paymentOption !== 'Partially paid' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {PAYMENT_CHANNELS.map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {paymentOption === 'Pre paid' ? 'Auto-routed to "Online Payment".' : 
                   paymentOption === 'Cash' ? 'Auto-routed to "Cash".' :
                   paymentOption === 'Unpaid' ? 'Auto-routed to "Pending".' :
                   'Exposed all payment channels for partial transaction settlement.'}
                </div>
              </div>

              {/* Requirement 14: Txn ID / UTR Mandatory ONLY for UPI */}
              {(paymentOption === 'UPI (owner upi)' || paymentOption === 'Other UPI' || paidVia.toLowerCase().includes('upi')) && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Transaction ID / UTR Reference <span style={{ color: '#dc2626' }}>* (Mandatory for UPI)</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Hash size={15} className="input-icon" color="#2563eb" />
                    <input
                      type="text"
                      className="form-input icon-padded"
                      placeholder="e.g. UPI Ref / 12-digit UTR No"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Front Desk Notes (Optional)</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Special guest requests, airport pickup, early arrival notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Settlement Summary Pill */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status at Creation</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: paymentOption === 'Unpaid' ? '#dc2626' : '#047857' }}>
                    {paymentOption === 'Unpaid' ? 'Unpaid (Blocked Checkout)' : paymentOption === 'Partially paid' ? 'Partially Paid' : 'Guaranteed Paid'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Amount Settled Now</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(paymentOption === 'Unpaid' ? 0 : (paymentOption === 'Partially paid' ? amountPaid : totalAmount))}
                  </div>
                </div>
              </div>
            </div>

            {/* Center-Aligned Action Buttons (Requirement 12) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '20px',
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={16} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>Final Submission Actions</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Review details and create the booking.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', width: '100%' }}>
                <button
                  type="button"
                  className="btn-sub"
                  onClick={() => handleInitiateSubmit('draft')}
                  disabled={submitting || !isRegisterOpen}
                  style={{ padding: '10px 22px', fontSize: '13px', fontWeight: 700 }}
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  className="btn-main"
                  onClick={() => handleInitiateSubmit('save')}
                  disabled={submitting || !isRegisterOpen}
                  style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 800, background: '#16a34a' }}
                >
                  Create Booking
                </button>
              </div>

              {!isRegisterOpen && (
                <div style={{ fontSize: '11px', color: '#dc2626', textAlign: 'center' }}>
                  * Shift register is closed. Please open shift register to record stay bookings.
                </div>
              )}
            </div>

          </div>
        </div>
      </form>

      {/* Booking Summary Confirmation Sheet Modal (Requirement 15) */}
      {showSummaryModal && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div 
            className="modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '520px', background: '#ffffff', padding: '24px' }}
          >
            <div className="modal-header-row" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#4f46e5" />
                <h2 className="modal-heading" style={{ fontSize: '17px', margin: 0 }}>
                  Pre-Submission Booking Summary
                </h2>
              </div>
              <button className="icon-btn" onClick={() => setShowSummaryModal(false)}><X size={18} /></button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Guest Name:</span>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{guestName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Contact Phone:</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{phone}</span>
              </div>

              {email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Email ID:</span>
                  <span style={{ fontSize: '12px' }}>{email}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Stay Duration:</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{checkIn} to {checkOut} ({nights} {nights === 1 ? 'Night' : 'Nights'})</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assigned Suite:</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                  {room ? `Room ${room}` : 'Auto-assigned upon check-in'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID Documents:</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
                  {documents.length} Document(s) Attached ({documents.map(d => d.type).join(', ')})
                </span>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Payment Option:</span>
                  <strong style={{ fontSize: '12px' }}>{paymentOption}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Channel Mode:</span>
                  <span style={{ fontSize: '12px' }}>{paidVia}</span>
                </div>

                {txnId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Txn / UTR Ref:</span>
                    <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>{txnId}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Total Tariff:</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#047857' }}>Amount Paid Now:</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#047857', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(paymentOption === 'Unpaid' ? 0 : (paymentOption === 'Partially paid' ? amountPaid : totalAmount))}
                  </span>
                </div>

                {balanceDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700 }}>Balance Due at Checkout:</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-sub"
                onClick={() => setShowSummaryModal(false)}
                disabled={submitting}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="btn-main"
                onClick={handleFinalSubmit}
                disabled={submitting}
                style={{ background: '#16a34a' }}
              >
                {submitting ? 'Creating Booking...' : (pendingActionType === 'draft' ? 'Confirm & Save Draft' : 'Confirm & Create Booking')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
