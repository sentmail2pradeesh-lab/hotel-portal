import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate, confirmDouble } from '../utils/formatters';
import { ExpenseModal } from './ExpenseModal';
import { Plus, Search, Trash2, Receipt, Tag } from 'lucide-react';

export const Expenses = () => {
  const { expenses, deleteExpense, isRegisterOpen } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'Supplies': return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'Repairs': return { bg: '#fef2f2', color: '#be123c', border: '#fca5a5' };
      case 'Staff': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Utilities': return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Marketing': return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const totalFilteredOutflow = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="expenses-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Daily Operational Expenses</h1>
          <p className="page-subheading">Track property cash outflow — room supplies, repairs, staff wages, utilities.</p>
        </div>
        <button 
          className="btn-main" 
          disabled={!isRegisterOpen}
          onClick={() => {
            if (!isRegisterOpen) {
              alert('Shift Register is Closed. Please open the shift register to log expenses.');
              return;
            }
            setIsModalOpen(true);
          }}
          title={isRegisterOpen ? 'Log Expense' : 'Shift Register is Closed (View-Only Mode)'}
        >
          <Plus size={17} /> Log Expense
        </button>
      </div>

      <div className="toolbar-row">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="form-select"
            style={{ width: 'auto', padding: '10px 16px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Supplies">Supplies</option>
            <option value="Repairs">Repairs</option>
            <option value="Staff">Staff</option>
            <option value="Utilities">Utilities</option>
            <option value="Marketing">Marketing</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Total Outflow: <strong style={{ color: '#be123c', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalFilteredOutflow)}</strong>
        </div>
      </div>

      <div className="card-container">
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Receipt size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Expense Logs Recorded</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
              No cash outflow entries exist yet. Click "+ Log First Expense" to add a record.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn-main" 
                disabled={!isRegisterOpen}
                onClick={() => {
                  if (!isRegisterOpen) {
                    alert('Shift Register is Closed. Please open the shift register to log expenses.');
                    return;
                  }
                  setIsModalOpen(true);
                }}
                title={isRegisterOpen ? 'Log First Expense' : 'Shift Register is Closed (View-Only Mode)'}
              >
                <Plus size={16} /> Log First Expense
              </button>
            </div>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>CATEGORY</th>
                <th>DESCRIPTION</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-row">
                    No expense records found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const styleBadge = getCategoryBadge(exp.category);
                  return (
                    <tr key={exp.id}>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(exp.date)}</td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: styleBadge.bg,
                          color: styleBadge.color,
                          border: `1px solid ${styleBadge.border}`,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Tag size={11} />
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{exp.description}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#be123c', fontSize: '15px' }}>
                        {formatCurrency(exp.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="icon-btn"
                          style={{ color: '#be123c' }}
                          disabled={!isRegisterOpen}
                          onClick={() => {
                            if (!isRegisterOpen) {
                              alert('Shift Register is Closed. Please open the shift register to delete expense records.');
                              return;
                            }
                            if (confirmDouble(
                              `Are you sure you want to delete expense record "${exp.description}"?`,
                              `PERMANENT DELETION CONFIRMATION: Are you double sure you want to delete expense "${exp.description}" (₹${exp.amount})? This cannot be undone.`
                            )) {
                              deleteExpense(exp.id);
                            }
                          }}
                          title={isRegisterOpen ? "Delete Expense Record" : "Shift Register is Closed (View-Only Mode)"}
                        >
                          <Trash2 size={15} />
                        </button>
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
        <ExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
