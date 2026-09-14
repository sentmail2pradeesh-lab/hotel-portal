import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Receipt, 
  FileText, 
  IdCard, 
  LogOut,
  Building2,
  ShieldCheck,
  X,
  Trash2,
  Settings,
  ChevronDown,
  BedDouble,
  Plus,
  Check,
  Edit2
} from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { confirmDouble } from '../utils/formatters';
import { AddPropertyModal } from './AddPropertyModal';

export const Navbar = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser,
    propertiesList,
    activePropertyId,
    switchProperty,
    updateUserProfile,
    logout,
    isRegisterOpen, 
    toggleRegisterStatus,
    guestIDCards,
    clearAllData,
    bookings
  } = useHotel();

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const profileMenuRef = useRef(null);
  const propertyMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (propertyMenuRef.current && !propertyMenuRef.current.contains(event.target)) {
        setShowPropertyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalIDCards = guestIDCards.filter(item => item.hasID).length;
  const isSuperAdmin = currentUser?.role === 'Overall Admin' || currentUser?.role === 'Super Admin';

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: BookOpen },
    { id: 'expenses', label: 'Daily expenses', icon: Receipt },
    { id: 'bills', label: 'Bills & add-ons', icon: FileText },
    { id: 'guest-ids', label: 'Guest ID cards', icon: IdCard, badge: totalIDCards },
  ];

  return (
    <header className="top-nav">
      {/* Brand & Property Switcher Section */}
      <div className="brand-section" ref={propertyMenuRef}>
        <div 
          className="property-switcher-trigger"
          onClick={() => setShowPropertyMenu((prev) => !prev)}
          title="Click to switch property or add new property"
        >
          <div className="brand-logo">
            {currentUser?.firmLogo ? (
              <img 
                src={currentUser.firmLogo} 
                alt={currentUser?.firmName || 'Property Logo'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} 
              />
            ) : (
              <Building2 size={22} color="#000000" />
            )}
          </div>
          <div className="brand-text">
            <div className="brand-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{currentUser?.firmName || 'Property Register'}</span>
              <ChevronDown size={14} className={`dropdown-chevron ${showPropertyMenu ? 'open' : ''}`} color="#d97706" />
            </div>
            <div className="brand-subtitle">{isSuperAdmin ? 'Super Admin Multi-Property Portal' : 'Property Operations Portal'}</div>
          </div>
        </div>

        {/* Property Switcher Dropdown */}
        {showPropertyMenu && (
          <div className="property-dropdown-menu">
            <div className="property-dropdown-header">
              <span>MY PROPERTIES ({propertiesList.length})</span>
              <button 
                className="add-prop-btn-pill"
                onClick={() => {
                  setShowAddPropertyModal(true);
                  setShowPropertyMenu(false);
                }}
              >
                <Plus size={12} /> Add Property
              </button>
            </div>
            <div className="dropdown-divider" />
            <div className="property-list-group">
              {propertiesList.map((p) => {
                const isSelected = p.firmId === activePropertyId;
                return (
                  <div
                    key={p.firmId}
                    className={`property-select-item ${isSelected ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                      onClick={() => {
                        switchProperty(p.firmId);
                        setShowPropertyMenu(false);
                      }}
                    >
                      <div className="prop-item-logo">
                        {p.firmLogo ? (
                          <img src={p.firmLogo} alt={p.firmName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Building2 size={16} color="#d97706" />
                        )}
                      </div>
                      <div className="prop-item-info">
                        <div className="prop-item-name">{p.firmName}</div>
                        <div className="prop-item-sub">Firm ID: {p.firmId}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="icon-btn"
                        style={{ padding: '4px', color: '#0284c7' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProp(p);
                          setRenameInput(p.firmName);
                          setShowPropertyMenu(false);
                        }}
                        title="Rename Property"
                      >
                        <Edit2 size={13} />
                      </button>
                      {isSelected && <Check size={16} color="#047857" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item-btn primary-action"
              onClick={() => {
                setShowAddPropertyModal(true);
                setShowPropertyMenu(false);
              }}
            >
              <Plus size={15} /> Add Another Property
            </button>
          </div>
        )}
      </div>

      <nav className="nav-tabs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`tab-button ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={16} color={isActive ? '#f59e0b' : 'currentColor'} />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="tab-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="top-right-controls">
        {/* Register Status Pill */}
        <div 
          className={`register-status-pill ${isRegisterOpen ? 'open' : 'closed'}`}
          onClick={() => setShowShiftModal(true)}
          title="Click to manage shift register status"
        >
          <span className="pulse-dot" />
          <span>{isRegisterOpen ? 'REGISTER OPEN' : 'REGISTER CLOSED'}</span>
        </div>

        {bookings.length > 0 && (
          <button 
            className="btn-sub"
            style={{ padding: '6px 12px', fontSize: '12px', color: '#fb7185', whiteSpace: 'nowrap' }}
            disabled={!isRegisterOpen}
            onClick={() => {
              if (!isRegisterOpen) {
                alert('Shift Register is Closed. Please open the shift register to perform operations.');
                return;
              }
              if (confirmDouble(
                'Are you sure you want to clear all register entries (bookings, expenses, bills)?',
                'CRITICAL CONFIRMATION: Clearing register will permanently wipe all active stays, expenses, and bills. Are you double sure?'
              )) {
                clearAllData();
              }
            }}
            title={isRegisterOpen ? "Clear all register entries" : "Shift Register is Closed (View-Only Mode)"}
          >
            <Trash2 size={13} /> Clear Register
          </button>
        )}

        {/* Profile Dropdown Menu */}
        <div className="user-profile-wrapper" ref={profileMenuRef}>
          <div 
            className={`user-profile-trigger ${showProfileMenu ? 'active' : ''}`}
            onClick={() => setShowProfileMenu((prev) => !prev)}
            title={isSuperAdmin ? "Super Admin Account & Settings" : "Property Manager Account & Settings"}
          >
            <div className="user-avatar" style={{ background: isSuperAdmin ? '#d97706' : '#0f172a' }}>
              {currentUser?.initials || (isSuperAdmin ? 'SA' : 'PM')}
            </div>
            <div className="user-profile-text">
              <span className="user-profile-name">{currentUser?.name || (isSuperAdmin ? 'Super Admin' : 'Manager')}</span>
              <span className="user-profile-firm">{currentUser?.firmName || 'Firm Dashboard'}</span>
            </div>
            <ChevronDown size={14} className={`dropdown-chevron ${showProfileMenu ? 'open' : ''}`} />
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown-menu">
              <div className="profile-dropdown-header">
                <div className="dropdown-avatar" style={{ background: isSuperAdmin ? '#d97706' : '#0f172a' }}>
                  {currentUser?.initials || (isSuperAdmin ? 'SA' : 'PM')}
                </div>
                <div className="dropdown-user-details">
                  <div className="dropdown-user-name">{currentUser?.name || (isSuperAdmin ? 'Super Admin' : 'Manager')}</div>
                  <span className="dropdown-firm-tag" style={{
                    background: isSuperAdmin ? '#fef3c7' : '#ecfdf5',
                    color: isSuperAdmin ? '#b45309' : '#047857',
                    fontWeight: 800
                  }}>
                    {isSuperAdmin ? 'Super Admin' : 'Property Manager'}
                  </span>
                </div>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-items-group">
                {isSuperAdmin && (
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setShowAddPropertyModal(true);
                      setShowProfileMenu(false);
                    }}
                  >
                    <Plus size={16} color="#047857" />
                    <div className="dropdown-item-text">
                      <span className="item-title" style={{ fontWeight: 700, color: '#047857' }}>+ Add New Property</span>
                      <span className="item-sub">Create & switch to new property</span>
                    </div>
                  </button>
                )}

                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setActiveTab('settings');
                    setShowProfileMenu(false);
                  }}
                >
                  <Settings size={16} color="#f59e0b" />
                  <div className="dropdown-item-text">
                    <span className="item-title">Settings & Executive Analytics</span>
                    <span className="item-sub">Reports, financial logs, & exports</span>
                  </div>
                </button>

                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setActiveTab('settings');
                    setShowProfileMenu(false);
                  }}
                >
                  <BedDouble size={16} color="#0284c7" />
                  <div className="dropdown-item-text">
                    <span className="item-title">Add & Manage Rooms</span>
                    <span className="item-sub">Configure property room inventory</span>
                  </div>
                </button>

                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowShiftModal(true);
                    setShowProfileMenu(false);
                  }}
                >
                  <ShieldCheck size={16} color={isRegisterOpen ? '#10b981' : '#f43f5e'} />
                  <div className="dropdown-item-text">
                    <span className="item-title">Shift Register Status</span>
                    <span className="item-sub">{isRegisterOpen ? 'Shift Register is OPEN' : 'Shift Register is CLOSED'}</span>
                  </div>
                </button>
              </div>

              <div className="dropdown-divider" />

              <button 
                className="dropdown-item danger"
                onClick={() => {
                  logout();
                  setShowProfileMenu(false);
                }}
              >
                <LogOut size={16} />
                <span>Log Out Session</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <AddPropertyModal
          isOpen={showAddPropertyModal}
          onClose={() => setShowAddPropertyModal(false)}
        />
      )}

      {/* Shift Register Status Modal */}
      {showShiftModal && (
        <div className="modal-overlay" onClick={() => setShowShiftModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={24} color="#f59e0b" />
                <h3 className="modal-heading">Front Desk Shift Status</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowShiftModal(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ padding: '12px 0' }}>
              <div style={{
                background: isRegisterOpen ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${isRegisterOpen ? '#a7f3d0' : '#fca5a5'}`,
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>CURRENT SHIFT REGISTER</div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 800, 
                  color: isRegisterOpen ? '#047857' : '#be123c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span className="pulse-dot" />
                  {isRegisterOpen ? 'REGISTER ACTIVE & OPEN' : 'REGISTER SHUT / CLOSED'}
                </div>
              </div>
              
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {isRegisterOpen 
                  ? 'Closing the register logs the end of cash collections for this shift session.'
                  : 'Opening the register allows new room stays, expenses, and ID document mappings.'
                }
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-sub" onClick={() => setShowShiftModal(false)}>Cancel</button>
              <button 
                className="btn-main"
                onClick={() => {
                  toggleRegisterStatus();
                  setShowShiftModal(false);
                }}
              >
                {isRegisterOpen ? 'Close Shift Register' : 'Open Shift Register'}
              </button>
            </div>
          </div>
        </div>
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
    </header>
  );
};
