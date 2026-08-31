import React, { useState } from 'react';
import { formatCurrency, calculateNights } from '../utils/formatters';
import { FileText, X, Receipt } from 'lucide-react';

export const GenerateBillModal = ({ booking, onClose, onGenerate }) => {
  if (!booking) return null;

  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const defaultRoomRate = booking.amountPaid || 0;

  const [checkInTime, setCheckInTime] = useState(booking.checkInTime || '10:00 AM');
  const [checkOutTime, setCheckOutTime] = useState(booking.checkOutTime || '12:00 PM');
  const [roomCharge, setRoomCharge] = useState(defaultRoomRate);
  const [extraBedCharge, setExtraBedCharge] = useState(0);
  const [foodCharge, setFoodCharge] = useState(0);
  const [laundryCharge, setLaundryCharge] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  const roomSubtotal = parseFloat(roomCharge) || 0;
  const extraBedSubtotal = parseFloat(extraBedCharge) || 0;
  const foodSubtotal = parseFloat(foodCharge) || 0;
  const laundrySubtotal = parseFloat(laundryCharge) || 0;

  const subtotal = roomSubtotal + extraBedSubtotal + foodSubtotal + laundrySubtotal;
  const taxAmount = (subtotal * (parseFloat(taxPercent) || 0)) / 100;
  const grandTotal = subtotal + taxAmount;

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const addOns = [];
    if (extraBedSubtotal > 0) {
      addOns.push({ name: 'Extra Bed / Extra Person', amount: extraBedSubtotal, quantity: 1, unitPrice: extraBedSubtotal });
    }
    if (foodSubtotal > 0) {
      addOns.push({ name: 'Food & Beverage / Dining Services', amount: foodSubtotal, quantity: 1, unitPrice: foodSubtotal });
    }
    if (laundrySubtotal > 0) {
      addOns.push({ name: 'Laundry & Room Add-ons', amount: laundrySubtotal, quantity: 1, unitPrice: laundrySubtotal });
    }

    const billPayload = {
      id: `REC-${booking.manualId || booking.id}`,
      guestName: booking.guestName,
      guestEmail: booking.email || 'N/A',
      guestPhone: booking.phone || 'N/A',
      bookingId: booking.id,
      manualId: booking.manualId || booking.id,
      roomNo: booking.room,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      checkInTime,
      checkOutTime,
      nights,
      date: new Date().toISOString(),
      roomCharge: roomSubtotal,
      addOns,
      subtotal,
      taxPercent: parseFloat(taxPercent) || 0,
      taxAmount,
      total: grandTotal
    };

    onGenerate(billPayload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={22} color="#d97706" />
            <div>
              <h3 className="modal-heading" style={{ fontSize: '18px' }}>Itemized Bill Details</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Enter accommodation & add-on charges to generate receipt statement
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Guest & Stay Summary Banner */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '14px 0', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Guest Visitor:</span>
            <strong style={{ color: '#0f172a' }}>{booking.guestName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Room Suite & Duration:</span>
            <strong style={{ color: '#0284c7' }}>Room {booking.room} ({nights} {nights === 1 ? 'Night' : 'Nights'})</strong>
          </div>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Check-in Time</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. 10:00 AM"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Check-out Time</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. 12:00 PM"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Room Accommodation Charge (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input mono"
                value={roomCharge}
                onChange={(e) => setRoomCharge(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Extra Bed / Extra Person Charge (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input mono"
                placeholder="0.00"
                value={extraBedCharge}
                onChange={(e) => setExtraBedCharge(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Food & Beverage / Dining Services (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input mono"
                placeholder="0.00"
                value={foodCharge}
                onChange={(e) => setFoodCharge(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Laundry & Other Services (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input mono"
                placeholder="0.00"
                value={laundryCharge}
                onChange={(e) => setLaundryCharge(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tax / GST Rate (%)</label>
              <input
                type="number"
                step="0.1"
                className="form-input mono"
                placeholder="0.0 (e.g. 5 or 12)"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
            </div>
          </div>

          {/* Realtime Calculation Summary */}
          <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '8px', border: '1px solid #a7f3d0', marginTop: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#047857' }}>Subtotal:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(subtotal)}</strong>
            </div>
            {taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#047857' }}>
                <span>Tax ({taxPercent}%):</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(taxAmount)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #a7f3d0', paddingTop: '8px', fontSize: '16px', fontWeight: 800, color: '#047857' }}>
              <span>Grand Total Due:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn-sub" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-main">
              <FileText size={15} /> Generate Official Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
