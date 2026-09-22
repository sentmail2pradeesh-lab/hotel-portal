import React, { useState, useEffect } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatDate, calculateNights } from '../utils/formatters';
import { BedDouble, Users, Calendar, ShieldCheck, X, CheckCircle2, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const AllotRoomModal = ({ booking, isOpen, onClose }) => {
  const { allotRoom, isRegisterOpen, roomsList } = useHotel();
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCurrentRoomInInventory = Boolean(
    booking?.room && roomsList && roomsList.includes(booking.room)
  );

  useEffect(() => {
    if (!isOpen || !booking) return;

    setSelectedRoom(isCurrentRoomInInventory ? booking.room : '');
    setErrorMsg('');
    setLoadingRooms(true);

    api.getAvailableRooms(booking.checkIn, booking.checkOut, booking.id)
      .then((data) => {
        const rooms = data.availableRooms || [];
        setAvailableRooms(rooms);
        if ((!booking.room || !isCurrentRoomInInventory) && rooms.length > 0) {
          setSelectedRoom(rooms[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load available rooms:', err);
        setErrorMsg('Unable to fetch live room availability. Please check server connection.');
      })
      .finally(() => {
        setLoadingRooms(false);
      });
  }, [isOpen, booking, isCurrentRoomInInventory]);

  if (!isOpen || !booking) return null;

  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const adults = booking.adults || 1;
  const children = booking.children || 0;
  const totalGuests = booking.guestCount || (adults + children);
  const isGuaranteed = Boolean(booking.isGuaranteed || booking.isPrepaid || booking.bookingType === 'Online Pre-paid');

  const handleAllot = async (checkInImmediately = false) => {
    if (!selectedRoom) {
      alert('Please select a room suite to allot.');
      return;
    }
    if (!isRegisterOpen && checkInImmediately) {
      alert('Shift Register is closed. Please open shift register before checking in.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const statusToSet = checkInImmediately ? 'In-House' : (booking.status || 'Upcoming');
      await allotRoom(booking.id, selectedRoom, statusToSet, true);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to allot room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BedDouble size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {booking.room ? 'Re-Assign / Change Room' : 'Allot Room Suite'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Manager / Admin Physical Key Assignment
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Guest Summary Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Guest Name</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{booking.guestName}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Booking Ref: <span className="mono" style={{ fontWeight: 700, color: '#0284c7' }}>#{booking.manualId || booking.id}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stay Dates</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <Calendar size={13} color="#0284c7" />
                  <span>{formatDate(booking.checkIn)} &rarr; {formatDate(booking.checkOut)}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                  {nights} {nights === 1 ? 'Night' : 'Nights'} Stay
                </div>
              </div>
            </div>

            {/* Guest Count & Guarantee Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '10px',
              borderTop: '1px dashed #e2e8f0',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
                <Users size={15} color="#6366f1" />
                <span>👥 {totalGuests} Guests ({adults} Adults, {children} Children)</span>
              </div>
              <div>
                {isGuaranteed ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0'
                  }}>
                    <ShieldCheck size={12} /> GUARANTEED PREPAID
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #fde68a'
                  }}>
                    ⏳ TENTATIVE UNPAID
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Guarantee Banner */}
          {isGuaranteed && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>
                <strong>Definite Room Guarantee:</strong> This guest has paid in full. Once allotted, this room is strictly locked and cannot be overbooked by walk-ins.
              </span>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={15} color="#dc2626" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Room Selection Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
              Select Physical Room Suite to Assign
            </label>
            {loadingRooms ? (
              <div style={{ padding: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                Checking live room matrix...
              </div>
            ) : availableRooms.length === 0 && !booking.room ? (
              <div style={{
                padding: '14px',
                borderRadius: '8px',
                background: '#fff7ed',
                border: '1px solid #ffedd5',
                color: '#c2410c',
                fontSize: '13px',
                fontWeight: 600
              }}>
                ⚠️ All rooms are currently occupied or reserved for other guests on these stay dates.
              </div>
            ) : (
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="form-select-pro mono"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                <option value="" disabled>-- Choose an available room --</option>
                {booking.room && isCurrentRoomInInventory && !availableRooms.includes(booking.room) && (
                  <option value={booking.room}>
                    Room {booking.room} (Currently Assigned to this Guest)
                  </option>
                )}
                {availableRooms.map((rm) => (
                  <option key={rm} value={rm}>
                    Room {rm} • Available for {nights} {nights === 1 ? 'Night' : 'Nights'}
                  </option>
                ))}
              </select>
            )}
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '6px 0 0' }}>
              Only clean, unreserved rooms with zero date collisions are listed above.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            className="btn-sub"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleAllot(false)}
            disabled={isSubmitting || !selectedRoom}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: '#0284c7',
              borderColor: '#0284c7',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CheckCircle2 size={14} />
            {booking.room ? 'Update Room' : 'Assign Room'}
          </button>
          <button
            type="button"
            className="btn-action-checkin"
            onClick={() => handleAllot(true)}
            disabled={isSubmitting || !selectedRoom}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogIn size={14} />
            Assign & Check-In Now
          </button>
        </div>
      </div>
    </div>
  );
};
