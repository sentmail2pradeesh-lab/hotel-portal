import React, { useEffect, useState } from 'react';
import { EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate } from '../utils/formatters';

// Hidden (confidential) bookings for the active property. Only admin roles and permitted managers
// reach this list; these stays are left out of every other list, total, report and export.
export const ConfidentialBookingsTable = () => {
  const { activePropertyId } = useHotel();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.getConfidentialBookings(activePropertyId)
      .then((data) => { if (!cancelled) setRows(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load hidden bookings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activePropertyId]);

  const cell = { padding: '10px', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap', fontSize: 13 };
  const head = { textAlign: 'left', padding: '10px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#6d28d9' }}>
        <EyeOff size={15} />
        <span>
          Hidden bookings are not included in reports, totals, logs or exports. Only you can see this list.
        </span>
      </div>

      {error && (
        <div style={{ color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Loading hidden bookings...</div>
      ) : rows.length === 0 ? (
        <div className="card-container" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          No hidden bookings for this property.
        </div>
      ) : (
        <div className="card-container" style={{ overflowX: 'auto', padding: '8px 12px 12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Booking ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Status', 'Total', 'Paid', 'Balance'].map((h) => (
                  <th key={h} style={head}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const total = parseFloat(b.totalAmount) || 0;
                const paid = parseFloat(b.amountPaid) || 0;
                return (
                  <tr key={b.id}>
                    <td style={cell}>{b.manualId || b.id}</td>
                    <td style={cell}>{b.guestName}</td>
                    <td style={cell}>{b.room || '—'}</td>
                    <td style={cell}>{formatDate(b.checkIn)}</td>
                    <td style={cell}>{formatDate(b.checkOut)}</td>
                    <td style={cell}>{b.status}</td>
                    <td style={cell}>{formatCurrency(total)}</td>
                    <td style={cell}>{formatCurrency(paid)}</td>
                    <td style={cell}>{formatCurrency(total - paid)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
