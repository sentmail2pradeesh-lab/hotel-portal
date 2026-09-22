import React, { useState, useMemo } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  X, 
  ArrowRight, 
  BedDouble, 
  Clock, 
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

export const ImportBookingsModal = ({ onClose }) => {
  const { bulkImportBookings, bookings, roomsList, isRegisterOpen } = useHotel();

  const [csvFile, setCsvFile] = useState(null);
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMappingConfig, setShowMappingConfig] = useState(false);

  // Existing booking reference IDs for duplicate detection
  const existingIdsSet = useMemo(() => {
    const s = new Set();
    (bookings || []).forEach(b => {
      if (b.id) s.add(b.id.toLowerCase());
      if (b.manualId) s.add(b.manualId.toLowerCase());
    });
    return s;
  }, [bookings]);

  // Valid rooms set
  const validRoomsSet = useMemo(() => {
    return new Set((roomsList || []).map(r => r.toString().toLowerCase().trim()));
  }, [roomsList]);

  // Download Sample CSV Template
  const handleDownloadSampleTemplate = () => {
    const sampleHeaders = [
      'Booking ID',
      'Guest Name',
      'Phone Number',
      'Email',
      'Room Number',
      'Check In Date',
      'Check Out Date',
      'Amount Paid',
      'Payment Mode',
      'Booking Source',
      'No of Guests'
    ];

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 4);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const sampleRows = [
      ['OYO-98241', 'Vikram Rathore', '9876543210', 'vikram@gmail.com', '101', todayStr, nextWeekStr, '4800', 'Online Pre-paid', 'OYO', '2'],
      ['OYO-98242', 'Ananya Sen', '9812345678', 'ananya@outlook.com', '202', todayStr, nextWeekStr, '3600', 'Pay at Hotel', 'OYO', '1'],
      ['BK-MMT-103', 'Rohan Mehra', '9988776655', 'rohan@yahoo.com', '301', '2026-10-01', '2026-10-04', '5400', 'UPI', 'MakeMyTrip', '3']
    ];

    const csvContent = [
      sampleHeaders.join(','),
      ...sampleRows.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_oyo_bookings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Robust client-side CSV parser
  const parseCSV = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length > 0 && values.some(v => v.length > 0)) {
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }
    }
    return { headers, rows };
  };

  // Intelligent column auto-detector
  const detectColumns = (headers) => {
    const mapping = {
      bookingId: '',
      guestName: '',
      phone: '',
      email: '',
      room: '',
      checkIn: '',
      checkOut: '',
      amountPaid: '',
      paidVia: '',
      bookingType: '',
      guestCount: ''
    };

    const clean = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    headers.forEach(h => {
      const c = clean(h);
      if (!mapping.bookingId && (c.includes('bookingid') || c.includes('oyoid') || c.includes('orderid') || c.includes('reference') || c.includes('resid') || c === 'id')) {
        mapping.bookingId = h;
      } else if (!mapping.guestName && (c.includes('guestname') || c.includes('customername') || c.includes('guest') || c.includes('customer') || c.includes('traveler') || c === 'name')) {
        mapping.guestName = h;
      } else if (!mapping.phone && (c.includes('phone') || c.includes('mobile') || c.includes('contact') || c.includes('cell'))) {
        mapping.phone = h;
      } else if (!mapping.email && (c.includes('email') || c.includes('mail'))) {
        mapping.email = h;
      } else if (!mapping.room && (c.includes('roomno') || c.includes('roomnumber') || c.includes('suite') || c === 'room' || c.includes('allottedroom'))) {
        mapping.room = h;
      } else if (!mapping.checkIn && (c.includes('checkin') || c.includes('arrival') || c.includes('startdate') || c.includes('fromdate') || c.includes('checkindate'))) {
        mapping.checkIn = h;
      } else if (!mapping.checkOut && (c.includes('checkout') || c.includes('departure') || c.includes('enddate') || c.includes('todate') || c.includes('checkoutdate'))) {
        mapping.checkOut = h;
      } else if (!mapping.amountPaid && (c.includes('amountpaid') || c.includes('totalamount') || c.includes('tariff') || c.includes('price') || c.includes('gross') || c === 'amount' || c === 'total')) {
        mapping.amountPaid = h;
      } else if (!mapping.paidVia && (c.includes('paidvia') || c.includes('paymentmode') || c.includes('paymentstatus') || c.includes('paymentmethod') || c.includes('paymode'))) {
        mapping.paidVia = h;
      } else if (!mapping.bookingType && (c.includes('source') || c.includes('channel') || c.includes('portal') || c.includes('bookingtype'))) {
        mapping.bookingType = h;
      } else if (!mapping.guestCount && (c.includes('guests') || c.includes('guestcount') || c.includes('adults') || c.includes('pax') || c.includes('noofguests'))) {
        mapping.guestCount = h;
      }
    });

    return mapping;
  };

  // Process File
  const handleFileProcess = (file) => {
    if (!file) return;
    setCsvFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvRawText(text);
      const { headers, rows } = parseCSV(text);
      setParsedHeaders(headers);
      setParsedRows(rows);
      const autoMap = detectColumns(headers);
      setColumnMapping(autoMap);
    };
    reader.readAsText(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Date standardizer helper
  const standardizeDate = (val) => {
    if (!val) return '';
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      return clean.split('T')[0];
    }
    const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }
    const mdy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (mdy) {
      const month = mdy[1].padStart(2, '0');
      const day = mdy[2].padStart(2, '0');
      const year = mdy[3];
      return `${year}-${month}-${day}`;
    }
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
    return clean;
  };

  // Mapped Rows for Preview & Import
  const mappedRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return parsedRows.map((row, index) => {
      const refId = (row[columnMapping.bookingId] || '').trim();
      const guest = (row[columnMapping.guestName] || '').trim() || `Guest ${index + 1}`;
      const phone = (row[columnMapping.phone] || '').trim();
      const email = (row[columnMapping.email] || '').trim();
      const roomRaw = (row[columnMapping.room] || '').trim();
      const checkIn = standardizeDate(row[columnMapping.checkIn]) || todayStr;
      const checkOut = standardizeDate(row[columnMapping.checkOut]) || todayStr;
      const amount = parseFloat(String(row[columnMapping.amountPaid] || '0').replace(/[^0-9.]/g, '')) || 0;
      const paidVia = (row[columnMapping.paidVia] || 'Online Pre-paid').trim();
      const portal = (row[columnMapping.bookingType] || 'OYO').trim();
      const guests = parseInt(String(row[columnMapping.guestCount] || '1').replace(/[^0-9]/g, ''), 10) || 1;

      const isDuplicate = Boolean(
        refId && existingIdsSet.has(refId.toLowerCase())
      );

      const isRoomValid = Boolean(roomRaw && validRoomsSet.has(roomRaw.toLowerCase()));

      let stayCategory = 'Upcoming';
      if (checkOut < todayStr) {
        stayCategory = 'Completed';
      } else if (checkIn <= todayStr && checkOut >= todayStr) {
        stayCategory = 'In-House';
      }

      return {
        manualId: refId || `EXT-${index + 101}`,
        guestName: guest,
        phone,
        email,
        room: isRoomValid ? roomRaw : '',
        rawRoom: roomRaw,
        isRoomValid,
        checkIn,
        checkOut,
        amountPaid: amount,
        paidVia,
        bookingType: portal || 'OYO',
        guestCount: guests,
        stayCategory,
        isDuplicate
      };
    });
  }, [parsedRows, columnMapping, existingIdsSet, validRoomsSet]);

  const validCount = mappedRecords.filter(r => !r.isDuplicate).length;
  const duplicateCount = mappedRecords.filter(r => r.isDuplicate).length;

  // Execute Import
  const handleExecuteImport = async () => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open shift register to import bookings.');
      return;
    }
    const importPayload = mappedRecords
      .filter(r => !r.isDuplicate)
      .map(r => ({
        manualId: r.manualId,
        guestName: r.guestName,
        phone: r.phone,
        email: r.email,
        room: r.room || null,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        amountPaid: r.amountPaid,
        paidVia: r.paidVia,
        bookingType: r.bookingType,
        guestCount: r.guestCount
      }));

    if (importPayload.length === 0) {
      alert('No new valid bookings to import. All rows are already registered.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await bulkImportBookings(importPayload);
      setImportResult({
        success: true,
        importedCount: res.importedCount || importPayload.length,
        skippedCount: res.skippedDuplicatesCount || duplicateCount
      });
    } catch (err) {
      alert(err.message || 'Error occurred while importing bookings.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '980px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="metric-icon-badge blue" style={{ width: '32px', height: '32px' }}>
                <UploadCloud size={18} />
              </span>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '19px', fontWeight: 800 }}>
                Import External Bookings (OYO, OTA & CSV)
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 40px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Bulk import reservation lists exported from OYO, MakeMyTrip, Agoda, or custom spreadsheets.
            </p>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {importResult ? (
          /* SUCCESS STATE */
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#065f46', margin: 0 }}>
              Import Completed Successfully!
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              <strong>{importResult.importedCount}</strong> reservations have been mapped and added to the system.
              {importResult.skippedCount > 0 && ` (${importResult.skippedCount} duplicate bookings were safely skipped).`}
            </p>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                className="btn-main" 
                onClick={onClose}
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
                View Bookings Registry
              </button>
            </div>
          </div>
        ) : (
          /* UPLOAD & PREVIEW WORKFLOW */
          <div>
            {/* Top Toolbar: Template download & quick instructions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #e2e8f0',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <FileText size={15} color="#0284c7" />
                <span>Need formatting reference? Download our pre-configured CSV template.</span>
              </div>
              <button
                type="button"
                className="btn-sub"
                onClick={handleDownloadSampleTemplate}
                style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px' }}
              >
                <Download size={14} color="#0284c7" /> Download Sample CSV Template
              </button>
            </div>

            {/* Dropzone Area */}
            {!csvFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                  background: isDragOver ? '#eff6ff' : '#fdfdfe',
                  borderRadius: 'var(--radius-lg)',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '20px'
                }}
                onClick={() => document.getElementById('csv-file-input').click()}
              >
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileProcess(e.target.files[0])}
                />
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}>
                  <UploadCloud size={28} color="#2563eb" />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Click to select or drag & drop CSV file here
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Supports CSV exports from OYO, MakeMyTrip, Agoda, Booking.com, or Excel (.csv)
                </p>
              </div>
            ) : (
              /* FILE SELECTED SUMMARY BAR */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                      {csvFile.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#15803d', marginLeft: '10px' }}>
                      ({parsedRows.length} rows parsed)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-sub"
                    style={{ fontSize: '12px', padding: '5px 10px' }}
                    onClick={() => setShowMappingConfig(prev => !prev)}
                  >
                    <RefreshCw size={13} /> {showMappingConfig ? 'Hide Column Mapping' : 'Adjust Column Mapping'}
                  </button>
                  <button
                    type="button"
                    className="btn-sub"
                    style={{ fontSize: '12px', padding: '5px 10px', color: '#dc2626' }}
                    onClick={() => {
                      setCsvFile(null);
                      setParsedRows([]);
                    }}
                  >
                    Replace File
                  </button>
                </div>
              </div>
            )}

            {/* COLUMN MAPPING OVERRIDE PANEL */}
            {csvFile && showMappingConfig && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                  Map CSV Columns to System Fields:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px'
                }}>
                  {[
                    { key: 'bookingId', label: 'Booking Ref ID' },
                    { key: 'guestName', label: 'Guest Name *' },
                    { key: 'phone', label: 'Phone Number' },
                    { key: 'email', label: 'Email' },
                    { key: 'room', label: 'Suite / Room No' },
                    { key: 'checkIn', label: 'Check-in Date *' },
                    { key: 'checkOut', label: 'Check-out Date *' },
                    { key: 'amountPaid', label: 'Amount Paid' },
                    { key: 'paidVia', label: 'Payment Mode' },
                    { key: 'bookingType', label: 'Channel / Source' },
                    { key: 'guestCount', label: 'Guest Count' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                        {label}
                      </label>
                      <select
                        className="form-select"
                        style={{ fontSize: '12px', padding: '4px 8px', width: '100%' }}
                        value={columnMapping[key] || ''}
                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [key]: e.target.value }))}
                      >
                        <option value="">(None / Skip)</option>
                        {parsedHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIVE PREVIEW TABLE */}
            {csvFile && parsedRows.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    Previewing {mappedRecords.length} Records:
                    <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>
                      ● {validCount} Ready to Import
                    </span>
                    {duplicateCount > 0 && (
                      <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 600, color: '#b45309' }}>
                        ● {duplicateCount} Existing Duplicates (Skipped)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  maxHeight: '320px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px'
                }}>
                  <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px' }}>Ref ID</th>
                        <th style={{ padding: '8px 12px' }}>Guest</th>
                        <th style={{ padding: '8px 12px' }}>Contact</th>
                        <th style={{ padding: '8px 12px' }}>Room</th>
                        <th style={{ padding: '8px 12px' }}>Check-in</th>
                        <th style={{ padding: '8px 12px' }}>Check-out</th>
                        <th style={{ padding: '8px 12px' }}>Amount</th>
                        <th style={{ padding: '8px 12px' }}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedRecords.map((r, i) => (
                        <tr 
                          key={i} 
                          style={{
                            background: r.isDuplicate ? '#fffbeb' : '#ffffff',
                            opacity: r.isDuplicate ? 0.65 : 1
                          }}
                        >
                          <td style={{ padding: '8px 12px' }}>
                            {r.isDuplicate ? (
                              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                Duplicate
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: r.stayCategory === 'In-House' ? '#ecfdf5' : r.stayCategory === 'Completed' ? '#f5f3ff' : '#eff6ff',
                                color: r.stayCategory === 'In-House' ? '#047857' : r.stayCategory === 'Completed' ? '#7c3aed' : '#2563eb'
                              }}>
                                {r.stayCategory}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {r.manualId}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                            {r.guestName}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                            {r.phone || '—'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {r.isRoomValid ? (
                              <span style={{ fontWeight: 700, color: '#047857' }}>
                                Suite {r.room}
                              </span>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '11px' }} title="Room will be assigned on front-desk arrival">
                                Unallotted
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            {formatDate(r.checkIn)}
                          </td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            {formatDate(r.checkOut)}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                            {formatCurrency(r.amountPaid)}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              color: '#334155'
                            }}>
                              {r.bookingType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-sub"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-main"
                    onClick={handleExecuteImport}
                    disabled={isLoading || validCount === 0 || !isRegisterOpen}
                    title={!isRegisterOpen ? 'Shift Register is Closed' : 'Import verified bookings'}
                    style={{ padding: '10px 22px' }}
                  >
                    {isLoading ? (
                      'Importing Bookings...'
                    ) : (
                      <>Import {validCount} Bookings <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
