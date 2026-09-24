import React, { useState, useEffect } from 'react';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';
import { 
  Building2, 
  Upload, 
  X, 
  Plus, 
  Info, 
  MapPin, 
  Phone, 
  Mail, 
  Hash, 
  User, 
  UserCheck, 
  Zap 
} from 'lucide-react';

export const AddPropertyModal = ({ isOpen, onClose }) => {
  const { addProperty, isSuperAdmin } = useHotel();

  const [propertyCode, setPropertyCode] = useState('');
  const [firmName, setFirmName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [tnebNumber, setTnebNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [firmLogo, setFirmLogo] = useState(null);
  const [managersList, setManagersList] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Rooms Setup State
  const [roomMode, setRoomMode] = useState('range'); // 'range' | 'custom' | 'default' | 'none'
  const [startRoom, setStartRoom] = useState('101');
  const [endRoom, setEndRoom] = useState('120');
  const [roomType, setRoomType] = useState('Standard Room');
  const [customRoomsText, setCustomRoomsText] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getManagers()
        .then((data) => {
          if (Array.isArray(data)) {
            setManagersList(data);
          }
        })
        .catch((err) => {
          console.warn('Could not load managers for dropdown:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen || !isSuperAdmin) return null;

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFirmLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getComputedInitialRooms = () => {
    if (roomMode === 'default') return null; // Uses backend DEFAULT_ROOMS
    if (roomMode === 'none') return []; // Explicit empty array means 0 initial rooms
    if (roomMode === 'range') {
      const start = parseInt(startRoom, 10);
      const end = parseInt(endRoom, 10);
      if (isNaN(start) || isNaN(end) || start > end) return null;
      const count = Math.min(Math.max(end - start + 1, 0), 200);
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push({
          roomNumber: String(start + i),
          roomType: roomType,
          isStaffRoom: false
        });
      }
      return list;
    }
    if (roomMode === 'custom') {
      const nums = customRoomsText
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
      return nums.map(num => ({
        roomNumber: num,
        roomType: roomType,
        isStaffRoom: false
      }));
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propertyCode.trim()) {
      setError('Please enter a unique property code (e.g. PR001).');
      return;
    }
    const cleanFirm = firmName.trim() || propertyCode.trim().toUpperCase();
    setError('');
    setIsSubmitting(true);
    try {
      const initialRooms = getComputedInitialRooms();
      const res = await addProperty({
        propertyCode: propertyCode.trim().toUpperCase(),
        firmName: cleanFirm,
        managerId: managerId || null,
        ownerName: ownerName.trim() || null,
        ownerPhone: ownerPhone.trim() || null,
        tnebNumber: tnebNumber.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        firmLogo,
        eSignature: null,
        initialRooms
      });
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setError(res.message || 'Failed to add property.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to add property.');
    }
  };

  if (!isOpen || !isSuperAdmin) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Modal Header */}
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={22} color="#d97706" />
            </div>
            <div>
              <h3 className="modal-heading">Add New Property</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Configure a new hotel property with manager, ownership, and TNEB details.
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="auth-error-banner" style={{ marginTop: '12px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Row 1: Property Code & Property Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Property Code <span style={{ color: '#be123c' }}>*</span>
              </label>
              <div className="input-icon-wrapper">
                <Hash size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. PR001"
                  value={propertyCode}
                  onChange={(e) => setPropertyCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Property / Hotel Name <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>(Optional)</span>
              </label>
              <div className="input-icon-wrapper">
                <Building2 size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="Defaults to Property Code if left blank"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Assigned Property Manager Dropdown */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              Assigned Property Manager
            </label>
            <div className="input-icon-wrapper">
              <User size={16} className="input-icon" />
              <select
                className="form-input icon-padded"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                style={{ appearance: 'auto', background: '#ffffff', cursor: 'pointer' }}
              >
                <option value="">Unassigned / Default (Admin Managed)</option>
                {managersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.propertyCode ? `[${m.propertyCode}] ` : ''}{m.name} ({m.role || 'Manager'}) — {m.email}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Select a manager created by Super Admin/Admin, or leave unassigned to manage directly.
            </div>
          </div>

          {/* Row 3: Owner Name & Owner Phone Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Property Owner Name
              </label>
              <div className="input-icon-wrapper">
                <UserCheck size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. Mr. Rajesh Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Owner Number / Phone
              </label>
              <div className="input-icon-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  type="tel"
                  className="form-input icon-padded"
                  placeholder="e.g. +91 98765 43210"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 4: TNEB Account Number */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              TNEB Account Number
            </label>
            <div className="input-icon-wrapper">
              <Zap size={16} className="input-icon" color="#d97706" />
              <input
                type="text"
                className="form-input icon-padded"
                placeholder="e.g. 04-123-456-7890 (EB Consumer No)"
                value={tnebNumber}
                onChange={(e) => setTnebNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Row 5: Property Location / Address */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              Property Location / Address
            </label>
            <div className="input-icon-wrapper">
              <MapPin size={16} className="input-icon" />
              <input
                type="text"
                className="form-input icon-padded"
                placeholder="e.g. 12 Beach Boulevard, Goa"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Row 6: Contact Phone & Email Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Front Desk Phone
              </label>
              <div className="input-icon-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  type="tel"
                  className="form-input icon-padded"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Front Desk Email
              </label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="form-input icon-padded"
                  placeholder="e.g. frontdesk@hotel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 7: Property Header Logo */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              Property Header Logo (Optional)
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              background: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {firmLogo ? (
                  <img src={firmLogo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Building2 size={24} color="#f59e0b" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {firmLogo ? 'Custom Logo Uploaded' : 'No Logo Uploaded'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG, JPG or SVG image</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="file"
                  accept="image/*"
                  id="add-prop-logo-file"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
                <label htmlFor="add-prop-logo-file" className="btn-sub" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                  <Upload size={13} /> {firmLogo ? 'Change' : 'Upload'}
                </label>
                {firmLogo && (
                  <button type="button" className="btn-sub" style={{ padding: '6px 8px', fontSize: '12px', color: '#be123c' }} onClick={() => setFirmLogo(null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 8: Initial Rooms Setup (Bulk Add) */}
          <div className="form-group" style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                Initial Room Inventory (Bulk Addition)
              </label>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                {roomMode === 'default' ? '20 Standard Rooms' : roomMode === 'range' ? `${Math.max(0, parseInt(endRoom || 0) - parseInt(startRoom || 0) + 1)} Rooms` : roomMode === 'custom' ? 'Custom Rooms' : '0 Rooms'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {[
                { id: 'range', label: 'By Range' },
                { id: 'custom', label: 'Custom List' },
                { id: 'default', label: 'Preset (20)' },
                { id: 'none', label: 'Add Later' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setRoomMode(mode.id)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: roomMode === mode.id ? '#0f172a' : '#cbd5e1',
                    background: roomMode === mode.id ? '#0f172a' : '#ffffff',
                    color: roomMode === mode.id ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {roomMode === 'range' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start Room No</span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 101"
                      value={startRoom}
                      onChange={(e) => setStartRoom(e.target.value)}
                      style={{ marginTop: '2px', padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>End Room No</span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 120"
                      value={endRoom}
                      onChange={(e) => setEndRoom(e.target.value)}
                      style={{ marginTop: '2px', padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Room Category</span>
                    <select
                      className="form-select"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      style={{ marginTop: '2px', padding: '6px 10px', fontSize: '13px' }}
                    >
                      <option value="Standard Room">Standard Room</option>
                      <option value="Deluxe Suite">Deluxe Suite</option>
                      <option value="Executive Room">Executive Room</option>
                      <option value="Family Villa">Family Villa</option>
                      <option value="Dormitory">Dormitory</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#166534', background: '#f0fdf4', padding: '6px 10px', borderRadius: '4px' }}>
                  Will automatically generate <strong>{Math.max(0, parseInt(endRoom || 0) - parseInt(startRoom || 0) + 1)}</strong> rooms from <strong>{startRoom || '?'}</strong> to <strong>{endRoom || '?'}</strong> ({roomType}).
                </div>
              </div>
            )}

            {roomMode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  className="form-input"
                  placeholder="Enter room numbers separated by commas (e.g. 101, 102, 103, 104, 201, 202, 203)"
                  value={customRoomsText}
                  onChange={(e) => setCustomRoomsText(e.target.value)}
                  rows={2}
                  style={{ fontSize: '12px', padding: '8px 10px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Category:</span>
                  <select
                    className="form-select"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    <option value="Standard Room">Standard Room</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                    <option value="Executive Room">Executive Room</option>
                    <option value="Family Villa">Family Villa</option>
                  </select>
                </div>
              </div>
            )}

            {roomMode === 'default' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Generates default 20 rooms: 101-105, 201-205, 301-305, 401-405 (Standard).
              </div>
            )}

            {roomMode === 'none' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No rooms will be created now. You can add rooms anytime from Settings &gt; Rooms Inventory.
              </div>
            )}
          </div>

          {/* Manager Assignment Note */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: '#166534',
            lineHeight: '1.5'
          }}>
            <Info size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Management &amp; Staff:</strong> As Super Admin or Admin, you can assign existing managers now or update assignments anytime from <strong>Settings &gt; Properties Portfolio</strong>.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-sub" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-main" disabled={isSubmitting || !propertyCode.trim()}>
              {isSubmitting ? 'Creating Property...' : <><Plus size={16} /> Add Property &amp; Open Dashboard</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
