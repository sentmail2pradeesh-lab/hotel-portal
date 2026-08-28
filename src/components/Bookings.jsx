import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate, confirmDouble } from '../utils/formatters';
import { BookingModal } from './BookingModal';
import { IDCardViewerModal } from './IDCardViewerModal';
import { Plus, Search, Trash2, Edit2, CheckCircle2, BedDouble, PhoneCall } from 'lucide-react';

export const Bookings = () => {
  const { bookings, deleteBooking, isRegisterOpen } = useHotel();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedIDBooking, setSelectedIDBooking] = useState(null);

  const filteredBookings = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.guestName.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term) ||
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
          <h1 className="page-heading">Guest Stay Register</h1>
          <p className="page-subheading">Comprehensive booking log — guest info, room suites, payment details & ID verification.</p>
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

      {/* Search & Filter Toolbar */}
      <div className="toolbar-row">
        <div className="search-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by guest name, ID, or room suite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: '#d97706' }}>{filteredBookings.length}</strong> of {bookings.length} registered stays
        </span>
      </div>

      {/* Bookings Data Table */}
      <div className="card-container">
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <BedDouble size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Stay Records Registered Yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
              Your register is clean. Click "+ New Booking" to register a guest stay.
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
                <th>BOOKING ID</th>
                <th>GUEST NAME</th>
                <th>CONTACT</th>
                <th>SUITE</th>
                <th>CHECK-IN</th>
                <th>CHECK-OUT</th>
                <th>AMOUNT</th>
                <th>VIA</th>
                <th>ID CARD</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-row">
                    No stays match your search term "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="tag-badge">{b.id}</span>
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
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '4px 10px', 
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1'
                      }}>
                        {b.paidVia || 'Cash'}
                      </span>
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
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
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
                ))
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
