import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate, confirmDouble } from '../utils/formatters';
import { BookingModal } from './BookingModal';
import { IDCardViewerModal } from './IDCardViewerModal';
import { 
  Plus, Search, Trash2, Edit2, CheckCircle2, BedDouble, PhoneCall, 
  Clock, LogIn, LogOut, FileText, UserCheck
} from 'lucide-react';

export const Bookings = () => {
  const { 
    bookings, 
    deleteBooking, 
    checkInBooking, 
    checkOutBooking, 
    isRegisterOpen 
  } = useHotel();
  
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'in-house' | 'completed' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedIDBooking, setSelectedIDBooking] = useState(null);

  // Tab count metrics
  const upcomingCount = bookings.filter(b => (b.status || 'Upcoming') === 'Upcoming' || b.status === 'Confirmed').length;
  const inHouseCount = bookings.filter(b => b.status === 'In-House').length;
  const completedCount = bookings.filter(b => b.status === 'Completed').length;
  const allCount = bookings.length;

  const filteredBookings = bookings.filter((b) => {
    const currentStatus = b.status || 'Upcoming';

    // Filter by tab
    if (activeTab === 'upcoming' && !(currentStatus === 'Upcoming' || currentStatus === 'Confirmed')) {
      return false;
    }
    if (activeTab === 'in-house' && currentStatus !== 'In-House') {
      return false;
    }
    if (activeTab === 'completed' && currentStatus !== 'Completed') {
      return false;
    }

    // Filter by search query
    const term = searchTerm.toLowerCase();
    return (
      b.guestName.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term) ||
      (b.manualId && b.manualId.toLowerCase().includes(term)) ||
      b.room.toLowerCase().includes(term) ||
      (b.phone && b.phone.includes(term))
    );
  });

  const handleEdit = (booking) => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to edit stays.');
      return;
    }
    setEditingBooking(booking);
    setIsModalOpen(true);
  };

  const handleDelete = (id, guestName) => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to delete stay records.');
      return;
    }
    if (confirmDouble(
      `Are you sure you want to delete the booking record for ${guestName} (${id})?`,
      `PERMANENT DELETION CONFIRMATION: Are you double sure you want to delete stay record ${id} (${guestName})? This action cannot be undone.`
    )) {
      deleteBooking(id);
    }
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

      {/* Booking Status Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="booking-tabs-container">
          <button 
            className={`booking-tab-btn upcoming ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <Clock size={15} /> Upcoming Stays
            <span className="tab-badge-count">{upcomingCount}</span>
          </button>
          <button 
            className={`booking-tab-btn in-house ${activeTab === 'in-house' ? 'active' : ''}`}
            onClick={() => setActiveTab('in-house')}
          >
            <LogIn size={15} /> In-House Guests
            <span className="tab-badge-count">{inHouseCount}</span>
          </button>
          <button 
            className={`booking-tab-btn completed ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <LogOut size={15} /> Completed History
            <span className="tab-badge-count">{completedCount}</span>
          </button>
          <button 
            className={`booking-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <UserCheck size={15} /> All Bookings
            <span className="tab-badge-count">{allCount}</span>
          </button>
        </div>

        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: '#d97706' }}>{filteredBookings.length}</strong> stays
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="toolbar-row">
        <div className="search-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by guest name, ASZ ID, manual ref, or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Bookings Data Table */}
      <div className="card-container">
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <BedDouble size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Stay Records Registered Yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
              Your property register is clean. Click "+ New Booking" to register a guest stay.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
                <Plus size={16} /> New Booking
              </button>
            </div>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>SYSTEM ID</th>
                <th>MANUAL ID</th>
                <th>STATUS</th>
                <th>GUEST NAME</th>
                <th>CONTACT</th>
                <th>SUITE</th>
                <th>CHECK-IN</th>
                <th>CHECK-OUT</th>
                <th>AMOUNT</th>
                <th>ID CARD</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-row">
                    No stays found under active tab "{activeTab}" matching search "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const bStatus = b.status || 'Upcoming';
                  const isUpcoming = bStatus === 'Upcoming' || bStatus === 'Confirmed';
                  const isInHouse = bStatus === 'In-House';
                  const isCompleted = bStatus === 'Completed';

                  return (
                    <tr key={b.id}>
                      <td>
                        <span className="system-id-badge">{b.id}</span>
                      </td>
                      <td>
                        <span className="manual-id-badge">{b.manualId || b.id}</span>
                      </td>
                      <td>
                        {isUpcoming && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={12} /> UPCOMING
                          </span>
                        )}
                        {isInHouse && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <LogIn size={12} /> IN-HOUSE
                          </span>
                        )}
                        {isCompleted && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: '#f3e8ff',
                            color: '#6b21a8',
                            border: '1px solid #d8b4fe',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <LogOut size={12} /> COMPLETED
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.guestName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <PhoneCall size={13} color="var(--text-muted)" />
                          <span className="mono">{b.phone || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BedDouble size={14} color="#0284c7" />
                          <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Room {b.room}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(b.checkIn)}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(b.checkOut)}</td>
                      <td className="mono" style={{ fontWeight: 800, color: '#d97706', fontSize: '15px' }}>
                        {formatCurrency(b.amountPaid)}
                      </td>
                      <td>
                        {b.idCard ? (
                          <button 
                            className="id-status-badge has-id"
                            onClick={() => setSelectedIDBooking(b)}
                            title="Click to view attached Guest ID Card"
                          >
                            <CheckCircle2 size={13} /> View ID
                          </button>
                        ) : (
                          <button 
                            className="id-status-badge no-id"
                            disabled={!isRegisterOpen}
                            onClick={() => handleEdit(b)}
                            title={isRegisterOpen ? "No ID uploaded. Click to edit booking & upload ID." : "Shift Register is Closed (View-Only Mode)"}
                          >
                            + Attach ID
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {isUpcoming && (
                            <button
                              className="btn-action-checkin"
                              disabled={!isRegisterOpen}
                              onClick={() => checkInBooking(b.id)}
                              title="Perform Guest Check-In"
                            >
                              <LogIn size={13} /> Check-In
                            </button>
                          )}
                          {isInHouse && (
                            <button
                              className="btn-action-checkout"
                              disabled={!isRegisterOpen}
                              onClick={() => checkOutBooking(b.id)}
                              title="Perform Guest Check-Out"
                            >
                              <LogOut size={13} /> Check-Out
                            </button>
                          )}
                          <button 
                            className="icon-btn"
                            disabled={!isRegisterOpen}
                            onClick={() => handleEdit(b)}
                            title={isRegisterOpen ? "Edit Stay Details" : "Shift Register is Closed (View-Only Mode)"}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="icon-btn"
                            style={{ color: '#be123c' }}
                            disabled={!isRegisterOpen}
                            onClick={() => handleDelete(b.id, b.guestName)}
                            title={isRegisterOpen ? "Delete Stay Record" : "Shift Register is Closed (View-Only Mode)"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

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
    </div>
  );
};
