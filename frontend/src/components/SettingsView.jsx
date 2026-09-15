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
  User, 
  CheckCircle2, 
  BedDouble,
  Upload,
  FileSignature,
  Clock,
  Edit2,
  X,
  Mail,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Lock,
  MapPin,
  Phone,
  Eye,
  EyeOff
} from 'lucide-react';
import { AddPropertyModal } from './AddPropertyModal';
import { CreateManagerModal } from './CreateManagerModal';

export const SettingsView = () => {
  const { 
    currentUser,
    propertiesList,
    activePropertyId,
    switchProperty,
    updateUserProfile,
    updateFirmLogo,
    updateESignature,
    updateSessionTimeout,
    changePassword,
    roomsList, 
    addCustomRoom, 
    removeCustomRoom,
    bookings,
    expenses,
    bills,
    isRegisterOpen
  } = useHotel();

  const isSuperAdmin = currentUser?.role === 'Overall Admin' || currentUser?.role === 'Super Admin';

  // Active section tab inside Settings: 'analytics' | 'rooms' | 'profile'
  const [section, setSection] = useState('analytics');
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showCreateManagerModal, setShowCreateManagerModal] = useState(false);
  const [timeoutSuccess, setTimeoutSuccess] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword) {
      setPwdError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setPwdSuccess('Your password has been changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(res.message || 'Failed to change password.');
      }
    } catch (err) {
      setPwdError(err.message || 'Error changing password.');
    } finally {
      setPwdLoading(false);
    }
  };

  // Rename Property State for Admin
  const [editingProp, setEditingProp] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  // Room Management State
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [roomError, setRoomError] = useState('');
  const [roomSuccess, setRoomSuccess] = useState('');

  // Profile Update State
  const [firmName, setFirmName] = useState(currentUser?.firmName || '');
  const [firmAddress, setFirmAddress] = useState(currentUser?.firmAddress || '');
  const [firmPhone, setFirmPhone] = useState(currentUser?.firmPhone || '');
  const [workEmail, setWorkEmail] = useState(currentUser?.firmEmail || currentUser?.email || '');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Analytics Date Filter State: 'all' | 'today' | 'month' | 'year' | 'custom'
  const [filterMode, setFilterMode] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Add Room Handler
  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!isRegisterOpen) {
      setRoomError('Shift Register is Closed. Please open shift register to add rooms.');
      return;
    }
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
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open shift register to remove rooms.');
      return;
    }
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
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open shift register to update profile.');
      return;
    }
    updateUserProfile(firmName, currentUser?.assignedManagerName || currentUser?.name, workEmail, firmAddress, firmPhone);
    setProfileSuccess('Property profile and contact details updated successfully!');
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
          </div>

          {/* Unified Ledger Log Table */}
          <div className="card-container" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
              Consolidated Activity Ledger ({unifiedLogs.length} Records)
            </h2>

            {unifiedLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No transactions match the selected filter period.</p>
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

              <button 
                type="submit" 
                className="btn-main" 
                disabled={!isRegisterOpen}
                style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '8px' }}
                title={isRegisterOpen ? "Add Room to Inventory" : "Shift Register is Closed (View-Only Mode)"}
              >
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
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: isOccupied ? '#be123c' : '#0f172a' }}>
                        {r}
                      </div>
                      <div style={{ fontSize: '11px', color: isOccupied ? '#be123c' : '#047857', fontWeight: 700 }}>
                        {isOccupied ? 'Occupied' : 'Vacant'}
                      </div>
                    </div>

                    {!isOccupied && (
                      <button 
                        className="icon-btn" 
                        disabled={!isRegisterOpen}
                        onClick={() => handleDeleteRoom(r)}
                        style={{ color: '#94a3b8', padding: '4px' }}
                        title={isRegisterOpen ? "Remove Room" : "Shift Register is Closed (View-Only Mode)"}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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
          
          {/* Properties Portfolio & Switcher Card */}
          <div className="card-container" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} color="#d97706" /> Properties Portfolio ({propertiesList.length})
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Properties owned & created under your Super Admin account.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isSuperAdmin && (
                  <button className="btn-sub" onClick={() => setShowCreateManagerModal(true)} style={{ padding: '8px 14px', fontSize: '13px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                    <UserPlus size={15} /> Create Manager
                  </button>
                )}
                <button className="btn-main" onClick={() => setShowAddPropertyModal(true)} style={{ padding: '8px 14px', fontSize: '13px' }}>
                  <Plus size={15} /> Add New Property
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {propertiesList.map((p) => {
                const isActive = p.firmId === activePropertyId;
                return (
                  <div
                    key={p.firmId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: isActive ? '#ecfdf5' : '#f8fafc',
                      border: `1px solid ${isActive ? '#a7f3d0' : '#e2e8f0'}`,
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        background: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        {p.firmLogo ? (
                          <img src={p.firmLogo} alt={p.firmName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Building2 size={20} color="#f59e0b" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{p.firmName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Firm ID: {p.firmId}</div>
                        {p.name && (
                          <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} /> Manager: <strong>{p.name}</strong> ({p.email})
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        className="icon-btn"
                        style={{ color: '#0284c7' }}
                        onClick={() => {
                          setEditingProp(p);
                          setRenameInput(p.firmName);
                        }}
                        title="Rename Property"
                      >
                        <Edit2 size={15} />
                      </button>
                      {isActive ? (
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857', background: '#d1fae5', padding: '4px 10px', borderRadius: '12px' }}>
                          Active Dashboard
                        </span>
                      ) : (
                        <button
                          className="btn-sub"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => switchProperty(p.firmId)}
                        >
                          Switch to Dashboard
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                    disabled={!isRegisterOpen}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (!isRegisterOpen) return;
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
                  <label 
                    htmlFor="property-logo-upload-input" 
                    className="btn-main" 
                    style={{ 
                      padding: '6px 14px', 
                      fontSize: '12px', 
                      cursor: isRegisterOpen ? 'pointer' : 'not-allowed', 
                      margin: 0,
                      opacity: isRegisterOpen ? 1 : 0.55
                    }}
                    title={isRegisterOpen ? "Upload Custom Logo" : "Shift Register is Closed (View-Only Mode)"}
                  >
                    <Upload size={14} /> Upload Custom Logo
                  </label>

                  {currentUser?.firmLogo && (
                    <button 
                      className="btn-sub" 
                      style={{ padding: '6px 12px', fontSize: '12px', color: '#be123c' }}
                      disabled={!isRegisterOpen}
                      onClick={() => updateFirmLogo(null)}
                      title={isRegisterOpen ? "Reset Default Icon" : "Shift Register is Closed (View-Only Mode)"}
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
            {isSuperAdmin ? (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  As Super Admin, you oversee properties and invite managers. Individual property managers upload their own digital signature when operating their assigned property dashboard.
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
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No Manager Signature</span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {currentUser?.eSignature ? 'Property Manager Signature on File' : 'No Manager Signature Uploaded Yet'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {currentUser?.eSignature 
                        ? 'This signature is automatically attached to guest room receipts by the assigned on-duty manager.' 
                        : 'The invited manager for this property will upload their signature upon logging into their manager account.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
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
                        disabled={!isRegisterOpen}
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (!isRegisterOpen) return;
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
                      <label 
                        htmlFor="manager-esignature-upload-input" 
                        className="btn-main" 
                        style={{ 
                          padding: '6px 14px', 
                          fontSize: '12px', 
                          cursor: isRegisterOpen ? 'pointer' : 'not-allowed', 
                          margin: 0, 
                          background: '#047857', 
                          borderColor: '#047857',
                          opacity: isRegisterOpen ? 1 : 0.55
                        }}
                        title={isRegisterOpen ? "Upload E-Signature" : "Shift Register is Closed (View-Only Mode)"}
                      >
                        <Upload size={14} /> Upload E-Signature
                      </label>

                      {currentUser?.eSignature && (
                        <button 
                          className="btn-sub" 
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#be123c' }}
                          disabled={!isRegisterOpen}
                          onClick={() => updateESignature(null)}
                          title={isRegisterOpen ? "Remove Signature" : "Shift Register is Closed (View-Only Mode)"}
                        >
                          Remove Signature
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manager & Property Info Form Card (For Overall Admin Only) */}
          {isSuperAdmin && (
            <div className="card-container" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontFamily: 'var(--font-serif)' }}>
                Property Profile & Contact Info
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Update property name, physical address, and front desk contact details.
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
                  <label className="form-label">Property Location / Address</label>
                  <div className="input-icon-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input 
                      type="text" 
                      className="form-input icon-padded" 
                      placeholder="e.g. 12 Beach Boulevard, Goa"
                      value={firmAddress} 
                      onChange={(e) => setFirmAddress(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Front Desk Phone</label>
                    <div className="input-icon-wrapper">
                      <Phone size={16} className="input-icon" />
                      <input 
                        type="tel" 
                        className="form-input icon-padded" 
                        placeholder="e.g. +91 98765 43210"
                        value={firmPhone} 
                        onChange={(e) => setFirmPhone(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Front Desk Email</label>
                    <div className="input-icon-wrapper">
                      <Mail size={16} className="input-icon" />
                      <input 
                        type="email" 
                        className="form-input icon-padded" 
                        placeholder="e.g. frontdesk@hotel.com"
                        value={workEmail} 
                        onChange={(e) => setWorkEmail(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* Assigned Manager Status */}
                <div style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: currentUser?.assignedManagerName ? '#ecfdf5' : '#fef3c7',
                      color: currentUser?.assignedManagerName ? '#047857' : '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Assigned Property Manager: {currentUser?.assignedManagerName || 'None Assigned Yet'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {currentUser?.assignedManagerName
                          ? `This manager is assigned to operate ${currentUser?.firmName || 'this property'}.`
                          : 'You can delegate daily frontdesk operations by creating a manager account.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-sub"
                    style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                    onClick={() => setShowCreateManagerModal(true)}
                  >
                    <UserPlus size={13} /> {currentUser?.assignedManagerName ? 'Manage Staff' : 'Assign Manager'}
                  </button>
                </div>

                <button 
                  type="submit" 
                  className="btn-main" 
                  disabled={!isRegisterOpen}
                  style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '16px' }}
                  title={isRegisterOpen ? "Save Profile Settings" : "Shift Register is Closed (View-Only Mode)"}
                >
                  Save Property Settings
                </button>
              </form>
            </div>
          )}

          {/* Property Session Timeout & Security Controls */}
          <div className="card-container" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="#d97706" /> Session Timeout & Security Controls
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Configure automatic session inactivity timeout for this property account. When reloading the page, managers are automatically logged out and must re-authenticate, landing directly on the homepage (Overview).
            </p>

            {timeoutSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {timeoutSuccess}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Inactivity Session Timeout Duration</label>
              <select
                className="form-input"
                style={{ width: '100%', cursor: 'pointer', fontWeight: 600 }}
                value={currentUser?.sessionTimeoutMinutes || 15}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateSessionTimeout(val);
                  setTimeoutSuccess(`Session timeout updated to ${val} minutes of inactivity for ${currentUser?.firmName || 'Property'}.`);
                  setTimeout(() => setTimeoutSuccess(''), 4000);
                }}
              >
                <option value={5}>5 Minutes Inactivity</option>
                <option value={10}>10 Minutes Inactivity</option>
                <option value={15}>15 Minutes Inactivity (Default)</option>
                <option value={30}>30 Minutes Inactivity</option>
                <option value={60}>60 Minutes Inactivity (1 Hour)</option>
              </select>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>🔒 Security Policy Active:</div>
              <div>• <strong>Browser Reload:</strong> Refreshing or reloading the page invalidates active session for security and prompts sign in.</div>
              <div>• <strong>Login Navigation:</strong> Upon successful login, portal always opens directly on the Overview homepage.</div>
            </div>
          </div>

          {/* Security & Change Password Card */}
          <div className="card-container" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={20} color="#047857" /> Security & Password Management
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Update your account login password anytime.
            </p>

            {pwdSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {pwdSuccess}
              </div>
            )}

            {pwdError && (
              <div className="auth-error-banner" style={{ marginBottom: '20px' }}>
                {pwdError}
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Current Password <span style={{ color: '#e11d48' }}>*</span></label>
                <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    className="form-input icon-padded"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    tabIndex={-1}
                    title={showCurrentPwd ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password <span style={{ color: '#e11d48' }}>*</span></label>
                <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                  <KeyRound size={16} className="input-icon" />
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    className="form-input icon-padded"
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    tabIndex={-1}
                    title={showNewPwd ? 'Hide password' : 'Show password'}
                  >
                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password <span style={{ color: '#e11d48' }}>*</span></label>
                <div className="input-icon-wrapper" style={{ position: 'relative' }}>
                  <ShieldCheck size={16} className="input-icon" />
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    className="form-input icon-padded"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    tabIndex={-1}
                    title={showConfirmPwd ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-main"
                disabled={pwdLoading}
                style={{ padding: '10px 18px', fontSize: '13px', width: 'fit-content' }}
              >
                {pwdLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      )}

      {showAddPropertyModal && (
        <AddPropertyModal
          isOpen={showAddPropertyModal}
          onClose={() => setShowAddPropertyModal(false)}
        />
      )}

      {editingProp && (
        <div className="modal-overlay" onClick={() => setEditingProp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} color="#0284c7" />
                <h3 className="modal-heading">Rename Property</h3>
              </div>
              <button className="icon-btn" onClick={() => setEditingProp(null)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!renameInput.trim()) return;
              if (editingProp.firmId !== activePropertyId) {
                switchProperty(editingProp.firmId);
              }
              updateUserProfile(renameInput.trim(), null, null);
              setEditingProp(null);
            }}>
              <div className="form-group" style={{ margin: '16px 0' }}>
                <label className="form-label">Property / Firm Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  placeholder="Enter new property name..."
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-sub" onClick={() => setEditingProp(null)}>Cancel</button>
                <button type="submit" className="btn-main">Save Property Name</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateManagerModal && (
        <CreateManagerModal
          isOpen={showCreateManagerModal}
          onClose={() => setShowCreateManagerModal(false)}
        />
      )}
    </div>
  );
};
