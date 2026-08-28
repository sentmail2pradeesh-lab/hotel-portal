import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate, exportToCSV, confirmDouble } from '../utils/formatters';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  FileText, 
  User, 
  CheckCircle2, 
  BedDouble,
  Upload,
  FileSignature
} from 'lucide-react';

export const SettingsView = () => {
  const { 
    currentUser, 
    updateUserProfile,
    updateFirmLogo,
    updateESignature,
    roomsList, 
    addCustomRoom, 
    removeCustomRoom,
    bookings,
    expenses,
    bills
  } = useHotel();

  // Active section tab inside Settings: 'analytics' | 'rooms' | 'profile'
  const [section, setSection] = useState('analytics');

  // Room Management State
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [roomError, setRoomError] = useState('');
  const [roomSuccess, setRoomSuccess] = useState('');

  // Profile Update State
  const [firmName, setFirmName] = useState(currentUser?.firmName || '');
  const [managerName, setManagerName] = useState(currentUser?.name || '');
  const [workEmail, setWorkEmail] = useState(currentUser?.email || '');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Analytics Date Filter State: 'all' | 'today' | 'month' | 'year' | 'custom'
  const [filterMode, setFilterMode] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Add Room Handler
  const handleAddRoom = (e) => {
    e.preventDefault();
    setRoomError('');
    setRoomSuccess('');
    const res = addCustomRoom(newRoomNumber);
    if (!res.success) {
      setRoomError(res.message);
    } else {
      setRoomSuccess(`Room ${newRoomNumber.trim()} added successfully to inventory!`);
      setNewRoomNumber('');
    }
  };

  // Delete Room Handler
  const handleDeleteRoom = (roomNum) => {
    if (confirmDouble(
      `Remove Room ${roomNum} from property inventory?`,
      `PERMANENT DELETION: Are you double sure you want to remove Room ${roomNum}?`
    )) {
      removeCustomRoom(roomNum);
    }
  };

  // Profile Save Handler
  const handleProfileSave = (e) => {
    e.preventDefault();
    updateUserProfile(firmName, managerName, workEmail);
    setProfileSuccess('Property & manager profile updated successfully!');
    setTimeout(() => setProfileSuccess(''), 4000);
  };

  // Date Filtering Logic for Analytics
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4); // YYYY

  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false;
    const itemDateStr = dateStr.split('T')[0];

    if (filterMode === 'today') {
      return itemDateStr === todayStr;
    }
    if (filterMode === 'month') {
      return itemDateStr.startsWith(currentMonthStr);
    }
    if (filterMode === 'year') {
      return itemDateStr.startsWith(currentYearStr);
    }
    if (filterMode === 'custom') {
      if (customStartDate && itemDateStr < customStartDate) return false;
      if (customEndDate && itemDateStr > customEndDate) return false;
      return true;
    }
    return true; // 'all'
  };

  const filteredBookings = bookings.filter((b) => isDateInFilter(b.checkIn || b.createdAt));
  const filteredExpenses = expenses.filter((e) => isDateInFilter(e.date));
  const filteredBills = bills.filter((b) => isDateInFilter(b.date));

  const totalFilteredIntake = filteredBookings.reduce((sum, b) => sum + (parseFloat(b.amountPaid) || 0), 0);
  const totalFilteredOutflow = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netFilteredProfit = totalFilteredIntake - totalFilteredOutflow;

  // Build unified audit log rows for CSV export & table display
  const unifiedLogs = [
    ...filteredBookings.map(b => ({
      date: b.checkIn || b.createdAt,
      type: 'Stay Booking',
      refId: b.id,
      description: `Guest Stay: ${b.guestName} (Room ${b.room})`,
      category: 'Inflow',
      amount: b.amountPaid,
      paidVia: b.paidVia || 'Cash'
    })),
    ...filteredExpenses.map(e => ({
      date: e.date,
      type: 'Daily Expense',
      refId: e.id,
      description: `[${e.category}] ${e.description}`,
      category: 'Outflow',
      amount: -e.amount,
      paidVia: 'Cash Outflow'
    })),
    ...filteredBills.map(b => ({
      date: b.date,
      type: 'Issued Bill',
      refId: b.id,
      description: `Bill Statement: ${b.guestName} (Room ${b.roomNo})`,
      category: 'Billing',
      amount: b.total,
      paidVia: 'Receipt Issued'
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['Date', 'Log Type', 'Reference ID', 'Description', 'Category', 'Amount (INR)', 'Channel'];
    const rows = unifiedLogs.map(item => [
      formatDate(item.date),
      item.type,
      item.refId,
      item.description,
      item.category,
      item.amount,
      item.paidVia
    ]);
    exportToCSV(`property_financial_report_${filterMode}_${todayStr}.csv`, headers, rows);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const occupiedRoomsSet = new Set(bookings.map(b => b.room));

  return (
    <div className="settings-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Settings & Executive Analytics</h1>
          <p className="page-subheading">Manage property rooms, view filtered financial audit logs, and export summary reports.</p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="auth-tabs" style={{ maxWidth: '640px', marginBottom: '28px' }}>
        <button 
          className={`auth-tab-btn ${section === 'analytics' ? 'active' : ''}`}
          onClick={() => setSection('analytics')}
        >
          <TrendingUp size={16} /> Financial Analytics & Logs
        </button>
        <button 
          className={`auth-tab-btn ${section === 'rooms' ? 'active' : ''}`}
          onClick={() => setSection('rooms')}
        >
          <BedDouble size={16} /> Add & Manage Rooms
        </button>
        <button 
          className={`auth-tab-btn ${section === 'profile' ? 'active' : ''}`}
          onClick={() => setSection('profile')}
        >
          <Building2 size={16} /> Firm Profile
        </button>
      </div>

      {/* SECTION 1: FINANCIAL ANALYTICS & LOGS */}
      {section === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Date Filter Bar */}
          <div className="toolbar-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginRight: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} color="#d97706" /> Filter Logs:
              </span>
              <button 
                className={`btn-sub ${filterMode === 'today' ? 'active' : ''}`}
                style={{ padding: '7px 14px', fontSize: '12px', background: filterMode === 'today' ? '#f59e0b' : '', color: filterMode === 'today' ? '#000' : '' }}
                onClick={() => setFilterMode('today')}
              >
                Day-wise (Today)
              </button>
              <button 
                className={`btn-sub ${filterMode === 'month' ? 'active' : ''}`}
                style={{ padding: '7px 14px', fontSize: '12px', background: filterMode === 'month' ? '#f59e0b' : '', color: filterMode === 'month' ? '#000' : '' }}
                onClick={() => setFilterMode('month')}
              >
                Monthly
              </button>
              <button 
                className={`btn-sub ${filterMode === 'year' ? 'active' : ''}`}
                style={{ padding: '7px 14px', fontSize: '12px', background: filterMode === 'year' ? '#f59e0b' : '', color: filterMode === 'year' ? '#000' : '' }}
                onClick={() => setFilterMode('year')}
              >
                Yearly
              </button>
              <button 
                className={`btn-sub ${filterMode === 'all' ? 'active' : ''}`}
                style={{ padding: '7px 14px', fontSize: '12px', background: filterMode === 'all' ? '#f59e0b' : '', color: filterMode === 'all' ? '#000' : '' }}
                onClick={() => setFilterMode('all')}
              >
                All Time
              </button>
              <button 
                className={`btn-sub ${filterMode === 'custom' ? 'active' : ''}`}
                style={{ padding: '7px 14px', fontSize: '12px', background: filterMode === 'custom' ? '#f59e0b' : '', color: filterMode === 'custom' ? '#000' : '' }}
                onClick={() => setFilterMode('custom')}
              >
                Custom Range
              </button>
            </div>

            {filterMode === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  className="form-input" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)} 
                  placeholder="Start Date" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                />
                <span style={{ fontSize: '12px' }}>to</span>
                <input 
                  type="date" 
                  className="form-input" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)} 
                  placeholder="End Date" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button className="btn-main" onClick={handleExportCSV} style={{ padding: '8px 14px', fontSize: '13px' }}>
                <Download size={15} /> Download CSV Report
              </button>
              <button className="btn-sub" onClick={handlePrintSummary} style={{ padding: '8px 14px', fontSize: '13px' }}>
                <Printer size={15} /> Print Summary
              </button>
            </div>
          </div>

          {/* Filtered Metrics Summary */}
          <div className="metrics-row">
            <div className="metric-card emerald">
              <div className="metric-title">
                <span>FILTERED INTAKE</span>
                <DollarSign size={18} color="#ffffff" />
              </div>
              <div className="metric-number">
                {formatCurrency(totalFilteredIntake)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                {filteredBookings.length} guest stay booking(s)
              </div>
            </div>

            <div className="metric-card rose">
              <div className="metric-title">
                <span>FILTERED EXPENSES</span>
                <CreditCard size={18} color="#ffffff" />
              </div>
              <div className="metric-number">
                {formatCurrency(totalFilteredOutflow)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                {filteredExpenses.length} daily expense log(s)
              </div>
            </div>

            <div className="metric-card blue">
              <div className="metric-title">
                <span>NET OPERATIONAL PROFIT</span>
                <TrendingUp size={18} color="#ffffff" />
              </div>
              <div className="metric-number">
                {formatCurrency(netFilteredProfit)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                Intake minus operational outflow
              </div>
            </div>

            <div className="metric-card amber">
              <div className="metric-title">
                <span>ISSUED ROOM BILLS</span>
                <FileText size={18} color="#ffffff" />
              </div>
              <div className="metric-number">
                {filteredBills.length}
              </div>
              <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                Total billing statements issued
              </div>
            </div>
          </div>

          {/* Unified Financial Logs Table */}
          <div className="card-container" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
              Property Log Audit Trail ({filterMode.toUpperCase()})
            </h2>

            {unifiedLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No log entries found for the selected filter range.
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>DATE (DD/MM/YYYY)</th>
                    <th>LOG TYPE</th>
                    <th>REFERENCE</th>
                    <th>DESCRIPTION</th>
                    <th>PAYMENT CHANNEL</th>
                    <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {unifiedLogs.map((log, index) => {
                    const isPositive = log.amount >= 0;
                    return (
                      <tr key={index}>
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(log.date)}</td>
                        <td>
                          <span className="tag-badge" style={{
                            background: log.type === 'Stay Booking' ? '#ecfdf5' : log.type === 'Daily Expense' ? '#fef2f2' : '#fffbeb',
                            color: log.type === 'Stay Booking' ? '#047857' : log.type === 'Daily Expense' ? '#be123c' : '#b45309',
                            border: '1px solid currentColor'
                          }}>
                            {log.type}
                          </span>
                        </td>
                        <td className="mono" style={{ fontSize: '12px' }}>{log.refId}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.description}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.paidVia}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: isPositive ? '#047857' : '#be123c', fontSize: '14px' }}>
                          {isPositive ? '+' : ''}{formatCurrency(log.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: ROOMS INVENTORY MANAGEMENT */}
      {section === 'rooms' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          
          {/* Add New Room Card */}
          <div className="card-container" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="#d97706" /> Add New Room Suite
            </h2>

            {roomError && <div className="auth-error-banner">{roomError}</div>}
            {roomSuccess && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>{roomSuccess}</div>}

            <form onSubmit={handleAddRoom}>
              <div className="form-group">
                <label className="form-label">Room Identifier / Suite No.</label>
                <input 
                  type="text" 
                  className="form-input mono" 
                  placeholder="e.g. 501, Deluxe-B, Villa-1" 
                  value={newRoomNumber} 
                  onChange={(e) => setNewRoomNumber(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn-main" style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '8px' }}>
                <Plus size={16} /> Add Room to Inventory
              </button>
            </form>
          </div>

          {/* Rooms Grid */}
          <div className="card-container" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-serif)' }}>
                  Active Property Rooms ({roomsList.length} Total)
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Dynamically populates booking room selection dropdowns.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {roomsList.map((r) => {
                const isOccupied = occupiedRoomsSet.has(r);
                return (
                  <div key={r} style={{
                    background: isOccupied ? '#fff1f2' : '#f8fafc',
                    border: `1px solid ${isOccupied ? '#fca5a5' : '#cbd5e1'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>Suite {r}</span>
                      <button 
                        className="icon-btn" 
                        style={{ color: '#be123c' }} 
                        onClick={() => handleDeleteRoom(r)}
                        title="Remove room"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: isOccupied ? '#be123c' : '#047857',
                      background: isOccupied ? '#fef2f2' : '#ecfdf5',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      width: 'fit-content'
                    }}>
                      {isOccupied ? 'Occupied' : 'Available'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 3: FIRM & PROFILE SETTINGS */}
      {section === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
          
          {/* Custom Property Logo Upload Card */}
          <div className="card-container" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#f59e0b" /> Property Header Logo
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Upload your custom property logo. This logo will display permanently in the website header and invoice receipts.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                flexShrink: 0
              }}>
                {currentUser?.firmLogo ? (
                  <img src={currentUser.firmLogo} alt="Custom Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Building2 size={30} color="#f59e0b" />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {currentUser?.firmLogo ? 'Custom Logo Active' : 'Default Building Icon'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '10px' }}>
                  Recommended: Square PNG, JPG, or SVG image (max 2MB)
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="property-logo-upload-input"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          updateFirmLogo(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="property-logo-upload-input" className="btn-main" style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                    <Upload size={14} /> Upload Custom Logo
                  </label>

                  {currentUser?.firmLogo && (
                    <button 
                      className="btn-sub" 
                      style={{ padding: '6px 12px', fontSize: '12px', color: '#be123c' }}
                      onClick={() => updateFirmLogo(null)}
                    >
                      Reset Default Icon
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Property Manager E-Signature Card */}
          <div className="card-container" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSignature size={20} color="#047857" /> Manager E-Signature
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Upload your official digital signature image. This signature will be attached to room bill receipts and statements.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
              <div style={{
                width: '120px',
                height: '54px',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '4px',
                flexShrink: 0
              }}>
                {currentUser?.eSignature ? (
                  <img src={currentUser.eSignature} alt="E-Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No Signature</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {currentUser?.eSignature ? 'Digital Signature Uploaded' : 'No Digital Signature Uploaded'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '10px' }}>
                  Recommended: Transparent PNG or dark ink signature scan
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="manager-esignature-upload-input"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          updateESignature(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="manager-esignature-upload-input" className="btn-main" style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer', margin: 0, background: '#047857', borderColor: '#047857' }}>
                    <Upload size={14} /> Upload E-Signature
                  </label>

                  {currentUser?.eSignature && (
                    <button 
                      className="btn-sub" 
                      style={{ padding: '6px 12px', fontSize: '12px', color: '#be123c' }}
                      onClick={() => updateESignature(null)}
                    >
                      Remove Signature
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Manager & Property Info Form Card */}
          <div className="card-container" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontFamily: 'var(--font-serif)' }}>
              Property & Manager Profile
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Update your property firm name and manager username.
            </p>

            {profileSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {profileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileSave} className="auth-form">
              <div className="form-group">
                <label className="form-label">Property / Firm Name (Header Title)</label>
                <div className="input-icon-wrapper">
                  <Building2 size={16} className="input-icon" />
                  <input 
                    type="text" 
                    className="form-input icon-padded" 
                    value={firmName} 
                    onChange={(e) => setFirmName(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Property Manager Username / Name</label>
                <div className="input-icon-wrapper">
                  <User size={16} className="input-icon" />
                  <input 
                    type="text" 
                    className="form-input icon-padded" 
                    value={managerName} 
                    onChange={(e) => setManagerName(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="btn-main" style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '10px' }}>
                Save Profile Settings
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};
