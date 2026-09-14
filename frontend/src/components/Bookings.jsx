import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate, confirmDouble, calculateNights, getAutoStayStatus } from '../utils/formatters';
import { BookingModal } from './BookingModal';
import { IDCardViewerModal } from './IDCardViewerModal';
import { EarlyCheckoutModal } from './EarlyCheckoutModal';
import { BillInvoiceModal } from './BillInvoiceModal';
import { 
  Plus, Search, Trash2, Edit2, CheckCircle2, BedDouble, PhoneCall, 
  Clock, LogIn, LogOut, FileText, UserCheck, Mail, Sparkles, EyeOff, Calendar, Phone, Filter
} from 'lucide-react';

import { GenerateBillModal } from './GenerateBillModal';

export const Bookings = () => {
  const { 
    bookings, 
    deleteBooking, 
    checkInBooking, 
    checkOutBooking, 
    earlyCheckOutBooking,
    currentUser,
    isRegisterOpen 
  } = useHotel();
  
  const [activeTab, setActiveTab] = useState('all'); // 'in-house' | 'upcoming' | 'completed' | 'hidden' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedIDBooking, setSelectedIDBooking] = useState(null);
  const [earlyCheckoutBooking, setEarlyCheckoutBooking] = useState(null);
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState(null);
  const [generatingBillBooking, setGeneratingBillBooking] = useState(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

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
    setEditingBooking(booking);
    setIsModalOpen(true);
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
    return list.filter(b => 
      (b.guestName && b.guestName.toLowerCase().includes(term)) ||
      (b.phone && b.phone.toLowerCase().includes(term)) ||
      (b.email && b.email.toLowerCase().includes(term)) ||
      (b.id && b.id.toLowerCase().includes(term)) ||
      (b.manualId && b.manualId.toLowerCase().includes(term)) ||
      (b.room && String(b.room).toLowerCase().includes(term))
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {b.guestName}
                    </h4>
                    {b.isHidden && (
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                        HIDDEN BOOKING
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
                <div style={{ flex: '1', minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    <BedDouble size={16} color="#0284c7" />
                    <span>Room {b.room}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} color="var(--text-muted)" />
                    <span><strong>{nights} {nights === 1 ? 'Night' : 'Nights'}</strong> ({formatDate(b.checkIn)} - {formatDate(b.checkOut)})</span>
                  </div>
                </div>

                {/* Amount & Payment Info */}
                <div style={{ minWidth: '140px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#d97706' }} className="mono">
                    {formatCurrency(b.amountPaid)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                    Paid via {b.paidVia || 'Cash'}
                  </div>
                </div>
                {/* Status Badge */}
                <div style={{ minWidth: '110px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', minWidth: '240px', flexWrap: 'wrap' }}>
                  {b.idCard ? (
                    <button 
                      className="id-status-badge has-id"
                      onClick={() => setSelectedIDBooking(b)}
                      title="View ID Card"
                    >
                      <CheckCircle2 size={12} /> ID Scan
                    </button>
                  ) : (
                    <button 
                      className="id-status-badge no-id"
                      disabled={!isRegisterOpen}
                      onClick={() => handleEdit(b)}
                      title="Attach Guest ID"
                    >
                      + Attach ID
                    </button>
                  )}

                  {/* Primary Action Buttons */}
                  {isUpcoming && !b.isHidden && (
                    <button
                      className="btn-action-checkin"
                      disabled={!isRegisterOpen}
                      onClick={() => checkInBooking(b.id)}
                      title="Check-In Guest"
                    >
                      <LogIn size={13} /> Check-In
                    </button>
                  )}

                  {(isInHouse || isUpcoming) && !b.isHidden && (
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
                      style={{ padding: '5px 10px', fontSize: '11px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                      onClick={() => handleGenerateBillForBooking(b)}
                      title="Generate Official Guest Bill Receipt"
                    >
                      <FileText size={13} /> Generate Bill
                    </button>
                  )}

                  {/* Edit Button: ONLY for In-House/Upcoming AND ONLY for Overall Admin */}
                  {!isCompleted && currentUser?.role === 'Overall Admin' && (
                    <button 
                      className="icon-btn"
                      disabled={!isRegisterOpen}
                      onClick={() => handleEdit(b)}
                      title="Edit Stay Details (Admin Only)"
                    >
                      <Edit2 size={15} />
                    </button>
                  )}

                  {/* Delete Button: ONLY for In-House/Upcoming AND ONLY for Overall Admin */}
                  {!isCompleted && currentUser?.role === 'Overall Admin' && (
                    <button 
                      className="icon-btn"
                      style={{ color: '#be123c' }}
                      disabled={!isRegisterOpen}
                      onClick={() => handleDelete(b.id, b.guestName)}
                      title="Delete Stay Record (Admin Only)"
                    >
                      <Trash2 size={15} />
                    </button>
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
        <button 
          className="btn-main"
          disabled={!isRegisterOpen}
          onClick={() => {
            if (!isRegisterOpen) {
              alert('Shift Register is Closed. Please open the shift register to add a new booking.');
              return;
            }
            setEditingBooking(null);
            setIsModalOpen(true);
          }}
          title={isRegisterOpen ? 'New Booking' : 'Shift Register is Closed (View-Only Mode)'}
        >
          <Plus size={17} /> New Booking
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="booking-tabs-container">
          <button 
            className={`booking-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <UserCheck size={15} /> All Bookings
            <span className="tab-badge-count">{allCount}</span>
          </button>
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
            <option value="all">All Statuses ({allCount})</option>
            <option value="in-house">In-House Stays ({inHouseCount})</option>
            <option value="upcoming">Upcoming Reservations ({upcomingCount})</option>
            <option value="completed">Completed History ({completedCount})</option>
            {hiddenCount > 0 && currentUser?.role === 'Overall Admin' && (
              <option value="hidden">Hidden Bookings ({hiddenCount})</option>
            )}
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
            {(activeTab === 'all' || activeTab === 'upcoming') && renderBookingGroup('Upcoming Stays & Reservations', upcomingStays)}
            {(activeTab === 'all' || activeTab === 'completed') && renderBookingGroup('Completed Stay History', completedStays)}
            {(activeTab === 'all' || activeTab === 'hidden') && currentUser?.role === 'Overall Admin' && renderBookingGroup('Hidden Bookings / Early Released Slots', hiddenBookings)}
          </>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBooking(null);
          }}
          initialData={editingBooking}
        />
      )}

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
            setGeneratingBillBooking(null);
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
    </div>
  );
};

export default Bookings;
