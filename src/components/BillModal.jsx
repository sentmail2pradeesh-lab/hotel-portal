import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { generateId, formatCurrency } from '../utils/formatters';
import { X, Plus, FileText } from 'lucide-react';

export const BillModal = ({ isOpen, onClose, onCreated, initialData = null }) => {
  const { bookings, addBill, updateBill } = useHotel();

  const [billNo, setBillNo] = useState(initialData?.id || generateId('BILL'));
  const [selectedBookingId, setSelectedBookingId] = useState(initialData?.bookingId || '');
  const [guestName, setGuestName] = useState(initialData?.guestName || '');
  const [roomNo, setRoomNo] = useState(initialData?.roomNo || '');
  const [roomCharge, setRoomCharge] = useState(initialData?.roomCharge !== undefined ? initialData.roomCharge.toString() : '0');
  
  // Dynamic add-on line items
  const [addOns, setAddOns] = useState(
    initialData?.addOns && initialData.addOns.length > 0
      ? initialData.addOns.map((a) => ({ id: a.id || generateId('item'), name: a.name || '', amount: a.amount !== undefined ? a.amount.toString() : '' }))
      : [{ id: generateId('item'), name: '', amount: '' }]
  );

  if (!isOpen) return null;

  const handleBookingSelect = (bId) => {
    setSelectedBookingId(bId);
    if (!bId) {
      setGuestName('');
      setRoomNo('');
      setRoomCharge('0');
      return;
    }
    const found = bookings.find((b) => b.id === bId);
    if (found) {
      setGuestName(found.guestName);
      setRoomNo(found.room);
      setRoomCharge(found.amountPaid ? found.amountPaid.toString() : '0');
    }
  };

  const handleAddLine = () => {
    setAddOns((prev) => [
      ...prev,
      { id: generateId('item'), name: '', amount: '' }
    ]);
  };

  const handleRemoveLine = (id) => {
    setAddOns((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddOnFieldChange = (id, field, value) => {
    setAddOns((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const parsedRoomCharge = parseFloat(roomCharge) || 0;
  const parsedAddOnsSum = addOns.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  const grandTotal = parsedRoomCharge + parsedAddOnsSum;

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalBill = {
      id: billNo.trim() || generateId('BILL'),
      bookingId: selectedBookingId || null,
      guestName: guestName || 'Walk-in Guest',
      roomNo: roomNo || 'N/A',
      roomCharge: parsedRoomCharge,
      addOns: addOns
        .filter((item) => item.name.trim() !== '')
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          amount: parseFloat(item.amount) || 0
        })),
      total: grandTotal,
      date: initialData?.date || new Date().toISOString().split('T')[0]
    };

    if (initialData) {
      updateBill(finalBill);
    } else {
      addBill(finalBill);
    }

    if (onCreated) {
      onCreated(finalBill);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="#d97706" />
            <h2 className="modal-heading">Issue Room Bill & Add-ons</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Bill Statement No.</label>
              <input
                type="text"
                className="form-input mono"
                placeholder="Auto generated"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Link Guest Stay Record</label>
              <select
                className="form-select"
                value={selectedBookingId}
                onChange={(e) => handleBookingSelect(e.target.value)}
              >
                <option value="">— Standalone / Walk-in —</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} ({b.guestName} - Room {b.room})
                  </option>
                ))}
              </select>
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
            />
          </div>

          {/* Dynamic ADD-ONS line section */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label className="form-label" style={{ margin: 0 }}>Add-on Line Items & Services</label>
              <button
                type="button"
                className="btn-sub"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={handleAddLine}
              >
                <Plus size={13} color="#d97706" /> + Add Line Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {addOns.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Breakfast, Extra Bed, Airport Transfer"
                    value={item.name}
                    onChange={(e) => handleAddOnFieldChange(item.id, 'name', e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input mono"
                      placeholder="₹ 0.00"
                      value={item.amount}
                      onChange={(e) => handleAddOnFieldChange(item.id, 'amount', e.target.value)}
                    />
                  </div>
                  {addOns.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ color: '#be123c' }}
                      onClick={() => handleRemoveLine(item.id)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total calculation footer preview */}
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center' 
          }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>TOTAL INVOICE AMOUNT</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 800, color: '#d97706' }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-sub" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-main">
              Generate Bill Statement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
