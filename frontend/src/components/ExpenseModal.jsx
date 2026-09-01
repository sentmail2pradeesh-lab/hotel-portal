import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { generateId } from '../utils/formatters';
import { X, Receipt } from 'lucide-react';

export const ExpenseModal = ({ isOpen, onClose }) => {
  const { addExpense, isRegisterOpen } = useHotel();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Supplies');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to record outflow.');
      return;
    }
    if (!description.trim() || !amount) {
      alert('Please fill out expense description and amount.');
      return;
    }

    addExpense({
      id: generateId('EXP'),
      date,
      category,
      description: description.trim(),
      amount: parseFloat(amount) || 0
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={22} color="#be123c" />
            <h2 className="modal-heading">Log Property Expense</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Expense Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Supplies">Supplies (Linens, Toiletries, Cleaning)</option>
              <option value="Repairs">Repairs & Maintenance</option>
              <option value="Staff">Staff Wages & Food</option>
              <option value="Utilities">Utilities (Electricity, Water, WiFi)</option>
              <option value="Marketing">Marketing & Print</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Linen restocking, HVAC maintenance..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input mono"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-sub" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-main"
              disabled={!isRegisterOpen}
              title={isRegisterOpen ? "Record Outflow" : "Shift Register is Closed (View-Only Mode)"}
            >
              Record Outflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
