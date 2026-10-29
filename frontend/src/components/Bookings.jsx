import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { computeMonthBreakdown } from '../utils/paymentBreakdown';
import { PaymentBreakdownBar } from './PaymentBreakdownBar';
import { useHotel } from '../context/HotelContext';
import { localDateStr, formatCurrency, formatDate, confirmDouble, calculateNights, getAutoStayStatus } from '../utils/formatters';
import { IDCardViewerModal } from './IDCardViewerModal';
import { EarlyCheckoutModal } from './EarlyCheckoutModal';
import { BillInvoiceModal } from './BillInvoiceModal';
import { hasIdScan } from '../utils/storedDocuments';
import { GenerateBillModal } from './GenerateBillModal';
import { AllotRoomModal } from './AllotRoomModal';
import { ImportBookingsModal } from './ImportBookingsModal';
import {
  Plus, Search, Trash2, Edit2, CheckCircle2, BedDouble, PhoneCall,
  Clock, LogIn, LogOut, FileText, UserCheck, Mail, EyeOff, Calendar, Filter,
  Users, ShieldCheck, AlertCircle, UploadCloud, X
} from 'lucide-react';
import { PageHeaderActions } from './PageHeaderActions';
import { PropertyTabs } from './PropertyTabs';
import { ConfidentialBookingsTable } from './ConfidentialBookingsTable';

