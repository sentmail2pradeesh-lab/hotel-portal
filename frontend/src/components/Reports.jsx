import React, { useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { exportToCSV, formatCurrency, localDateStr } from '../utils/formatters';
import { Download, BookOpen, FileText, Receipt, AlertCircle } from 'lucide-react';

// Dates are compared as YYYY-MM-DD strings, which sort correctly
const dayOf = (value) => String(value || '').slice(0, 10);

// Each report picks its records by date, then maps them to CSV columns
const REPORTS = {
  bookings: {
    label: 'Bookings',
    description: 'Stays by check-in date, with amounts and payment status',
    icon: BookOpen,
    dateOf: (b) => b.checkIn,
    select: (items) => items.filter((b) => b.status !== 'Draft'),
    amountOf: (b) => parseFloat(b.totalAmount) || 0,
    headers: ['Booking ID', 'Guest', 'Phone', 'Room', 'Check-in', 'Check-out', 'Status', 'Booking Type', 'Total (INR)', 'Paid (INR)', 'Payment Status', 'Paid Via'],
    row: (b) => [b.id, b.guestName, b.phone, b.room, dayOf(b.checkIn), dayOf(b.checkOut), b.status, b.bookingType, b.totalAmount, b.amountPaid, b.paymentStatus, b.paidVia],
  },
  bills: {
    label: 'Bills & add-ons',
    description: 'Guest bills by bill date, with room charges and totals',
    icon: FileText,
    dateOf: (b) => b.date,
    select: (items) => items,
    amountOf: (b) => parseFloat(b.total) || 0,
    headers: ['Bill No', 'Bill ID', 'Date', 'Guest', 'Room', 'Room Charge (INR)', 'Total (INR)'],
    row: (b) => [b.billNumber || b.id, b.id, dayOf(b.date), b.guestName, b.roomNo, b.roomCharge, b.total],
  },
  expenses: {
    label: 'Daily expenses',
    description: 'Expenses by date and category',
    icon: Receipt,
    dateOf: (e) => e.date,
    select: (items) => items,
    amountOf: (e) => parseFloat(e.amount) || 0,
    headers: ['Date', 'Expense ID', 'Category', 'Description', 'Amount (INR)'],
    row: (e) => [dayOf(e.date), e.id, e.category, e.description, e.amount],
  },
};

export const Reports = () => {
  const { bookings, bills, expenses } = useHotel();
  const [reportType, setReportType] = useState('bookings');
  const [fromDate, setFromDate] = useState(() => `${localDateStr().slice(0, 8)}01`);
  const [toDate, setToDate] = useState(() => localDateStr());

  const report = REPORTS[reportType];
  const sourceOf = { bookings, bills, expenses };
  const rangeIsValid = fromDate && toDate && fromDate <= toDate;

  // Live preview: the records that fall in the selected range
  const records = useMemo(() => {
    if (!rangeIsValid) return [];
    const inRange = (item) => {
      const day = dayOf(report.dateOf(item));
      return day >= fromDate && day <= toDate;
    };
    return report.select((sourceOf[reportType] || []).filter(inRange));
  }, [reportType, fromDate, toDate, rangeIsValid, bookings, bills, expenses]);

  const total = records.reduce((sum, item) => sum + report.amountOf(item), 0);

  const handleDownload = () => {
    if (!rangeIsValid || records.length === 0) return;
    const rows = records.map(report.row);
    const fileName = `${reportType}_${fromDate}_to_${toDate}.csv`;
    // Downloads the file and saves a copy to the matching Dropbox folder (bookings, bills or expenses)
    exportToCSV(fileName, report.headers, rows, { docType: 'report', folder: reportType });
  };

  return (
    <div className="reports-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Reports</h1>
          <p className="page-subheading">
            Export bookings, bills and expenses for a date range. Each report is downloaded and saved to Dropbox.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
        {Object.entries(REPORTS).map(([key, item]) => {
          const Icon = item.icon;
          const isActive = reportType === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setReportType(key)}
              className="card-container"
              style={{
                textAlign: 'left',
                padding: '16px',
                cursor: 'pointer',
                border: isActive ? '2px solid #0284c7' : '1px solid var(--border-color)',
                background: isActive ? '#f0f9ff' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
                <Icon size={16} color="#0284c7" /> {item.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.description}</div>
            </button>
          );
        })}
      </div>

      <div className="card-container" style={{ padding: '18px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>FROM</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TO</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'This month', from: `${localDateStr().slice(0, 8)}01`, to: localDateStr() },
            { label: 'Last 7 days', from: shiftDays(-6), to: localDateStr() },
            { label: 'Today', from: localDateStr(), to: localDateStr() },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="btn-sub"
              style={{ fontSize: '12px', padding: '7px 10px' }}
              onClick={() => { setFromDate(preset.from); setToDate(preset.to); }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {records.length} record{records.length === 1 ? '' : 's'} • Total {formatCurrency(total)}
          </div>
          <button
            type="button"
            className="btn-main"
            style={{ marginTop: '6px' }}
            onClick={handleDownload}
            disabled={!rangeIsValid || records.length === 0}
          >
            <Download size={15} /> Download CSV & save to Dropbox
          </button>
        </div>
      </div>

      {!rangeIsValid && (
        <div style={{ marginTop: '12px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} /> Choose a valid range: the "From" date must be on or before "To".
        </div>
      )}

      {rangeIsValid && records.length === 0 && (
        <div className="card-container" style={{ marginTop: '14px', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          No {report.label.toLowerCase()} in this date range.
        </div>
      )}

      {rangeIsValid && records.length > 0 && (
        <div className="card-container" style={{ marginTop: '14px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {report.headers.map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 200).map((item, idx) => (
                <tr key={`${item.id || idx}-${idx}`}>
                  {report.row(item).map((cell, i) => (
                    <td key={i} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                      {cell ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {records.length > 200 && (
            <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing the first 200 of {records.length} records. The download includes all of them.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Date string offset from today, as YYYY-MM-DD in local time
const shiftDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateStr(d);
};
