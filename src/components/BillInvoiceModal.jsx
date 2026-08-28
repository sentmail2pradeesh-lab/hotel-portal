import React, { useRef } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toPng } from 'html-to-image';
import { Download, Printer, X, Building2, Edit3, FileText } from 'lucide-react';
import { useHotel } from '../context/HotelContext';

export const BillInvoiceModal = ({ bill, onClose, onEditBill }) => {
  const { currentUser } = useHotel();
  const invoiceRef = useRef(null);

  if (!bill) return null;

  const handleDownloadImage = async () => {
    if (invoiceRef.current) {
      try {
        const dataUrl = await toPng(invoiceRef.current, { quality: 0.95 });
        const link = document.createElement('a');
        link.download = `${bill.id}_${(bill.guestName || 'bill').replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to export invoice image:', err);
        alert('Unable to generate invoice image. Please try standard print.');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="#d97706" />
            <h2 className="modal-heading">Official Guest Statement</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Printable Invoice Statement Card */}
        <div 
          ref={invoiceRef}
          id="invoice-printable-area"
          style={{ 
            backgroundColor: '#ffffff', 
            border: '2px solid #0f172a',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            color: '#0f172a',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 15px rgba(15, 23, 42, 0.2)' }}>
                {currentUser?.firmLogo ? (
                  <img src={currentUser.firmLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Building2 size={24} />
                )}
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  {currentUser?.firmName || 'Property Receipt Statement'}
                </h1>
                <p style={{ fontSize: '11px', color: '#d97706', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Official Front Desk Receipt
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="tag-badge" style={{ fontSize: '13px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>{bill.id}</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Date: {formatDate(bill.date || new Date().toISOString())}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px', fontSize: '13px' }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 800, display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>GUEST VISITOR</span>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>{bill.guestName || 'Walk-in Guest'}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 800, display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>STAY / SUITE RECORD</span>
              <strong style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: '#0284c7' }}>
                {bill.bookingId ? `${bill.bookingId} (Room ${bill.roomNo || 'N/A'})` : 'Standalone Bill'}
              </strong>
            </div>
          </div>

          {/* Line items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800 }}>ITEM / DESCRIPTION</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800 }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', color: '#0f172a', fontWeight: 600 }}>Room Accommodation Charge</td>
                <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a' }}>
                  {formatCurrency(bill.roomCharge)}
                </td>
              </tr>
              {bill.addOns && bill.addOns.map((addon, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    + {addon.name || 'Add-on service'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'var(--font-mono)', color: '#047857', fontWeight: 700 }}>
                    {formatCurrency(addon.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px dashed #cbd5e1', paddingTop: '18px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800, display: 'block', letterSpacing: '0.08em' }}>GRAND TOTAL DUE</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 800, color: '#d97706' }}>
                {formatCurrency(bill.total)}
              </div>
            </div>
          </div>

          {/* Footer & Authorized E-Signature */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.5 }}>
              Thank you for staying with {currentUser?.firmName || 'us'}.<br />
              Payment receipt verified by Property Front Desk.
            </div>

            <div style={{ textAlign: 'center', minWidth: '160px' }}>
              {currentUser?.eSignature ? (
                <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                  <img src={currentUser.eSignature} alt="Authorized Signature" style={{ maxHeight: '44px', maxWidth: '140px', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ height: '32px', borderBottom: '1px dashed #94a3b8', marginBottom: '6px' }} />
              )}
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>{currentUser?.name || 'Property Manager'}</div>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authorized Property Signature</div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-sub" onClick={onClose}>Close</button>
          
          {onEditBill && (
            <button 
              className="btn-sub" 
              style={{ color: '#0284c7', borderColor: '#0284c7' }} 
              onClick={() => {
                onEditBill(bill);
                onClose();
              }}
            >
              <Edit3 size={15} /> Edit Bill
            </button>
          )}

          <button className="btn-sub" onClick={handlePrint}>
            <Printer size={15} /> Print Receipt
          </button>
          
          <button className="btn-main" onClick={handleDownloadImage}>
            <Download size={15} /> Download Bill Image
          </button>
        </div>
      </div>
    </div>
  );
};
