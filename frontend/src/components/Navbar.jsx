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
  Settings,
  Download,
  ChevronDown,
  BedDouble,
  Plus,
  Check,
  Edit2,
  UserPlus
} from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { AddPropertyModal } from './AddPropertyModal';
import { CreateManagerModal } from './CreateManagerModal';

export const Navbar = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser,
    updateUserProfile,
    logout,
    isRegisterOpen, 
    toggleRegisterStatus,
    guestIDCards,
    canAccess,
    isSuperAdmin,
    isAdmin,
    isManager,
    openNewBookingModal,
    navigateToCreateBooking
  } = useHotel();

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showCreateManagerModal, setShowCreateManagerModal] = useState(false);

  const profileMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalIDCards = guestIDCards.filter(item => item.hasID).length;

  // Filter navigation items by active user role permissions & feature toggles
  const allNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, feature: 'overview' },
    { id: 'bookings', label: 'Bookings', icon: BookOpen, feature: 'bookings' },
    { id: 'expenses', label: 'Daily expenses', icon: Receipt, feature: 'expenses' },
    { id: 'bills', label: 'Bills & add-ons', icon: FileText, feature: 'bills' },
    { id: 'guest-ids', label: 'Guest ID cards', icon: IdCard, badge: totalIDCards, feature: 'guest_ids' },
    { id: 'reports', label: 'Reports', icon: Download, feature: 'reports' },
    { id: 'settings', label: 'Settings & Controls', icon: Settings, feature: 'settings' },
  ];

  const navItems = allNavItems.filter(item => 
    item.feature === 'overview' || item.feature === 'settings' || canAccess(item.feature)
  );

  return (
    <aside className="sidebar-nav">
      {/* Brand header: logo tile, company name, divider and system name */}
      <div className="sidebar-brand-section">
        <div className="sidebar-brand-row">
          <div className="sidebar-logo-tile">
            <img
              src={currentUser?.firmLogo || "/aszen_ventures.jpeg"}
              alt={currentUser?.firmName || 'Aszen Ventures'}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-company">AZEN <span>VENTURES</span></div>
            <div className="sidebar-brand-divider" />
            <div className="sidebar-brand-system">Hotel Operations Console</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs List */}
      <div className="sidebar-nav-content">
        <div className="sidebar-section-title">Main Menu</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-tab-button ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="sidebar-tab-left">
                <Icon size={17} color={isActive ? '#f59e0b' : 'currentColor'} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="sidebar-tab-badge">{item.badge}</span>
              )}
            </button>
          );
        })}

        {/* Global New Booking Action */}
        <button 
          type="button"
          className="sidebar-action-button primary-booking"
          style={{
            marginTop: '12px',
            marginBottom: '6px',
            background: isRegisterOpen ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#334155',
            color: '#ffffff',
            fontWeight: 700,
            border: 'none',
            boxShadow: isRegisterOpen ? '0 4px 14px rgba(217, 119, 6, 0.3)' : 'none',
            cursor: isRegisterOpen ? 'pointer' : 'not-allowed'
          }}
          onClick={() => navigateToCreateBooking()}
          disabled={!isRegisterOpen}
          title={isRegisterOpen ? 'Open Dedicated Stay Registration Console' : 'Shift Register is Closed'}
        >
          <Plus size={16} />
          <span>New Stay Booking</span>
        </button>

        {/* Quick Management Shortcuts */}
        {(isSuperAdmin || isAdmin) && (
          <>
            <div className="sidebar-section-title" style={{ marginTop: '10px' }}>Management</div>
            <button 
              type="button"
              className="sidebar-action-button emerald"
              onClick={() => setShowCreateManagerModal(true)}
              title="Add Employees, Managers or Staff"
            >
              <UserPlus size={15} />
              <span>Add Employees</span>
            </button>
            {isSuperAdmin && (
              <button 
                type="button"
                className="sidebar-action-button"
                onClick={() => setShowAddPropertyModal(true)}
              >
                <Plus size={15} color="#d97706" />
                <span>Add Property</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* User Profile Footer & Menu */}
      <div className="sidebar-footer" ref={profileMenuRef}>
        <div 
          className={`sidebar-user-trigger ${showProfileMenu ? 'active' : ''}`}
          onClick={() => setShowProfileMenu((prev) => !prev)}
          title="Click for account options"
        >
          <div className="sidebar-user-avatar" style={{ background: isSuperAdmin ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
            {currentUser?.initials || (isSuperAdmin ? 'SA' : 'PM')}
          </div>
          <div className="sidebar-user-text">
            <div className="sidebar-user-name">
              {currentUser?.name || (isSuperAdmin ? 'Super Admin' : 'Manager')}
            </div>
            <div className="sidebar-user-role">
              {isSuperAdmin ? 'SUPER ADMIN' : (isAdmin ? 'ADMIN' : 'FRONT-DESK')}
            </div>
          </div>
          <ChevronDown size={14} className={`dropdown-chevron ${showProfileMenu ? 'open' : ''}`} />
        </div>

        <div 
          onClick={() => logout()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#94a3b8',
            marginTop: '8px',
            cursor: 'pointer',
            paddingLeft: '6px',
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          title="Sign out of PMS"
        >
          <LogOut size={12} />
          <span>Log out</span>
        </div>

        {/* Profile Pop-Up Menu (Pops Upwards) */}
        {showProfileMenu && (
          <div className="sidebar-profile-dropdown">
            <div className="profile-dropdown-header">
              <div className="dropdown-avatar" style={{ background: isSuperAdmin ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
                {currentUser?.initials || (isSuperAdmin ? 'SA' : 'PM')}
              </div>
              <div className="dropdown-user-details">
                <div className="dropdown-user-name">{currentUser?.name || (isSuperAdmin ? 'Super Admin' : 'Manager')}</div>
                <div className="dropdown-user-email">{currentUser?.email || ''}</div>
                <span className="dropdown-firm-tag" style={{
                  background: isSuperAdmin ? '#fef3c7' : '#ecfdf5',
                  color: isSuperAdmin ? '#b45309' : '#047857',
                  fontWeight: 800
                }}>
                  {isSuperAdmin ? 'Super Admin' : (isAdmin ? 'Admin' : 'Front-Desk Manager')}
                </span>
              </div>
            </div>

            <div className="dropdown-divider" />

            <div className="dropdown-items-group">
              {(isSuperAdmin || isAdmin) && (
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowCreateManagerModal(true);
                    setShowProfileMenu(false);
                  }}
                >
                  <UserPlus size={16} color="#047857" />
                  <div className="dropdown-item-text">
                    <span className="item-title" style={{ fontWeight: 700, color: '#047857' }}>
                      {isSuperAdmin ? '+ Add Employees / Admins' : '+ Add Employees'}
                    </span>
                    <span className="item-sub">Add team & staff credentials</span>
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
                  <span className="item-title">Settings & Feature Controls</span>
                  <span className="item-sub">Reports & configurations</span>
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
                  <span className="item-sub">Configure inventory</span>
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
                  <span className="item-sub">{isRegisterOpen ? 'Shift is OPEN' : 'Shift is CLOSED'}</span>
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

      {/* Create Manager / Admin Modal */}
      {showCreateManagerModal && (
        <CreateManagerModal
          isOpen={showCreateManagerModal}
          onClose={() => setShowCreateManagerModal(false)}
        />
      )}
    </aside>
  );
};