// Settlement channel -> payment option stored on the booking (matches the breakdown categories)
const SETTLE_PAYMENT_OPTION = {
  'Cash': 'Cash',
  'UPI (Owner UPI)': 'UPI (owner upi)',
  'Other UPI': 'Other UPI'
};

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
    activePropertyId,
    propertiesList,
    navigateToCreateBooking,
    updateBooking,
    isSuperAdmin,
    isAdmin
  } = useHotel();

  // "All Properties" view: read-only list of every property's bookings (admin accounts only)
  const [viewAll, setViewAll] = useState(false);
  const [allPropBookings, setAllPropBookings] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Set when a booking was just saved; used once, then the page starts on In-House as usual
    const start = sessionStorage.getItem('bookingsStartTab');
    sessionStorage.removeItem('bookingsStartTab');
    return start || 'in-house';
  }); // 'in-house' | 'upcoming' | 'drafts' | 'completed' | 'hidden' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIDBooking, setSelectedIDBooking] = useState(null);
  const [earlyCheckoutBooking, setEarlyCheckoutBooking] = useState(null);
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState(null);
  const [generatingBillBooking, setGeneratingBillBooking] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [allottingBooking, setAllottingBooking] = useState(null);
  const todayStr = localDateStr();
  const activeCode = (propertiesList || []).find(p => p.firmId === activePropertyId)?.propertyCode || currentUser?.propertyCode;

  // Settle Outstanding Balance Before Checkout State (Requirements 7 & 11)
  const [settleCheckoutBooking, setSettleCheckoutBooking] = useState(null);
  const [settleChannel, setSettleChannel] = useState('Cash');
  const [settleTxnId, setSettleTxnId] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  useEffect(() => {
    if (!viewAll) return;
    let cancelled = false;
    api.getAllPropertyBookings()
      .then((data) => { if (!cancelled) setAllPropBookings(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setAllPropBookings([]); });
    return () => { cancelled = true; };
  }, [viewAll]);

  const sourceBookings = viewAll ? allPropBookings : bookings;

  // Auto-calculated dynamic statuses for all bookings
  const bookingsWithAutoStatus = sourceBookings.map(b => {
    const computed = getAutoStayStatus(b.checkIn, b.checkOut, b.status, 120, b.confirmedAt);
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
  const archivedStays = bookingsWithAutoStatus.filter(
    b => !b.isHidden && (b.computedStatus === 'Archived' || b.status === 'Archived')
  );
  const draftStays = bookingsWithAutoStatus.filter(
    b => !b.isHidden && b.computedStatus === 'Draft'
  );
  const hiddenBookings = bookingsWithAutoStatus.filter(
    b => b.isHidden
  );

  const handleEdit = (booking) => {
    // Drafts open in the full registration console so every saved document and the draft actions are available
    if (booking.status === 'Draft') {
      // The list shows the active property's bookings, so the draft belongs to that property
      navigateToCreateBooking({ ...booking, firmId: activePropertyId });
      return;
    }
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

    // Requirements 7 & 11: Block checkout if full amount is not paid!
    const total = parseFloat(booking.totalAmount) || parseFloat(booking.amountPaid) || 0;
    const paid = parseFloat(booking.amountPaid) || 0;
    const balanceDue = Math.max(0, total - paid);

    if (booking.paidVia === 'Pending' || booking.paymentOption === 'Unpaid' || balanceDue > 0) {
      setSettleCheckoutBooking({
        ...booking,
        total,
        paid,
        balanceDue
      });
      setSettleChannel('Cash');
      setSettleTxnId('');
      setSettleError('');
      return;
    }

    const today = localDateStr();
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

  const handleSettleAndCheckout = async () => {
    if (!settleCheckoutBooking) return;
    const isUpi = settleChannel.toLowerCase().includes('upi');
    if (isUpi && !settleTxnId.trim()) {
      setSettleError('Transaction ID / UTR is mandatory for UPI payment.');
      return;
    }

    setSettleLoading(true);
    setSettleError('');

    try {
      // Update booking to fully paid
      await updateBooking(settleCheckoutBooking.id, {
        ...settleCheckoutBooking,
        amountPaid: settleCheckoutBooking.total,
        balanceDue: 0,
        // The balance is recorded under the channel it was collected through, so the breakdown counts it there
        paymentOption: SETTLE_PAYMENT_OPTION[settleChannel] || 'Cash',
        paidVia: settleChannel,
        paymentStatus: null, // let the backend recalculate from the amounts
        txnId: settleTxnId.trim() || settleCheckoutBooking.txnId || null
      });

      setSettleLoading(false);
      const bId = settleCheckoutBooking.id;
      setSettleCheckoutBooking(null);
      checkOutBooking(bId);
    } catch (err) {
      setSettleLoading(false);
      setSettleError(err.message || 'Failed to settle payment.');
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
    const propCode = (activeCode || '').toLowerCase();
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

  const allCount = sourceBookings.filter(b => !b.isHidden).length;
  const inHouseCount = inHouseStays.length;
  const upcomingCount = upcomingStays.length;
  const completedCount = completedStays.length;
  const hiddenCount = hiddenBookings.length;
  const draftCount = draftStays.length;

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
            // Archived (no check-in) stays can still be checked in until their checkout date passes
            const canCheckIn = isUpcoming || (b.computedStatus === 'Archived' && (b.checkOut || '') >= todayStr);
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
                    {viewAll && <span className="mono" style={{ fontWeight: 700, color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', padding: '1px 6px', borderRadius: '4px' }}>{b.propertyCode || 'Property'}</span>}
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
                    {activeCode && (
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
                        {activeCode}
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
                  {hasIdScan(b) ? (
                    <button
                      className="id-status-badge has-id" style={{ whiteSpace: 'nowrap' }}
                      onClick={() => setSelectedIDBooking(b)}
                      title="View ID Card"
                    >
                      <CheckCircle2 size={12} /> {b.idCardType ? b.idCardType.split(' ')[0] : 'ID'} Scan
                    </button>
                  ) : (
                    <button
                      className="id-status-badge no-id"
                      disabled={!isRegisterOpen || viewAll}
                      onClick={() => handleEdit(b)}
                      title="Upload Guest Document"
                    >
                      + Upload ID
                    </button>
                  )}

                  {/* Primary Action Buttons */}
                  {canCheckIn && !b.isHidden && !viewAll && (
                    (!b.room || (roomsList && !roomsList.includes(b.room))) ? (
                      <button
                        className="btn-action-allot" style={{ whiteSpace: 'nowrap' }}
                        disabled={!isRegisterOpen}
                        onClick={() => setAllottingBooking(b)}
                        title="Allot Room Suite & Check-In"
                      >
                        <BedDouble size={13} /> Allot & Check-In
                      </button>
                    ) : (
                      <button
                        className="btn-action-checkin" style={{ whiteSpace: 'nowrap' }}
                        disabled={!isRegisterOpen}
                        onClick={() => checkInBooking(b.id)}
                        title="Check-In Guest"
                      >
                        <LogIn size={13} /> Check-In
                      </button>
                    )
                  )}

                  {/* Check-Out Button: Strictly ONLY for In-House guests (NOT upcoming) */}
                  {isInHouse && !b.isHidden && !viewAll && (
                    <button
                      className="btn-action-checkout" style={{ whiteSpace: 'nowrap' }}
                      disabled={!isRegisterOpen}
                      onClick={() => handleCheckoutClick(b)}
                      title="Check-Out Guest"
                    >
                      <LogOut size={13} /> Check-Out
                    </button>
                  )}

                  {/* Generate Bill Button (For In-House & Completed, Non-Hidden) */}
                  {(isInHouse || isCompleted) && !b.isHidden && !viewAll && (
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
                  {!isCompleted && !isInHouse && (isSuperAdmin || isAdmin) && !viewAll && (
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
          <h1 className="page-heading">Booking & History</h1>
          <p className="page-subheading">Manage upcoming arrivals, active in-house guests, and completed stay logs for this property.</p>
        </div>
        <PageHeaderActions disableNewBooking={viewAll}>
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
              style={{ height: '44px', padding: '0 14px', fontSize: '13px', gap: '6px' }}
              title={isRegisterOpen ? 'Import bookings from OYO or CSV file' : 'Shift Register is Closed (View-Only Mode)'}
            >
              <UploadCloud size={16} color="#0284c7" /> Import OYO / CSV
            </button>
          )}
        </PageHeaderActions>
      </div>

      <PropertyTabs
        allOption
        isAllSelected={viewAll}
        onSelectAll={() => setViewAll(true)}
        onSelect={() => setViewAll(false)}
      />

      {/* Executive Metric Cards */}
      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '18px' }}>
        <div className="metric-card with-watermark">
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
          <LogIn size={84} className="metric-watermark" style={{ color: '#047857' }} />
          <div className="metric-card-footer">
            <span className="metric-status-dot emerald" />
            <span>Guests actively lodged on premises</span>
          </div>
        </div>

        <div className="metric-card with-watermark">
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
          <Clock size={84} className="metric-watermark" style={{ color: '#2563eb' }} />
          <div className="metric-card-footer">
            <span className="metric-status-dot blue" />
            <span>Confirmed arrivals & reservations</span>
          </div>
        </div>

        <div className="metric-card with-watermark">
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
          <UserCheck size={84} className="metric-watermark" style={{ color: '#d97706' }} />
          <div className="metric-card-footer">
            <span className="metric-status-dot amber" />
            <span>All active property stay records</span>
          </div>
        </div>
      </div>

      {viewAll && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>
          Showing bookings from all properties (read-only). Select a property at the top to check in, check out or edit stays.
        </div>
      )}

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
            className={`booking-tab-btn ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
            style={{ color: '#64748b' }}
          >
            <FileText size={15} /> Drafts
            <span className="tab-badge-count">{draftCount}</span>
          </button>
          <button
            className={`booking-tab-btn completed ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <LogOut size={15} /> Completed History
            <span className="tab-badge-count">{completedCount}</span>
          </button>
          <button
            className={`booking-tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
            style={{ color: '#64748b' }}
          >
            <Clock size={15} /> Archived
            <span className="tab-badge-count" style={{ background: '#f1f5f9', color: '#475569' }}>{archivedStays.length}</span>
          </button>
          {currentUser?.canViewConfidential && (
            <button
              className={`booking-tab-btn ${activeTab === 'confidential' ? 'active' : ''}`}
              onClick={() => setActiveTab('confidential')}
              style={{ color: '#6d28d9' }}
            >
              <EyeOff size={15} /> Confidential Bookings
            </button>
          )}
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

      <div style={{ marginBottom: '16px' }}>
        <PaymentBreakdownBar items={computeMonthBreakdown(sourceBookings)} />
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
            <option value="drafts">Drafts ({draftCount})</option>
            <option value="completed">Completed History ({completedCount})</option>
            {currentUser?.canViewConfidential && (
              <option value="confidential">Confidential Bookings</option>
            )}
            {hiddenCount > 0 && currentUser?.role === 'Overall Admin' && (
              <option value="hidden">Hidden Bookings ({hiddenCount})</option>
            )}
            <option value="all">All Bookings ({allCount})</option>
          </select>
        </div>
      </div>

      {/* Grouped Bookings Content */}
      <div className="card-container" style={{ padding: '20px', background: 'transparent', boxShadow: 'none', border: 'none' }}>
        {sourceBookings.length === 0 ? (
          <div className="card-container" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <BedDouble size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Stay Records Registered Yet</h3>
          </div>
        ) : (
          <>
            {activeTab === 'confidential' && <ConfidentialBookingsTable />}
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
            {(activeTab === 'all' || activeTab === 'drafts') && renderBookingGroup('Draft Bookings (Not Confirmed)', draftStays)}
            {activeTab === 'drafts' && draftStays.length === 0 && (
              <div className="card-container" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                <FileText size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', margin: '0 0 4px 0' }}>No Draft Bookings</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Bookings saved as draft will appear here.</p>
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
            {(activeTab === 'all' || activeTab === 'archived') && renderBookingGroup('Archived / Delayed Check-in Stays (Past Buffer)', archivedStays)}
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
          onGenerate={(billPayload) => {
            // Preview only: the bill is saved when the user presses Save Bill
            setGeneratingBillBooking(null);
            setSelectedBillForInvoice(billPayload);
          }}
        />
      )}

      {selectedBillForInvoice && (
        <BillInvoiceModal
          bill={selectedBillForInvoice}
          onClose={() => setSelectedBillForInvoice(null)}
          onSave={async (billPayload) => {
            const saved = addBill ? await addBill(billPayload) : false;
            // Reopen the saved bill (no onSave) so its invoice is stored in Dropbox; keep the preview open if the save failed
            if (saved) setSelectedBillForInvoice(saved);
          }}
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

      {/* Settle Outstanding Balance to Checkout Modal (Requirements 7 & 11) */}
      {settleCheckoutBooking && (
        <div className="modal-overlay" onClick={() => setSettleCheckoutBooking(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', background: '#ffffff', padding: '24px' }}
          >
            <div className="modal-header-row" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#dc2626" />
                <h3 className="modal-heading" style={{ fontSize: '16px', margin: 0, color: '#991b1b' }}>
                  Checkout Blocked: Unpaid Balance Due
                </h3>
              </div>
              <button className="icon-btn" onClick={() => setSettleCheckoutBooking(null)}><X size={16} /></button>
            </div>

            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: 1.5 }}>
                Guest <strong>{settleCheckoutBooking.guestName}</strong> in <strong>Room {settleCheckoutBooking.room || 'Suite'}</strong> has an outstanding unpaid balance.
                Full payment is mandatory before completing check-out.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Room Tariff:</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(settleCheckoutBooking.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#059669' }}>Already Paid:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(settleCheckoutBooking.paid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '14px' }}>
                <span style={{ fontWeight: 800, color: '#b91c1c' }}>Outstanding Due Now:</span>
                <span style={{ fontWeight: 800, color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(settleCheckoutBooking.balanceDue)}
                </span>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSettleAndCheckout(); }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Settlement Payment Channel
                </label>
                <select
                  className="form-input"
                  value={settleChannel}
                  onChange={(e) => setSettleChannel(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI (Owner UPI)">UPI (Owner UPI)</option>
                  <option value="Other UPI">Other UPI</option>
                </select>
              </div>

              {settleChannel.toLowerCase().includes('upi') && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Transaction ID / UTR Reference <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter UPI UTR / Ref Number"
                    value={settleTxnId}
                    onChange={(e) => setSettleTxnId(e.target.value)}
                    required
                  />
                </div>
              )}

              {settleError && (
                <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>
                  {settleError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-sub"
                  onClick={() => setSettleCheckoutBooking(null)}
                  disabled={settleLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-main"
                  disabled={settleLoading}
                  style={{ background: '#059669' }}
                >
                  {settleLoading ? 'Settling...' : `Collect ${formatCurrency(settleCheckoutBooking.balanceDue)} & Check-out`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
