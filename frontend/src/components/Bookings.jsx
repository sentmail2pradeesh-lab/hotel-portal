import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate, confirmDouble, calculateNights, getAutoStayStatus } from '../utils/formatters';
import { IDCardViewerModal } from './IDCardViewerModal';
import { EarlyCheckoutModal } from './EarlyCheckoutModal';
import { BillInvoiceModal } from './BillInvoiceModal';
import { GenerateBillModal } from './GenerateBillModal';
import { AllotRoomModal } from './AllotRoomModal';
import { ImportBookingsModal } from './ImportBookingsModal';
import { 
  Plus, Search, Trash2, Edit2, CheckCircle2, BedDouble, PhoneCall, 
  Clock, LogIn, LogOut, FileText, UserCheck, Mail, EyeOff, Calendar, Filter,
  Users, ShieldCheck, AlertCircle, UploadCloud
} from 'lucide-react';

export const Bookings = () => {
  const { 
    bookings, 
    roomsList,
    deleteBooking, 
    checkInBooking, 
    checkOutBooking, 
    earlyCheckOutBooking,
    addBill,
    currentUser,
    isRegisterOpen,
    openNewBookingModal,
    isSuperAdmin,
    isAdmin
  } = useHotel();
  
  const [activeTab, setActiveTab] = useState('in-house'); // 'in-house' | 'upcoming' | 'completed' | 'hidden' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIDBooking, setSelectedIDBooking] = useState(null);
  const [earlyCheckoutBooking, setEarlyCheckoutBooking] = useState(null);
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState(null);
  const [generatingBillBooking, setGeneratingBillBooking] = useState(null);
  const [allottingBooking, setAllottingBooking] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Auto-calculated dynamic statuses for all bookings
  const bookingsWithAutoStatus = bookings.map(b => {
    const computed = getAutoStayStatus(b.checkIn, b.checkOut, b.status);
    return { ...b, computedStatus: computed };
  });

  // Section Groupings (Mutually exclusive: each non-hidden booking appears in exactly one category)
  const inHouseStays = bookingsWithAutoStatus.filter(
    b => !b.isHidden && b.computedStatus === 'In-House'
  );
  const upcomingStays = bookingsWithAutoStatus.filter(
    b => !b.isHidden && b.computedStatus === 'Upcoming'
  );
  const completedStays = bookingsWithAutoStatus.filter(
    b => !b.isHidden && b.computedStatus === 'Completed'
  );
  const hiddenBookings = bookingsWithAutoStatus.filter(
    b => b.isHidden
  );

  const handleEdit = (booking) => {
    openNewBookingModal(booking);
  };

  const handleDelete = (id, name) => {
    if (confirmDouble(
      `Are you sure you want to delete stay record for ${name}?`,
      `PERMANENT DELETION: Delete booking record ${id}? This cannot be undone.`
    )) {
      deleteBooking(id);
    }
  };

  const handleCheckoutClick = (booking) => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open shift register to perform check-out.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (booking.checkOut && booking.checkOut > today) {
      setEarlyCheckoutBooking(booking);
    } else {
      if (confirmDouble(
        `Check out guest "${booking.guestName}" from Room ${booking.room}?`,
        `CONFIRM CHECK-OUT: Are you sure you want to complete check-out for Room ${booking.room}?`
      )) {
        checkOutBooking(booking.id);
      }
    }
  };

  const handleGenerateBillForBooking = (b) => {
    if (b.isHidden) {
      alert('Bills cannot be generated for hidden bookings.');
      return;
    }
    setGeneratingBillBooking(b);
  };

  // Filter helper for search query
  const filterBySearch = (list) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    const propCode = (currentUser?.propertyCode || '').toLowerCase();
    return list.filter(b => 
      (b.guestName && b.guestName.toLowerCase().includes(term)) ||
      (b.phone && b.phone.toLowerCase().includes(term)) ||
      (b.email && b.email.toLowerCase().includes(term)) ||
      (b.id && b.id.toLowerCase().includes(term)) ||
      (b.manualId && b.manualId.toLowerCase().includes(term)) ||
      (b.room && String(b.room).toLowerCase().includes(term)) ||
      (propCode && propCode.includes(term))
    );
  };

  const allCount = bookings.filter(b => !b.isHidden).length;
  const inHouseCount = inHouseStays.length;
  const upcomingCount = upcomingStays.length;
  const completedCount = completedStays.length;
  const hiddenCount = hiddenBookings.length;

  const renderBookingGroup = (title, list) => {
    const filteredList = filterBySearch(list);
    if (filteredList.length === 0 && searchTerm) return null;
    if (list.length === 0) return null;

    const totalNights = filteredList.reduce((sum, b) => sum + calculateNights(b.checkIn, b.checkOut), 0);

    return (
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid #d97706',
          marginBottom: '12px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            {title} ({filteredList.length})
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Booked room nights: <strong>{totalNights}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredList.map((b) => {
            const isUpcoming = b.computedStatus === 'Upcoming';
            const isInHouse = b.computedStatus === 'In-House';
            const isCompleted = b.computedStatus === 'Completed';
            const nights = calculateNights(b.checkIn, b.checkOut);

            return (
              <div 
                key={b.id} 
                className="card-container"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderLeft: b.isHidden ? '4px solid #f59e0b' : isInHouse ? '4px solid #10b981' : isCompleted ? '4px solid #a855f7' : '4px solid #0284c7',
                  background: b.isHidden ? '#fffbeb' : '#ffffff'
                }}
              >
                {/* Guest Info */}
                <div style={{ flex: '1.2', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {b.guestName}
                    </h4>
                    <span className="badge-guest-count">
                      <Users size={11} /> {b.guestCount || (b.adults || 1) + (b.children || 0)} Guests
                    </span>
                    {b.isGuaranteed || b.isPrepaid || b.bookingType === 'Online Pre-paid' ? (
                      <span className="badge-guaranteed-shield" title="100% Guaranteed Pre-paid reservation. Room is protected from walk-ins.">
                        <ShieldCheck size={11} /> GUARANTEED
                      </span>
                    ) : (!b.room ? (
                      <span className="badge-tentative-clock" title="Tentative unconfirmed inquiry. Room to be allotted on arrival.">
                        <Clock size={11} /> TENTATIVE
                      </span>
                    ) : null)}
                    {b.isHidden && (
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                        HIDDEN BOOKING
                      </span>
                    )}
                    {isInHouse && b.checkOut && b.checkOut.split('T')[0] === todayStr && (
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> CHECKOUT DUE TODAY
                      </span>
                    )}
                    {isCompleted && b.checkOut && b.checkOut.split('T')[0] < todayStr && b.status !== 'Checked-Out' && (
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={10} /> AUTO-COMPLETED (EXPIRED)
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="mono" style={{ fontWeight: 600, color: '#475569' }}>#{b.manualId || b.id}</span>
                    <span style={{ color: '#cbd5e1' }}>&bull;</span>
                    <span className="mono" style={{ color: '#0284c7', fontWeight: 700 }}>ASZ ID: {b.id}</span>
                  </div>

                  {/* Contact Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {b.phone && (
                      <a href={`tel:${b.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                        <PhoneCall size={12} /> {b.phone}
                      </a>
                    )}
                    {b.email && (
                      <a href={`mailto:${b.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                        <Mail size={12} /> {b.email}
                      </a>
                    )}
                  </div>
                </div>

                {/* Middle Info: Duration & Room Suite */}
                <div style={{ flex: '1.2', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                    {currentUser?.propertyCode && (
                      <span style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        border: '1px solid #cbd5e1',
                        whiteSpace: 'nowrap'
                      }}>
                        {currentUser.propertyCode}
                      </span>
                    )}
                    {(() => {
                      const isRoomInInventory = b.room && roomsList && roomsList.includes(b.room);
                      if (isRoomInInventory) {
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span className="badge-room-assigned">
                              <BedDouble size={13} /> Room {b.room}
                            </span>
                            {/* Room cannot be changed after checkin; only before arrival */}
                            {isUpcoming && (
                              <button 
                                className="btn-change-room"
                                onClick={() => setAllottingBooking(b)}
                                title="Change or re-assign room suite prior to check-in"
                              >
                                Change
                              </button>
                            )}
                          </div>
                        );
                      } else if (b.room && !isRoomInInventory) {
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span className="badge-room-invalid" title="This room does not exist in property inventory">
                              <AlertCircle size={12} /> Invalid ({b.room})
                            </span>
                            {isUpcoming && (
                              <button 
                                className="btn-change-room"
                                onClick={() => setAllottingBooking(b)}
                                title="Allot a valid physical room suite"
                              >
                                Allot
                              </button>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <span className="badge-room-unassigned" title="Physical room will be assigned on arrival or check-in">
                            <Clock size={12} /> Awaiting Allotment
                          </span>
                        );
                      }
                    })()}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <Calendar size={13} color="#94a3b8" />
                    <span><strong>{nights} {nights === 1 ? 'Night' : 'Nights'}</strong> ({formatDate(b.checkIn)} - {formatDate(b.checkOut)})</span>
                  </div>
                </div>

                {/* Amount & Payment Info */}
                <div style={{ minWidth: '135px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }} className="mono">
                      {formatCurrency(b.amountPaid)}
                    </span>
                    {(() => {
                      const isFullyPaid = b.paymentStatus === 'Fully Paid' || b.isPrepaid || b.bookingType === 'Online Pre-paid' || (b.amountPaid > 0 && b.paidVia !== 'Pending' && (!b.totalAmount || b.amountPaid >= b.totalAmount));
                      const isUnpaid = b.paymentStatus === 'Unpaid' || b.paidVia === 'Pending' || b.amountPaid === 0;
                      if (isFullyPaid) {
                        return (
                          <span className="badge-pay-status fully-paid" title="100% Fully Paid">
                            <CheckCircle2 size={10} /> Fully Paid
                          </span>
                        );
                      }
                      if (isUnpaid) {
                        return (
                          <span className="badge-pay-status unpaid" title="Payment Pending / Unpaid">
                            <AlertCircle size={10} /> Unpaid
                          </span>
                        );
                      }
                      return (
                        <span className="badge-pay-status partial" title="Advance Paid, Balance Pending">
                          <Clock size={10} /> Partial
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                    Paid via {b.paidVia || 'Cash'}
                  </div>
                  {b.txnId && (
                    <div style={{ fontSize: '10px', color: '#0284c7', fontFamily: 'var(--font-mono)', marginTop: '2px', fontWeight: 700 }} title={`Txn Reference: ${b.txnId}`}>
                      Txn: {b.txnId}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div style={{ minWidth: '95px', whiteSpace: 'nowrap' }}>
                  {isUpcoming && (
                    <span className="status-pill upcoming">
                      <Clock size={11} /> UPCOMING
                    </span>
                  )}
                  {isInHouse && (
                    <span className="status-pill in-house">
                      <LogIn size={11} /> IN-HOUSE
                    </span>
                  )}
                  {isCompleted && (
                    <span className="status-pill completed">
                      <LogOut size={11} /> COMPLETED
                    </span>
                  )}
                </div>

                {/* ID Document & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {b.idCard ? (
                    <button 
                      className="id-status-badge has-id"
                      onClick={() => setSelectedIDBooking(b)}
                      title="View ID Card"
                    >
                      <CheckCircle2 size={12} /> {b.idCardType ? b.idCardType.split(' ')[0] : 'ID'} Scan
                    </button>
                  ) : (
                    <button 
                      className="id-status-badge no-id"
                      disabled={!isRegisterOpen}
                      onClick={() => handleEdit(b)}
                      title="Upload Guest Document"
                    >
                      + Upload ID
                    </button>
                  )}

                  {/* Primary Action Buttons */}
                  {isUpcoming && !b.isHidden && (
                    (!b.room || (roomsList && !roomsList.includes(b.room))) ? (
                      <button
                        className="btn-action-allot"
                        disabled={!isRegisterOpen}
                        onClick={() => setAllottingBooking(b)}
                        title="Allot Room Suite & Check-In"
                      >
                        <BedDouble size={13} /> Allot & Check-In
                      </button>
                    ) : (
                      <button
                        className="btn-action-checkin"
                        disabled={!isRegisterOpen}
                        onClick={() => checkInBooking(b.id)}
                        title="Check-In Guest"
                      >
                        <LogIn size={13} /> Check-In
                      </button>
                    )
                  )}

                  {/* Check-Out Button: Strictly ONLY for In-House guests (NOT upcoming) */}
                  {isInHouse && !b.isHidden && (
                    <button
                      className="btn-action-checkout"
                      disabled={!isRegisterOpen}
                      onClick={() => handleCheckoutClick(b)}
                      title="Check-Out Guest"
                    >
                      <LogOut size={13} /> Check-Out
                    </button>
                  )}

                  {/* Generate Bill Button (For In-House & Completed, Non-Hidden) */}
                  {(isInHouse || isCompleted) && !b.isHidden && (
                    <button
                      className="btn-sub"
                      style={{ padding: '6px 10px', fontSize: '11px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff', whiteSpace: 'nowrap' }}
                      onClick={() => handleGenerateBillForBooking(b)}
                      title="Generate Official Guest Bill Receipt"
                    >
                      <FileText size={13} /> Bill
                    </button>
                  )}

                  {/* Edit & Delete Action Buttons (Super Admin / Admin) */}
                  {!isCompleted && (isSuperAdmin || isAdmin) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button 
                        className="icon-btn"
                        disabled={!isRegisterOpen}
                        onClick={() => handleEdit(b)}
                        title="Edit Stay Details"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button 
                        className="icon-btn"
                        style={{ color: '#e11d48' }}
                        disabled={!isRegisterOpen}
                        onClick={() => handleDelete(b.id, b.guestName)}
                        title="Delete Stay Record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bookings-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Property Booking & Stay History</h1>
          <p className="page-subheading">Manage upcoming arrivals, active in-house guests, and completed stay logs for this property.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {(isSuperAdmin || isAdmin) && (
            <button 
              className="btn-sub"
              disabled={!isRegisterOpen}
              onClick={() => {
                if (!isRegisterOpen) {
                  alert('Shift Register is Closed. Please open shift register to import external bookings.');
                  return;
                }
                setIsImportModalOpen(true);
              }}
              style={{ padding: '9px 14px', fontSize: '13px', gap: '6px' }}
              title={isRegisterOpen ? 'Import bookings from OYO or CSV file' : 'Shift Register is Closed (View-Only Mode)'}
            >
              <UploadCloud size={16} color="#0284c7" /> Import OYO / CSV
            </button>
          )}
          <button 
            className="btn-main"
            disabled={!isRegisterOpen}
            onClick={() => openNewBookingModal()}
            title={isRegisterOpen ? 'New Booking' : 'Shift Register is Closed (View-Only Mode)'}
          >
            <Plus size={17} /> New Booking
          </button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '18px' }}>
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Active In-House Stays</span>
            <div className="metric-icon-badge emerald">
              <LogIn size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value" style={{ color: '#047857' }}>{inHouseCount}</span>
            <span className="metric-tag-sub">Suites</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot emerald" />
            <span>Guests actively lodged on premises</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Upcoming Arrivals</span>
            <div className="metric-icon-badge blue">
              <Clock size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{upcomingCount}</span>
            <span className="metric-tag-sub">Bookings</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot blue" />
            <span>Confirmed arrivals & reservations</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Total Reservations</span>
            <div className="metric-icon-badge amber">
              <UserCheck size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{allCount}</span>
            <span className="metric-tag-sub">Records</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot amber" />
            <span>All active property stay records</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="booking-tabs-container">
          <button 
            className={`booking-tab-btn in-house ${activeTab === 'in-house' ? 'active' : ''}`}
            onClick={() => setActiveTab('in-house')}
          >
            <LogIn size={15} /> In-House Stays
            <span className="tab-badge-count">{inHouseCount}</span>
          </button>
          <button 
            className={`booking-tab-btn upcoming ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <Clock size={15} /> Upcoming Stays
            <span className="tab-badge-count">{upcomingCount}</span>
          </button>
          <button 
            className={`booking-tab-btn completed ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <LogOut size={15} /> Completed History
            <span className="tab-badge-count">{completedCount}</span>
          </button>
          {hiddenCount > 0 && currentUser?.role === 'Overall Admin' && (
            <button 
              className={`booking-tab-btn ${activeTab === 'hidden' ? 'active' : ''}`}
              onClick={() => setActiveTab('hidden')}
              style={{ color: '#b45309' }}
            >
              <EyeOff size={15} /> Hidden Bookings
              <span className="tab-badge-count" style={{ background: '#fef3c7', color: '#b45309' }}>{hiddenCount}</span>
            </button>
          )}
          <button 
            className={`booking-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <UserCheck size={15} /> All Bookings
            <span className="tab-badge-count">{allCount}</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filter Toolbar */}
      <div className="toolbar-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '260px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by guest name, email, phone, ASZ ID, manual ref, or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={14} color="#d97706" /> Filter by Status:
          </span>
          <select
            className="form-select"
            style={{ padding: '8px 12px', fontSize: '13px', minWidth: '170px', height: '40px' }}
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="in-house">In-House Stays ({inHouseCount})</option>
            <option value="upcoming">Upcoming Reservations ({upcomingCount})</option>
            <option value="completed">Completed History ({completedCount})</option>
            {hiddenCount > 0 && currentUser?.role === 'Overall Admin' && (
              <option value="hidden">Hidden Bookings ({hiddenCount})</option>
            )}
            <option value="all">All Bookings ({allCount})</option>
          </select>
        </div>
      </div>

      {/* Grouped Bookings Content */}
      <div className="card-container" style={{ padding: '20px', background: 'transparent', boxShadow: 'none', border: 'none' }}>
        {bookings.length === 0 ? (
          <div className="card-container" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <BedDouble size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Stay Records Registered Yet</h3>
          </div>
        ) : (
          <>
            {(activeTab === 'all' || activeTab === 'in-house') && renderBookingGroup('Active In-House Stays', inHouseStays)}
            {activeTab === 'in-house' && inHouseStays.length === 0 && (
              <div className="card-container" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                <LogIn size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', margin: '0 0 4px 0' }}>No In-House Guests Currently</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Check in guests from Upcoming Stays or click New Booking to register a walk-in.</p>
              </div>
            )}
            {(activeTab === 'all' || activeTab === 'upcoming') && renderBookingGroup('Upcoming Stays & Reservations', upcomingStays)}
            {activeTab === 'upcoming' && upcomingStays.length === 0 && (
              <div className="card-container" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                <Clock size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', margin: '0 0 4px 0' }}>No Upcoming Reservations</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Future bookings will appear here.</p>
              </div>
            )}
            {(activeTab === 'all' || activeTab === 'completed') && renderBookingGroup('Completed Stay History', completedStays)}
            {activeTab === 'completed' && completedStays.length === 0 && (
              <div className="card-container" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                <LogOut size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', margin: '0 0 4px 0' }}>No Completed Stays Yet</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Checked-out guests will be listed in this history log.</p>
              </div>
            )}
            {(activeTab === 'all' || activeTab === 'hidden') && currentUser?.role === 'Overall Admin' && renderBookingGroup('Hidden Bookings / Early Released Slots', hiddenBookings)}
          </>
        )}
      </div>

      {/* Modals */}
      {selectedIDBooking && (
        <IDCardViewerModal
          booking={selectedIDBooking}
          onClose={() => setSelectedIDBooking(null)}
        />
      )}

      {earlyCheckoutBooking && (
        <EarlyCheckoutModal
          isOpen={Boolean(earlyCheckoutBooking)}
          booking={earlyCheckoutBooking}
          onClose={() => setEarlyCheckoutBooking(null)}
          onConfirm={(bookingId, createHiddenSlot) => {
            earlyCheckOutBooking(bookingId, createHiddenSlot);
            setEarlyCheckoutBooking(null);
          }}
        />
      )}

      {generatingBillBooking && (
        <GenerateBillModal
          booking={generatingBillBooking}
          onClose={() => setGeneratingBillBooking(null)}
          onGenerate={async (billPayload) => {
            setGeneratingBillBooking(null);
            if (addBill) {
              await addBill(billPayload);
            }
            setSelectedBillForInvoice(billPayload);
          }}
        />
      )}

      {selectedBillForInvoice && (
        <BillInvoiceModal
          bill={selectedBillForInvoice}
          onClose={() => setSelectedBillForInvoice(null)}
        />
      )}

      {allottingBooking && (
        <AllotRoomModal
          booking={allottingBooking}
          isOpen={Boolean(allottingBooking)}
          onClose={() => setAllottingBooking(null)}
        />
      )}

      {isImportModalOpen && (
        <ImportBookingsModal
          onClose={() => setIsImportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Bookings;
