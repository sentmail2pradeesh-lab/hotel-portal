import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';
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
  EyeOff,
  Sliders,
  Check,
  Copy,
  Shield,
  Sparkles,
  Users
} from 'lucide-react';
import { AddPropertyModal } from './AddPropertyModal';
import { CreateManagerModal } from './CreateManagerModal';

export const SettingsView = () => {
  const { 
    currentUser,
    propertiesList,
    activePropertyId,
    switchProperty,
    deleteProperty,
    updateUserProfile,
    updateFirmLogo,
    updateESignature,
    updateSessionTimeout,
    changePassword,
    roomsList, 
    roomsDetails,
    addCustomRoom, 
    editCustomRoom,
    removeCustomRoom,
    featureToggles,
    updateRoleFeatureToggles,
    isSuperAdmin,
    isAdmin,
    impersonateUser,
    canAccess,
    bookings,
    expenses,
    bills,
    isRegisterOpen
  } = useHotel();

  // Active section tab inside Settings: 'analytics' | 'rooms' | 'profile' | 'features' | 'vault'
  const [section, setSection] = useState('analytics');
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showCreateManagerModal, setShowCreateManagerModal] = useState(false);
  const [timeoutSuccess, setTimeoutSuccess] = useState('');

  // Delete Property Modal State
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
        setPwdSuccess('Your password has been changed successfully! (Dual-password login active)');
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
  const [newRoomType, setNewRoomType] = useState('Deluxe Suite');
  const [newIsStaffRoom, setNewIsStaffRoom] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [roomSuccess, setRoomSuccess] = useState('');
  const [editingRoom, setEditingRoom] = useState(null); // { oldRoomNumber, newRoomNumber, roomType, isStaffRoom }

  // Feature Toggles State (Super Admin)
  const [togglesSuccess, setTogglesSuccess] = useState('');

  // Staff Credentials Vault State (Super Admin)
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [vaultCopiedId, setVaultCopiedId] = useState(null);
  const [impersonatingId, setImpersonatingId] = useState(null);

  const fetchStaffVault = async () => {
    setStaffLoading(true);
    try {
      const data = await api.getManagers();
      setStaffList(data || []);
    } catch {
      // Fallback
    } finally {
      setStaffLoading(false);
    }
  };

  const handleToggleChange = async (roleName, key, currentValue) => {
    const updated = {
      ...(featureToggles[roleName] || {}),
      [key]: !currentValue
    };
    const res = await updateRoleFeatureToggles(roleName, updated);
    if (res.success) {
      setTogglesSuccess(`Feature permissions updated for ${roleName} role!`);
      setTimeout(() => setTogglesSuccess(''), 3500);
    }
  };

  const handleCopyStaffCredentials = (m) => {
    const loginUrl = window.location.origin;
    const text = 
`🏨 *STAFF CREDENTIALS & ACCESS VAULT*
Role: ${m.role || 'Manager'}
Full Name: ${m.name}
Login Email: ${m.email}
Initial / Temp Password: ${m.tempPassword}
Primary Property: ${m.propertyName || 'Hotel'}

Login Portal: ${loginUrl}
(Dual-password policy: Both initial password and any new password chosen by the user remain active for sign-in)`;

    navigator.clipboard.writeText(text);
    setVaultCopiedId(m.id);
    setTimeout(() => setVaultCopiedId(null), 3000);
  };

  const handleImpersonate = async (userId) => {
    setImpersonatingId(userId);
    const res = await impersonateUser(userId);
    setImpersonatingId(null);
    if (!res.success) {
      alert(res.message || 'Failed to switch to user dashboard.');
    }
  };

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
    const res = addCustomRoom(newRoomNumber, newRoomType, newIsStaffRoom);
    if (!res.success) {
      setRoomError(res.message);
    } else {
      setRoomSuccess(`Room ${newRoomNumber.trim()} added successfully to inventory!`);
      setNewRoomNumber('');
      setNewIsStaffRoom(false);
    }
  };

  // Edit Room Handler
  const handleEditRoomSubmit = async (e) => {
    e.preventDefault();
    if (!editingRoom) return;
    setRoomError('');
    setRoomSuccess('');
    const res = await editCustomRoom(
      editingRoom.oldRoomNumber,
      editingRoom.newRoomNumber,
      editingRoom.roomType,
      editingRoom.isStaffRoom
    );
    if (res.success) {
      setRoomSuccess(`Room ${editingRoom.newRoomNumber} updated successfully!`);
      setEditingRoom(null);
    } else {
      setRoomError(res.message || 'Failed to update room.');
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
      <div className="settings-pro-tabs">
        {canAccess('reports') && (
          <button 
            className={`settings-pro-tab-btn ${section === 'analytics' ? 'active' : ''}`}
            onClick={() => setSection('analytics')}
          >
            <TrendingUp size={16} /> Financial Analytics & Logs
          </button>
        )}
        {canAccess('edit_rooms') && (
          <button 
            className={`settings-pro-tab-btn ${section === 'rooms' ? 'active' : ''}`}
            onClick={() => setSection('rooms')}
          >
            <BedDouble size={16} /> Add & Manage Rooms
          </button>
        )}
        <button 
          className={`settings-pro-tab-btn ${section === 'profile' ? 'active' : ''}`}
          onClick={() => setSection('profile')}
        >
          <Building2 size={16} /> Firm Profile
        </button>
        {isSuperAdmin && (
          <button 
            className={`settings-pro-tab-btn ${section === 'features' ? 'active' : ''}`}
            onClick={() => setSection('features')}
          >
            <Sliders size={16} /> Feature Access Matrix
          </button>
        )}
        {isSuperAdmin && (
          <button 
            className={`settings-pro-tab-btn ${section === 'vault' ? 'active' : ''}`}
            onClick={() => {
              setSection('vault');
              fetchStaffVault();
            }}
          >
            <ShieldCheck size={16} /> Staff Credentials Vault
          </button>
        )}
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
          <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Filtered Intake</span>
                <div className="metric-icon-badge emerald">
                  <DollarSign size={15} />
                </div>
              </div>
              <div className="metric-card-value-row">
                <span className="metric-card-value" style={{ color: '#047857' }}>
                  {formatCurrency(totalFilteredIntake)}
                </span>
              </div>
              <div className="metric-card-footer">
                <span className="metric-status-dot emerald" />
                <span>{filteredBookings.length} guest stay booking(s)</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Filtered Expenses</span>
                <div className="metric-icon-badge rose">
                  <CreditCard size={15} />
                </div>
              </div>
              <div className="metric-card-value-row">
                <span className="metric-card-value" style={{ color: '#dc2626' }}>
                  {formatCurrency(totalFilteredOutflow)}
                </span>
              </div>
              <div className="metric-card-footer">
                <span className="metric-status-dot rose" />
                <span>{filteredExpenses.length} daily expense log(s)</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Net Operational Profit</span>
                <div className="metric-icon-badge blue">
                  <TrendingUp size={15} />
                </div>
              </div>
              <div className="metric-card-value-row">
                <span className="metric-card-value" style={{ color: netFilteredProfit >= 0 ? '#0284c7' : '#dc2626' }}>
                  {formatCurrency(netFilteredProfit)}
                </span>
              </div>
              <div className="metric-card-footer">
                <span>Intake minus operational outflow</span>
              </div>
            </div>
          </div>

          {/* Unified Ledger Log Table */}
          <div className="card-container" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-sans)' }}>
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="#d97706" /> Add New Room Suite
            </h2>

            {roomError && <div className="auth-error-banner">{roomError}</div>}
            {roomSuccess && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>{roomSuccess}</div>}

            <form onSubmit={handleAddRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Room Identifier / Suite No. <span style={{ color: '#e11d48' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-input mono" 
                  placeholder="e.g. 501, Deluxe-B, Villa-1" 
                  value={newRoomNumber} 
                  onChange={(e) => setNewRoomNumber(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room Category / Type</label>
                <select
                  className="form-select"
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                >
                  <option value="Deluxe Suite">Deluxe Suite</option>
                  <option value="Executive Room">Executive Room</option>
                  <option value="Standard Room">Standard Room</option>
                  <option value="Family Villa">Family Villa</option>
                  <option value="Dormitory">Dormitory</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: newIsStaffRoom ? '#7c3aed' : 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={newIsStaffRoom}
                    onChange={(e) => setNewIsStaffRoom(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  <span>Mark as Staff Room (Non-Sellable Quarter)</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Staff quarters are automatically deducted from sellable inventory.
                </span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
                  Active Property Rooms ({roomsList.length} Total)
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Vacant rooms highlighted in vibrant green. Super Admin & Admin can edit numbers and types.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Available
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#be123c', background: '#fff1f2', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }}></span> Occupied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6d28d9', background: '#f5f3ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #c4b5fd' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span> Staff
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {roomsList.map((r) => {
                const detail = (roomsDetails || []).find(d => d.roomNumber === r);
                const isStaff = Boolean(detail?.isStaffRoom);
                const isOccupied = occupiedRoomsSet.has(r);
                const isAvailable = !isOccupied && !isStaff;

                return (
                  <div key={r} style={{
                    background: isOccupied ? '#fff1f2' : (isStaff ? '#f5f3ff' : '#ecfdf5'),
                    border: isOccupied 
                      ? '1.5px solid #fca5a5' 
                      : (isStaff ? '1.5px solid #c4b5fd' : '2px solid #10b981'),
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: isAvailable ? '0 2px 8px rgba(16, 185, 129, 0.12)' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="mono" style={{ fontSize: '17px', fontWeight: 800, color: isOccupied ? '#be123c' : (isStaff ? '#6d28d9' : '#047857') }}>
                          Room {r}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {detail?.roomType || 'Standard'}
                        </div>
                      </div>

                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isOccupied ? '#fee2e2' : (isStaff ? '#ede9fe' : '#d1fae5'),
                        color: isOccupied ? '#b91c1c' : (isStaff ? '#6d28d9' : '#047857'),
                        border: `1px solid ${isOccupied ? '#fca5a5' : (isStaff ? '#c4b5fd' : '#10b981')}`
                      }}>
                        {isOccupied ? 'Occupied' : (isStaff ? 'Staff' : 'Available')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                      {/* Edit Room Button for SA and Admin */}
                      {(isSuperAdmin || isAdmin) && (
                        <button
                          className="icon-btn"
                          disabled={!isRegisterOpen}
                          onClick={() => setEditingRoom({
                            oldRoomNumber: r,
                            newRoomNumber: r,
                            roomType: detail?.roomType || 'Deluxe Suite',
                            isStaffRoom: Boolean(detail?.isStaffRoom)
                          })}
                          style={{ color: '#0284c7', padding: '4px' }}
                          title="Edit Room Number & Category"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}

                      {!isOccupied && (
                        <button 
                          className="icon-btn" 
                          disabled={!isRegisterOpen}
                          onClick={() => handleDeleteRoom(r)}
                          style={{ color: '#94a3b8', padding: '4px' }}
                          title={isRegisterOpen ? "Remove Room" : "Shift Register is Closed (View-Only Mode)"}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 3: FIRM & PROFILE SETTINGS */}
      {section === 'profile' && (
        <div className="settings-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Properties Portfolio & Switcher Card */}
          <div className="settings-section-card">
            <div className="settings-section-header">
              <div className="settings-section-title-group">
                <h2>
                  <Building2 size={20} color="#d97706" /> Properties Portfolio ({propertiesList.length})
                </h2>
                <p>
                  Properties owned and managed under your administrative account.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {(isSuperAdmin || isAdmin) && (
                  <button 
                    className="btn-sub" 
                    onClick={() => setShowCreateManagerModal(true)} 
                    style={{ padding: '8px 14px', fontSize: '13px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
                  >
                    <UserPlus size={15} /> Create Manager
                  </button>
                )}
                {isSuperAdmin && (
                  <button 
                    className="btn-main" 
                    onClick={() => setShowAddPropertyModal(true)} 
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                  >
                    <Plus size={15} /> Add New Property
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {propertiesList.map((p) => {
                const isActive = p.firmId === activePropertyId;
                return (
                  <div
                    key={p.firmId}
                    className={`property-item-pro ${isActive ? 'active-item' : 'inactive-item'}`}
                  >
                    <div className="prop-identity-group">
                      <div className="prop-avatar-box">
                        {p.firmLogo ? (
                          <img src={p.firmLogo} alt={p.firmName} />
                        ) : (
                          <Building2 size={22} color="#f59e0b" />
                        )}
                      </div>
                      <div className="prop-info-col">
                        <div className="prop-name-row">
                          <span className="prop-main-name">{p.firmName}</span>
                          {p.propertyCode && (
                            <span className="prop-code-badge">
                              {p.propertyCode}
                            </span>
                          )}
                        </div>
                        <div className="prop-firmid-tag">
                          Firm ID: <code>{p.firmId}</code>
                        </div>
                        {p.name && (
                          <div className="prop-manager-badge">
                            <User size={12} className="prop-manager-icon" />
                            <span className="prop-manager-label">Manager:</span>
                            <span className="prop-manager-name">{p.name}</span>
                            {p.email && <span className="prop-manager-email">({p.email})</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="prop-actions-pro">
                      {isSuperAdmin && (
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
                      )}
                      {isSuperAdmin && (
                        <button
                          className="icon-btn"
                          style={{ color: '#dc2626' }}
                          onClick={() => {
                            setPropertyToDelete(p);
                            setDeleteError('');
                          }}
                          title="Delete Property (Super Admin Only)"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                      {isActive ? (
                        <span className="prop-active-pill">
                          <span className="pulse-dot" />
                          Active Dashboard
                        </span>
                      ) : (
                        <button
                          className="prop-switch-btn"
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

          {/* Branding & Assets Grid (Property Logo & E-Signature) */}
          <div className="branding-grid-pro">
            {/* Custom Property Logo Upload Card */}
            <div className="branding-card-pro">
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={19} color="#f59e0b" /> Property Header Logo
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                  Upload your brand logo for the website header and PDF invoices.
                </p>

                <div className="branding-preview-stage">
                  <div style={{
                    width: '60px',
                    height: '60px',
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
                      <Building2 size={28} color="#f59e0b" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {currentUser?.firmLogo ? 'Custom Brand Logo' : 'Default Building Icon'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '10px' }}>
                      Square PNG, JPG, or SVG (max 2MB)
                    </div>

                    {isSuperAdmin ? (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                          <Upload size={13} /> Upload Logo
                        </label>

                        {currentUser?.firmLogo && (
                          <button 
                            className="btn-sub" 
                            style={{ padding: '6px 12px', fontSize: '12px', color: '#be123c' }}
                            disabled={!isRegisterOpen}
                            onClick={() => updateFirmLogo(null)}
                            title={isRegisterOpen ? "Reset Default Icon" : "Shift Register is Closed (View-Only Mode)"}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Property branding logo is managed exclusively by Super Admin.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Property Manager E-Signature Card */}
            <div className="branding-card-pro">
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSignature size={19} color="#047857" /> Manager E-Signature
                </h2>
                {isSuperAdmin ? (
                  <div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                      Attached automatically to guest room receipts by on-duty property managers.
                    </p>

                    <div className="branding-preview-stage">
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

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {currentUser?.eSignature ? 'Digital Signature on File' : 'No Signature Uploaded'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {currentUser?.eSignature 
                            ? 'Attached to guest checkout invoices.' 
                            : 'Invited manager can upload on their dashboard.'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                      Upload your digital signature image to attach on room bills & receipts.
                    </p>

                    <div className="branding-preview-stage">
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

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {currentUser?.eSignature ? 'Signature Uploaded' : 'No Signature'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '10px' }}>
                          Transparent PNG or dark ink scan
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                            <Upload size={13} /> Upload Signature
                          </label>

                          {currentUser?.eSignature && (
                            <button 
                              className="btn-sub" 
                              style={{ padding: '6px 12px', fontSize: '12px', color: '#be123c' }}
                              disabled={!isRegisterOpen}
                              onClick={() => updateESignature(null)}
                              title={isRegisterOpen ? "Remove Signature" : "Shift Register is Closed (View-Only Mode)"}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Manager & Property Info Form Card (For Overall Admin Only) */}
          {isSuperAdmin && (
            <div className="card-container" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* SECTION 4: FEATURE ACCESS MATRIX (SUPER ADMIN ONLY) */}
      {section === 'features' && isSuperAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-container" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={20} color="#d97706" /> Role-Based Feature Access Matrix
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Toggle and release features dynamically for Admin and Manager accounts across the system.
                </p>
              </div>
            </div>

            {togglesSuccess && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, margin: '14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {togglesSuccess}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginTop: '16px' }}>
              {/* Admin Permissions Column */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid #c7d2fe',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} color="#4f46e5" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', color: '#1e1b4b', fontWeight: 800 }}>Admin Permissions</h3>
                      <span style={{ fontSize: '11px', color: '#6366f1' }}>Oversees all properties and managers</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: '#eef2ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '4px' }}>
                    ADMIN ROLE
                  </span>
                </div>

                {[
                  { key: 'bookings', label: 'Stay Bookings & Check-ins', desc: 'Create, modify, and checkout guest stays' },
                  { key: 'expenses', label: 'Daily Expense Logging', desc: 'Log and monitor operational expenditures' },
                  { key: 'bills', label: 'Billing Statements & Receipts', desc: 'Generate and print guest room bills' },
                  { key: 'guest_ids', label: 'Guest Identity Vault', desc: 'View and verify uploaded guest ID documents' },
                  { key: 'reports', label: 'Financial Analytics & Audit Logs', desc: 'Access revenue reports and ledger audits' },
                  { key: 'edit_rooms', label: 'Room Suites & Inventory', desc: 'Add, rename, and configure room suites' },
                  { key: 'shift_register', label: 'Shift Register Controls', desc: 'Open and close daily front-desk shift register' }
                ].map((feat) => {
                  const isEnabled = featureToggles?.Admin?.[feat.key] !== false;
                  return (
                    <div
                      key={feat.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#ffffff',
                        border: `1px solid ${isEnabled ? '#c7d2fe' : '#e2e8f0'}`,
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{feat.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{feat.desc}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleChange('Admin', feat.key, isEnabled)}
                        style={{
                          background: isEnabled ? '#4f46e5' : '#cbd5e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        {isEnabled ? <><Check size={12} /> RELEASED</> : 'RESTRICTED'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Manager Permissions Column */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid #a7f3d0',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="#047857" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', color: '#064e3b', fontWeight: 800 }}>Manager Permissions</h3>
                      <span style={{ fontSize: '11px', color: '#059669' }}>Assigned to single property front-desk</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '4px' }}>
                    MANAGER ROLE
                  </span>
                </div>

                {[
                  { key: 'bookings', label: 'Stay Bookings & Check-ins', desc: 'Create, modify, and checkout guest stays' },
                  { key: 'guest_ids', label: 'Guest Identity Vault', desc: 'View and verify uploaded guest ID documents' },
                  { key: 'expenses', label: 'Daily Expense Logging', desc: 'Log front-desk operational petty expenses' },
                  { key: 'bills', label: 'Billing Statements & Receipts', desc: 'Generate and print guest room bills' },
                  { key: 'reports', label: 'Financial Analytics & Audit Logs', desc: 'Access revenue reports and audit logs' },
                  { key: 'edit_rooms', label: 'Room Suites & Inventory', desc: 'Add, rename, and configure room suites' },
                  { key: 'shift_register', label: 'Shift Register Controls', desc: 'Open and close daily front-desk shift register' }
                ].map((feat) => {
                  const isEnabled = featureToggles?.Manager?.[feat.key] === true;
                  return (
                    <div
                      key={feat.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#ffffff',
                        border: `1px solid ${isEnabled ? '#a7f3d0' : '#e2e8f0'}`,
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{feat.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{feat.desc}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleChange('Manager', feat.key, isEnabled)}
                        style={{
                          background: isEnabled ? '#047857' : '#cbd5e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        {isEnabled ? <><Check size={12} /> RELEASED</> : 'RESTRICTED'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: STAFF CREDENTIALS & VAULT (SUPER ADMIN ONLY) */}
      {section === 'vault' && isSuperAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-container" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#047857" /> Staff Credentials Vault & Impersonation
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  All Admins and Managers credentials are bound with dual-password authentication. Super Admin can view credentials and jump into their dashboard.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-sub"
                  onClick={fetchStaffVault}
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  Refresh Vault
                </button>
                <button
                  type="button"
                  className="btn-main"
                  onClick={() => setShowCreateManagerModal(true)}
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  <UserPlus size={14} /> Provision Admin / Manager
                </button>
              </div>
            </div>

            {/* Dual Password Banner */}
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} color="#047857" style={{ flexShrink: 0 }} />
              <span>
                <strong>Dual-Password System Active:</strong> When an Admin or Manager updates their temporary password, both their temporary password and their new password remain permanently bound and functional for login.
              </span>
            </div>

            {staffLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading staff vault records...
              </div>
            ) : staffList.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No staff members provisioned yet. Click "Provision Admin / Manager" to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {staffList.map((m) => {
                  const isAdminUser = m.role === 'Admin';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: '#ffffff',
                        border: `1.5px solid ${isAdminUser ? '#c7d2fe' : '#e2e8f0'}`,
                        borderRadius: 'var(--radius-md)',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: isAdminUser ? '#4f46e5' : '#047857',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700
                        }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{m.name}</strong>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isAdminUser ? '#eef2ff' : '#ecfdf5',
                              color: isAdminUser ? '#4f46e5' : '#047857',
                              border: `1px solid ${isAdminUser ? '#c7d2fe' : '#a7f3d0'}`
                            }}>
                              {m.role ? m.role.toUpperCase() : 'MANAGER'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Login: <span style={{ color: '#0284c7', fontWeight: 600 }}>{m.email}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Assigned Property: <strong>{m.propertyName || 'All Properties'}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                        {m.tempPassword ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef3c7', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                            <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>Password:</span>
                            <span className="mono" style={{ fontSize: '12px', fontWeight: 800, color: '#b45309' }}>
                              {m.tempPassword}
                            </span>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ padding: '2px', color: '#b45309' }}
                              title="Copy Credentials"
                              onClick={() => handleCopyStaffCredentials(m)}
                            >
                              {vaultCopiedId === m.id ? <Check size={14} color="#047857" /> : <Copy size={14} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                            Password active
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn-main"
                          disabled={impersonatingId === m.id}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: '#0284c7',
                            borderColor: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          onClick={() => handleImpersonate(m.id)}
                          title={`Switch and view dashboard as ${m.name}`}
                        >
                          <Eye size={14} /> {impersonatingId === m.id ? 'Switching...' : 'View Dashboard As'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

      {editingRoom && (
        <div className="modal-overlay" onClick={() => setEditingRoom(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} color="#0284c7" />
                <h3 className="modal-heading">Edit Room {editingRoom.oldRoomNumber}</h3>
              </div>
              <button className="icon-btn" onClick={() => setEditingRoom(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Room Identifier / Number <span style={{ color: '#e11d48' }}>*</span></label>
                <input
                  type="text"
                  className="form-input mono"
                  value={editingRoom.newRoomNumber}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev, newRoomNumber: e.target.value }))}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Active stays linked to this room will be automatically updated to the new number.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Room Category / Type</label>
                <select
                  className="form-select"
                  value={editingRoom.roomType}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev, roomType: e.target.value }))}
                >
                  <option value="Deluxe Suite">Deluxe Suite</option>
                  <option value="Executive Room">Executive Room</option>
                  <option value="Standard Room">Standard Room</option>
                  <option value="Family Villa">Family Villa</option>
                  <option value="Dormitory">Dormitory</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: editingRoom.isStaffRoom ? '#7c3aed' : 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={editingRoom.isStaffRoom}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev, isStaffRoom: e.target.checked }))}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  <span>Mark as Staff Room (Quarters)</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Staff quarters are deducted from sellable property inventory.
                </span>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-sub" onClick={() => setEditingRoom(null)}>Cancel</button>
                <button type="submit" className="btn-main">Save Room Changes</button>
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

      {/* Delete Property Confirmation Modal (Super Admin Only) */}
      {propertyToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '460px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Delete Property
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Super Admin Permanent Deletion
                </span>
              </div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                {propertyToDelete.firmName} {propertyToDelete.propertyCode ? `(${propertyToDelete.propertyCode})` : ''}
              </div>
              <div style={{ fontSize: '12px', color: '#b91c1c', lineHeight: 1.5 }}>
                Firm ID: <code style={{ background: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>{propertyToDelete.firmId}</code>
              </div>
              <p style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '8px', marginBottom: 0, lineHeight: 1.5 }}>
                ⚠️ <strong>Warning:</strong> This will permanently delete this property along with all its associated room records, bookings, bills, and daily expenses. This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>
                {deleteError}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn-sub" 
                onClick={() => {
                  setPropertyToDelete(null);
                  setDeleteError('');
                }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-danger"
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.7 : 1
                }}
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  setDeleteError('');
                  const res = await deleteProperty(propertyToDelete.firmId);
                  setDeleteLoading(false);
                  if (res.success) {
                    setPropertyToDelete(null);
                  } else {
                    setDeleteError(res.message || 'Failed to delete property.');
                  }
                }}
              >
                <Trash2 size={15} />
                <span>{deleteLoading ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
