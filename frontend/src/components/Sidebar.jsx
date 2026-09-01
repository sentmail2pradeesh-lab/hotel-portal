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
    logout
  } = useHotel();

  const totalIDCards = guestIDCards.filter(item => item.hasID).length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: BookOpen },
    { id: 'expenses', label: 'Daily expenses', icon: Receipt },
    { id: 'bills', label: 'Bills & add-ons', icon: FileText },
    { id: 'guest-ids', label: 'Guest ID cards', icon: IdCard, badge: totalIDCards },
    { id: 'settings', label: 'Settings & Reports', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <div className="avatar-icon">{currentUser?.initials || 'PM'}</div>
          <div className="user-details">
            <span className="user-name">{currentUser?.name || 'Property Manager'}</span>
            <span className="user-email" style={{ color: '#f59e0b' }}>{currentUser?.firmName || 'Property Dashboard'}</span>
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

