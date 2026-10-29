import React, { useEffect, useMemo, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';
import { PageHeaderActions } from './PageHeaderActions';
import { computeMonthBreakdown } from '../utils/paymentBreakdown';
import { PaymentBreakdownBar } from './PaymentBreakdownBar';
import { exportToCSV, formatCurrency, localDateStr } from '../utils/formatters';
import {
  Download, BookOpen, FileText, Receipt, AlertCircle, Building2, Layers,
  Plus, Check, MoreHorizontal, ChevronLeft, ChevronRight, Copy
} from 'lucide-react';

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
    balanceOf: (b) => (parseFloat(b.totalAmount) || 0) - (parseFloat(b.amountPaid) || 0),
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

// "[CODE] Name" for the Property column and file names
const propertyLabel = (item) => {
  const name = item.propertyName || '';
  return item.propertyCode ? `[${item.propertyCode}] ${name}`.trim() : name;
};

// Date string offset from today, as YYYY-MM-DD in local time
const shiftDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateStr(d);
};

const card = {
  background: '#ffffff',
  border: '1px solid var(--border-color)',
  borderRadius: 16,
  padding: '16px 18px'
};

const sectionLabel = {
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--text-main)',
  marginBottom: 10
};

// Check badge for selected cards, or an empty circle when not selected
const SelectMark = ({ selected, color = '#f59e0b' }) => (
  <span style={{
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: selected ? 'none' : '1.5px solid #cbd5e1',
    background: selected ? color : '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }}>
    {selected && <Check size={12} color="#ffffff" strokeWidth={3} />}
  </span>
);

export const Reports = () => {
  const { bookings, bills, expenses, propertiesList = [], activePropertyId, isSuperAdmin, isAdmin } = useHotel();
  const [reportType, setReportType] = useState('bookings');
  const [fromDate, setFromDate] = useState(() => `${localDateStr().slice(0, 8)}01`);
  const [toDate, setToDate] = useState(() => localDateStr());
  // Properties are all selected by default; this list holds the ones the user unticked
  const [excludedIds, setExcludedIds] = useState([]);
  const [outputMode, setOutputMode] = useState('combined');
  const [allRecords, setAllRecords] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openMenuRow, setOpenMenuRow] = useState(null);

  const hasAllAccess = isSuperAdmin || isAdmin;

  // Admins get bookings, bills and expenses for every property in one request
  useEffect(() => {
    if (!hasAllAccess) return;
    let cancelled = false;
    api.getReportRecords()
      .then((data) => { if (!cancelled) setAllRecords(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [hasAllAccess]);

  const activeProperty = propertiesList.find((p) => p.firmId === activePropertyId);

  // Managers only see their own property, so their current-property data is tagged with it
  const sourceOf = useMemo(() => {
    if (hasAllAccess) return allRecords || { bookings: [], bills: [], expenses: [] };
    const own = (list) => (list || []).map((item) => ({
      ...item,
      firmId: activePropertyId,
      propertyCode: activeProperty?.propertyCode || '',
      propertyName: activeProperty?.firmName || ''
    }));
    return { bookings: own(bookings), bills: own(bills), expenses: own(expenses) };
  }, [hasAllAccess, allRecords, bookings, bills, expenses, activePropertyId, activeProperty]);

  const report = REPORTS[reportType];
  const rangeIsValid = fromDate && toDate && fromDate <= toDate;
  const excludedSet = useMemo(() => new Set(excludedIds), [excludedIds]);
  const allSelected = excludedIds.length === 0;
  const selectedCount = propertiesList.filter((p) => !excludedSet.has(p.firmId)).length;

  const toggleProperty = (firmId) => {
    setExcludedIds((prev) => (prev.includes(firmId) ? prev.filter((id) => id !== firmId) : [...prev, firmId]));
  };

  // Live preview: the records in the selected range and selected properties
  const records = useMemo(() => {
    if (!rangeIsValid) return [];
    const inRange = (item) => {
      const day = dayOf(report.dateOf(item));
      return day >= fromDate && day <= toDate;
    };
    const items = (sourceOf[reportType] || []).filter((item) => !excludedSet.has(item.firmId) && inRange(item));
    return report.select(items);
  }, [reportType, fromDate, toDate, rangeIsValid, sourceOf, excludedSet]);

  // Paging: start again from the first page whenever the result changes
  useEffect(() => { setPage(0); setOpenMenuRow(null); }, [reportType, fromDate, toDate, excludedIds, pageSize]);
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * pageSize;
  const pageRows = records.slice(pageStart, pageStart + pageSize);

  const total = records.reduce((sum, item) => sum + report.amountOf(item), 0);
  const propertiesInResult = new Set(records.map((item) => item.firmId)).size;

  const copyText = (text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(String(text ?? '')).catch(() => {});
    setOpenMenuRow(null);
  };

  const handleDownload = () => {
    if (!rangeIsValid || records.length === 0) return;
    const options = { docType: 'report', folder: reportType };

    if (outputMode === 'combined') {
      const rows = records.map((item) => [propertyLabel(item), ...report.row(item)]);
      exportToCSV(`${reportType}_${fromDate}_to_${toDate}.csv`, ['Property', ...report.headers], rows, options);
      return;
    }

    // One CSV per property that has records in the range
    const byProperty = new Map();
    records.forEach((item) => {
      if (!byProperty.has(item.firmId)) byProperty.set(item.firmId, []);
      byProperty.get(item.firmId).push(item);
    });
    byProperty.forEach((items) => {
      const code = items[0].propertyCode || items[0].firmId;
      exportToCSV(`${reportType}_${code}_${fromDate}_to_${toDate}.csv`, report.headers, items.map(report.row), options);
    });
  };

  const tableHeaders = [
    'Property',
    ...report.headers,
    ...(report.balanceOf ? ['Balance (INR)'] : []),
    'Actions'
  ];

  return (
    <div className="reports-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Reports</h1>
          <p className="page-subheading">
            Export bookings, bills and expenses for a date range. Each report is downloaded and saved to Dropbox.
          </p>
        </div>
        <PageHeaderActions />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <PaymentBreakdownBar items={computeMonthBreakdown(bookings)} />
      </div>

      {/* Properties: all selected by default, tick individual ones to narrow the report */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <Building2 size={18} color="#4f46e5" />
          <span style={{ fontWeight: 800, fontSize: 15 }}>Properties</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', background: '#f1f5f9', borderRadius: 12, padding: '3px 10px' }}>
            {propertiesList.length} {propertiesList.length === 1 ? 'Property' : 'Properties'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
            {allSelected ? 'All properties selected' : `${selectedCount} of ${propertiesList.length} selected`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {hasAllAccess && (
            <button
              type="button"
              onClick={() => setExcludedIds([])}
              style={{
                flex: '0 0 200px',
                minHeight: 96,
                textAlign: 'left',
                borderRadius: 14,
                padding: 14,
                cursor: 'pointer',
                border: allSelected ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                background: allSelected ? '#0f172a' : '#ffffff',
                color: allSelected ? '#ffffff' : 'var(--text-main)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Layers size={18} />
                {allSelected && <SelectMark selected color="#f59e0b" />}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>All Properties</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>All hotels in portfolio</div>
              </div>
            </button>
          )}

          {propertiesList.map((p) => {
            const active = !excludedSet.has(p.firmId);
            return (
              <button
                key={p.firmId}
                type="button"
                onClick={() => toggleProperty(p.firmId)}
                style={{
                  flex: '0 0 200px',
                  minHeight: 96,
                  textAlign: 'left',
                  borderRadius: 14,
                  padding: 14,
                  cursor: 'pointer',
                  border: active ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  background: active ? '#fff7ed' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Building2 size={18} color="#4f46e5" />
                  <SelectMark selected={active} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.propertyCode || p.firmName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.firmName}
                  </div>
                </div>
              </button>
            );
          })}

          {hasAllAccess && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-add-property'))}
              style={{
                flex: '0 0 170px',
                minHeight: 96,
                borderRadius: 14,
                border: '1.5px dashed #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: 'var(--text-main)',
                fontWeight: 700,
                fontSize: 13
              }}
            >
              <Plus size={20} /> Add / Manage Properties
            </button>
          )}
        </div>
      </div>

      {/* Report type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {Object.entries(REPORTS).map(([key, item]) => {
          const Icon = item.icon;
          const isActive = reportType === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setReportType(key)}
              style={{
                ...card,
                textAlign: 'left',
                cursor: 'pointer',
                border: isActive ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                background: isActive ? '#fffbeb' : '#ffffff',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: isActive ? '#ffedd5' : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={18} color={isActive ? '#ea580c' : '#64748b'} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontWeight: 800, color: 'var(--text-main)' }}>
                  {item.label}
                  <SelectMark selected={isActive} />
                </span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Output format, date range and download */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ ...sectionLabel, marginBottom: 0 }}>Output Format</div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>
            {records.length} record{records.length === 1 ? '' : 's'} • {propertiesInResult} propert{propertiesInResult === 1 ? 'y' : 'ies'} • Total {formatCurrency(total)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { key: 'combined', label: 'One combined CSV', hint: 'One file with a Property column' },
            { key: 'separate', label: 'Separate CSV per property', hint: 'One file for each property' },
          ].map((option) => {
            const active = outputMode === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setOutputMode(option.key)}
                style={{
                  flex: '1 1 240px',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: active ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: active ? '#f0f9ff' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <SelectMark selected={active} color="#0284c7" />
                <span>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{option.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>FROM</label>
            <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TO</label>
            <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>QUICK RANGE</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: 'This month', from: `${localDateStr().slice(0, 8)}01`, to: localDateStr() },
                { label: 'Last 7 days', from: shiftDays(-6), to: localDateStr() },
                { label: 'Today', from: localDateStr(), to: localDateStr() },
              ].map((preset) => {
                const active = fromDate === preset.from && toDate === preset.to;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className="btn-sub"
                    style={{
                      fontSize: '12px',
                      padding: '8px 12px',
                      borderColor: active ? '#2563eb' : undefined,
                      color: active ? '#2563eb' : undefined,
                      background: active ? '#eff6ff' : undefined
                    }}
                    onClick={() => { setFromDate(preset.from); setToDate(preset.to); }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!rangeIsValid || records.length === 0}
            style={{
              marginLeft: 'auto',
              padding: '12px 22px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(90deg, #f59e0b, #f97316)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              cursor: rangeIsValid && records.length > 0 ? 'pointer' : 'not-allowed',
              opacity: rangeIsValid && records.length > 0 ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 16px rgba(249, 115, 22, 0.3)'
            }}
          >
            <Download size={16} /> Download CSV & save to Dropbox
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{ marginTop: '12px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} /> {loadError}
        </div>
      )}

      {!rangeIsValid && (
        <div style={{ marginTop: '12px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} /> Choose a valid range: the "From" date must be on or before "To".
        </div>
      )}

      {rangeIsValid && records.length === 0 && (
        <div style={{ ...card, marginTop: 14, padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          No {report.label.toLowerCase()} in this date range{!allSelected ? ' for the selected properties' : ''}.
        </div>
      )}

      {rangeIsValid && records.length > 0 && (
        <div style={{ ...card, marginTop: 14, padding: '8px 12px 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {tableHeaders.map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((item, i) => {
                const rowIndex = pageStart + i;
                const cells = report.row(item);
                const menuOpen = openMenuRow === rowIndex;
                const cell = { padding: '10px', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' };
                return (
                  <tr key={`${item.id || 'row'}-${rowIndex}`}>
                    <td style={cell}>{propertyLabel(item)}</td>
                    {cells.map((value, j) => (
                      <td key={j} style={cell}>{value ?? ''}</td>
                    ))}
                    {report.balanceOf && (
                      <td style={cell}>{formatCurrency(report.balanceOf(item))}</td>
                    )}
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuRow(menuOpen ? null : rowIndex)}
                          title="Actions"
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {menuOpen && (
                          <>
                            <button type="button" className="btn-sub" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => copyText(item.id)}>
                              <Copy size={12} /> Copy ID
                            </button>
                            <button type="button" className="btn-sub" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => copyText([propertyLabel(item), ...cells].join('\t'))}>
                              <Copy size={12} /> Copy row
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '12px 4px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff' }}
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>{pageStart + 1}–{Math.min(records.length, pageStart + pageSize)} of {records.length}</span>
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', cursor: currentPage >= pageCount - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage >= pageCount - 1 ? 0.4 : 1 }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
