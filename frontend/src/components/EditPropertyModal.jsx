import React, { useState, useEffect } from 'react';
import { useHotel } from '../context/HotelContext';
import { api } from '../services/api';
import { 
  Building2, 
  Upload, 
  X, 
  Save, 
  Info, 
  MapPin, 
  Phone, 
  Mail, 
  Hash, 
  User, 
  UserCheck, 
  Zap,
  CheckCircle2
} from 'lucide-react';

export const EditPropertyModal = ({ isOpen, property, onClose }) => {
  const { updateProperty, isSuperAdmin } = useHotel();

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
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load managers list when modal opens
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

  // Pre-fill form fields when property changes
  useEffect(() => {
    if (isOpen && property) {
      setPropertyCode(property.propertyCode || '');
      setFirmName(property.firmName || '');
      setManagerId(property.managerId || '');
      setOwnerName(property.ownerName || '');
      setOwnerPhone(property.ownerPhone || '');
      setTnebNumber(property.tnebNumber || '');
      setAddress(property.address || '');
      setPhone(property.phone || '');
      setEmail(property.email || '');
      setFirmLogo(property.firmLogo || null);
      setError('');
      setSuccess('');
    }
  }, [isOpen, property]);

  // Match manager if managerId is not explicitly stored but manager name/email matches
  useEffect(() => {
    if (isOpen && property && !property.managerId && managersList.length > 0) {
      const matched = managersList.find(
        (m) => m.propertyId === property.firmId || 
               (property.name && m.name.toLowerCase() === property.name.toLowerCase()) ||
               (property.email && m.email.toLowerCase() === property.email.toLowerCase())
      );
      if (matched) {
        setManagerId(matched.id);
      }
    }
  }, [isOpen, property, managersList]);

  if (!isOpen || !property || !isSuperAdmin) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propertyCode.trim()) {
      setError('Please enter a valid property code (e.g. PR001).');
      return;
    }
    if (!firmName.trim()) {
      setError('Please enter a property name.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Find selected manager details to also pass managerName
      const selectedManager = managersList.find((m) => m.id === managerId);
      
      const payload = {
        propertyCode: propertyCode.trim().toUpperCase(),
        firmName: firmName.trim(),
        managerId: managerId || '',
        managerName: selectedManager ? selectedManager.name : (property.name || null),
        ownerName: ownerName.trim() || null,
        ownerPhone: ownerPhone.trim() || null,
        tnebNumber: tnebNumber.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        firmLogo: firmLogo || '/aszen_ventures.jpeg'
      };

      const res = await updateProperty(property.firmId, payload);
      setIsSubmitting(false);

      if (res.success) {
        setSuccess('Property details updated successfully!');
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res.message || 'Failed to update property details.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to update property details.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={22} color="#0284c7" />
            </div>
            <div>
              <h3 className="modal-heading">Edit Property Details</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Update configuration, assigned manager, owner contacts, and EB details.
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="auth-error-banner" style={{ marginTop: '12px' }}>{error}</div>}
        {success && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            color: '#047857',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

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
                Property / Hotel Name <span style={{ color: '#be123c' }}>*</span>
              </label>
              <div className="input-icon-wrapper">
                <Building2 size={16} className="input-icon" />
                <input
                  type="text"
                  className="form-input icon-padded"
                  placeholder="e.g. Cardella Hotel"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  required
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
              Assign a registered manager to oversee daily check-ins and operations for this property.
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
              Property Header Logo
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
                  <img src="/aszen_ventures.jpeg" alt="Aszen Ventures" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {firmLogo && firmLogo !== '/aszen_ventures.jpeg' ? 'Custom Logo Uploaded' : 'Aszen Ventures Logo (Default)'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG, JPG or SVG image (max 2MB)</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="file"
                  accept="image/*"
                  id="edit-prop-logo-file"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
                <label 
                  htmlFor="edit-prop-logo-file" 
                  className="btn-sub" 
                  style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', margin: 0 }}
                >
                  <Upload size={13} /> {firmLogo ? 'Change' : 'Upload'}
                </label>
                {firmLogo && firmLogo !== '/aszen_ventures.jpeg' && (
                  <button 
                    type="button" 
                    className="btn-sub" 
                    style={{ padding: '6px 8px', fontSize: '12px', color: '#be123c' }} 
                    onClick={() => setFirmLogo(null)}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Note */}
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
              <strong>Instant Sync:</strong> Changes to property name, code, contact details, and EB number update immediately across all active invoices, receipts, and staff dashboards. Room inventory can be configured anytime from <strong>Settings &gt; Add &amp; Manage Rooms</strong>.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-sub" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-main" 
              disabled={isSubmitting || !propertyCode.trim() || !firmName.trim()}
            >
              {isSubmitting ? (
                'Saving Changes...'
              ) : (
                <>
                  <Save size={16} /> Save Property Details
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
