import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, confirmDouble } from '../utils/formatters';
import { BillModal } from './BillModal';
import { BillInvoiceModal } from './BillInvoiceModal';
import { Plus, Search, Trash2, Eye, FileText, Edit2 } from 'lucide-react';

export const Bills = () => {
  const { bills = [], deleteBill, isRegisterOpen } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [viewingInvoiceBill, setViewingInvoiceBill] = useState(null);

  const safeBillsList = Array.isArray(bills) ? bills : [];

  const filteredBills = safeBillsList.filter((b) => {
    if (!b) return false;
    const term = (searchTerm || '').toLowerCase();
    const bId = (b.id || '').toString().toLowerCase();
    const bGuest = (b.guestName || '').toString().toLowerCase();
    const bBookingId = (b.bookingId || '').toString().toLowerCase();
    return bId.includes(term) || bGuest.includes(term) || bBookingId.includes(term);
  });

  const handleDeleteBill = (b) => {
    if (!b || !b.id) return;
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to delete room bills.');
      return;
    }
    if (confirmDouble(
      `Are you sure you want to delete bill statement ${b.id} for ${b.guestName || 'Guest'}?`,
      `PERMANENT DELETION CONFIRMATION: Are you double sure you want to delete bill ${b.id}? This action cannot be undone.`
    )) {
      deleteBill(b.id);
    }
  };

  return (
    <div className="bills-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Room Bills & Add-ons</h1>
          <p className="page-subheading">
            Itemized room billing statements — stay charges, extra amenities, and exportable guest receipts.
          </p>
        </div>
        <button 
          className="btn-main" 
          disabled={!isRegisterOpen}
          onClick={() => {
            if (!isRegisterOpen) {
              alert('Shift Register is Closed. Please open the shift register to create new bills.');
              return;
            }
            setEditingBill(null); 
            setIsModalOpen(true); 
          }}
          title={isRegisterOpen ? 'New Bill Statement' : 'Shift Register is Closed (View-Only Mode)'}
        >
          <Plus size={17} /> New Bill Statement
        </button>
      </div>

      <div className="toolbar-row">
        <div className="search-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by bill #, guest name, or stay ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: '#d97706' }}>{filteredBills.length}</strong> of {safeBillsList.length} bills
        </span>
      </div>

      <div className="card-container">
        {safeBillsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <FileText size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Room Bills Issued Yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
              Click "+ Issue First Bill" to create an itemized room billing statement.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn-main" 
                disabled={!isRegisterOpen}
                onClick={() => {
                  if (!isRegisterOpen) {
                    alert('Shift Register is Closed. Please open the shift register to issue bills.');
                    return;
                  }
                  setEditingBill(null); 
                  setIsModalOpen(true); 
                }}
                title={isRegisterOpen ? 'Issue First Bill' : 'Shift Register is Closed (View-Only Mode)'}
              >
                <Plus size={16} /> Issue First Bill
              </button>
            </div>
          </div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>BILL NO.</th>
                <th>GUEST / STAY RECORD</th>
                <th>ROOM CHARGE</th>
                <th>ADD-ONS</th>
                <th>TOTAL BILL</th>
                <th style={{ textAlign: 'center' }}>RECEIPT</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    No bill statements match search query "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="tag-badge">{b.id}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.guestName || 'Walk-in Guest'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {b.bookingId ? `Stay ID: ${b.bookingId} (Room ${b.roomNo || 'N/A'})` : 'Standalone Bill'}
                      </div>
                    </td>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(b.roomCharge)}</td>
                    <td>
                      {b.addOns && b.addOns.length > 0 ? (
                        <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>
                          {b.addOns.length} add-on(s) ({b.addOns.map((a) => a.name || 'Service').join(', ')})
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontWeight: 800, color: '#d97706', fontSize: '15px' }}>
                      {formatCurrency(b.total)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-sub"
                        style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
                        onClick={() => setViewingInvoiceBill(b)}
                        title="Preview bill & export receipt"
                      >
                        <Eye size={14} color="#d97706" /> Preview Receipt
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="icon-btn"
                          style={{ color: '#0284c7' }}
                          disabled={!isRegisterOpen}
                          onClick={() => {
                            if (!isRegisterOpen) {
                              alert('Shift Register is Closed. Please open the shift register to edit bills.');
                              return;
                            }
                            setEditingBill(b);
                          }}
                          title={isRegisterOpen ? "Edit Bill Statement" : "Shift Register is Closed (View-Only Mode)"}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="icon-btn"
                          style={{ color: '#be123c' }}
                          disabled={!isRegisterOpen}
                          onClick={() => handleDeleteBill(b)}
                          title={isRegisterOpen ? "Delete Bill" : "Shift Register is Closed (View-Only Mode)"}
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

      {(isModalOpen || editingBill) && (
        <BillModal
          isOpen={isModalOpen || Boolean(editingBill)}
          initialData={editingBill}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBill(null);
          }}
          onCreated={(newBill) => {
            setViewingInvoiceBill(newBill);
            setEditingBill(null);
          }}
        />
      )}

      {viewingInvoiceBill && (
        <BillInvoiceModal
          bill={viewingInvoiceBill}
          onClose={() => setViewingInvoiceBill(null)}
          onEditBill={(b) => {
            setViewingInvoiceBill(null);
            setEditingBill(b);
          }}
        />
      )}
    </div>
  );
};

