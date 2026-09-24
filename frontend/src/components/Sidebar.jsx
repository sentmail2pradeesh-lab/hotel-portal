import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Receipt, 
  FileText, 
  IdCard, 
  LogOut,
  CheckCircle2,
  XCircle,
  Settings
} from 'lucide-react';
import { useHotel } from '../context/HotelContext';

export const Sidebar = () => {
  const { 
    activeTab, 
    setActiveTab, 
    isRegisterOpen, 
    guestIDCards,
    currentUser,
    logout,
    canAccess,
    isSuperAdmin,
    isAdmin,
    isManager
  } = useHotel();

  const totalIDCards = guestIDCards.filter(item => item.hasID).length;

  const allNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, feature: 'overview' },
    { id: 'bookings', label: 'Bookings', icon: BookOpen, feature: 'bookings' },
    { id: 'expenses', label: 'Daily expenses', icon: Receipt, feature: 'expenses' },
    { id: 'bills', label: 'Bills & add-ons', icon: FileText, feature: 'bills' },
    { id: 'guest-ids', label: 'Guest ID cards', icon: IdCard, badge: totalIDCards, feature: 'guest_ids' },
    { id: 'settings', label: 'Settings & Reports', icon: Settings, feature: 'reports' },
  ];

  const navItems = allNavItems.filter(item => item.feature === 'overview' || canAccess(item.feature));

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <div className="avatar-icon" style={{
            background: isSuperAdmin ? '#d97706' : (isAdmin ? '#0284c7' : '#047857')
          }}>
            {currentUser?.initials || (isSuperAdmin ? 'SA' : (isAdmin ? 'AD' : 'PM'))}
          </div>
          <div className="user-details">
            <span className="user-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{currentUser?.name || 'User'}</span>
            </span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 800, 
              color: isSuperAdmin ? '#f59e0b' : (isAdmin ? '#38bdf8' : '#34d399'),
              textTransform: 'uppercase'
            }}>
              {currentUser?.role || 'Portal User'}
            </span>
            {currentUser?.propertyCode && (
              <span style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                fontWeight: 800,
                color: '#fef08a',
                background: 'rgba(254, 240, 138, 0.15)',
                border: '1px solid rgba(254, 240, 138, 0.3)',
                borderRadius: '3px',
                padding: '1px 5px',
                marginTop: '3px',
                letterSpacing: '0.5px',
                display: 'inline-block',
                width: 'fit-content'
              }}>
                CODE: {currentUser.propertyCode}
              </span>
            )}
            <span className="user-email" style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '11px', marginTop: currentUser?.propertyCode ? '1px' : '2px', fontWeight: 500 }}>
              {currentUser?.firmName || 'Property Dashboard'}
            </span>
          </div>
        </div>

        <nav>
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div 
          style={{ 
            fontSize: '12px', 
            color: '#a0b3a7', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '4px 8px'
          }}
        >
          <span>Shift Register:</span>
          <span style={{ 
            color: isRegisterOpen ? '#52c41a' : '#ff4d4f', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isRegisterOpen ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {isRegisterOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>

        <button 
          className="logout-btn" 
          onClick={logout}
          title="Sign out of Property Manager session"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </aside>
  );
};

