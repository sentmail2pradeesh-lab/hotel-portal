import React, { useState, useEffect, useRef } from 'react';
import { useHotel } from '../context/HotelContext';
import { 
  Search, 
  Calendar, 
  Sun, 
  Bell, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings, 
  BedDouble, 
  Users, 
  CheckCircle2, 
  Clock,
  X,
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export const TopHeader = () => {
  const { 
    currentUser, 
    bookings, 
    roomsList, 
    setActiveTab, 
    logout,
    openNewBookingModal
  } = useHotel();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(1);
  const [hasDismissedNotifications, setHasDismissedNotifications] = useState(false);

  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target) && !searchInputRef.current?.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [weatherData, setWeatherData] = useState({
    city: 'Bengaluru',
    temp: '29°C',
    condition: 'Partly Cloudy'
  });

  // Dynamic live weather fetching for Bengaluru / Geolocation
  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async (lat, lon, cityName) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        if (!res.ok) return;
        const data = await res.json();
        const cw = data.current_weather;
        if (!cw) return;

        const tempC = Math.round(cw.temperature);
        const code = cw.weathercode;
        let cond = 'Clear';
        if (code === 0) cond = 'Clear';
        else if (code <= 3) cond = 'Partly Cloudy';
        else if (code <= 48) cond = 'Foggy';
        else if (code <= 67) cond = 'Rain';
        else if (code <= 82) cond = 'Showers';
        else if (code <= 99) cond = 'Thunderstorm';

        if (isMounted) {
          setWeatherData({
            city: cityName || 'Bengaluru',
            temp: `${tempC}°C`,
            condition: cond
          });
        }
      } catch (err) {
        console.warn('Weather fetch warning:', err);
      }
    };

    // Try HTML5 Geolocation with fallback to Bengaluru coordinates (12.9716, 77.5946)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let detectedCity = 'Bengaluru';
          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (geoRes.ok) {
              const geoJson = await geoRes.json();
              detectedCity = geoJson.city || geoJson.locality || geoJson.principalSubdivision || 'Bengaluru';
            }
          } catch {
            detectedCity = 'Bengaluru';
          }
          fetchWeather(latitude, longitude, detectedCity);
        },
        () => {
          fetchWeather(12.9716, 77.5946, 'Bengaluru');
        },
        { timeout: 6000 }
      );
    } else {
      fetchWeather(12.9716, 77.5946, 'Bengaluru');
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Format today's date
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedToday = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}, ${dayNames[now.getDay()]}`;
  const todayDateStr = now.toISOString().split('T')[0];

  // Live Overdue & Operational Notifications
  const overdueBookings = (bookings || []).filter(b => {
    if (b.isHidden) return false;
    const outDate = b.checkOut ? b.checkOut.split('T')[0] : '';
    return outDate && outDate < todayDateStr && (b.status === 'In-House' || b.computedStatus === 'In-House');
  });

  const dueTodayBookings = (bookings || []).filter(b => {
    if (b.isHidden) return false;
    const outDate = b.checkOut ? b.checkOut.split('T')[0] : '';
    return outDate === todayDateStr && b.status === 'In-House';
  });

  // Activity notifications
  const recentNotifications = [
    ...overdueBookings.map(b => ({
      id: `overdue-${b.id}`,
      title: `Overdue Check-out: Room ${b.room || '—'} (${b.guestName})`,
      time: `Expired on ${b.checkOut} • Force check-out completed`,
      unread: true,
      icon: AlertCircle,
      color: '#dc2626'
    })),
    ...dueTodayBookings.map(b => ({
      id: `duetoday-${b.id}`,
      title: `Check-out Due Today: Room ${b.room || '—'} (${b.guestName})`,
      time: `Scheduled departure today`,
      unread: true,
      icon: Clock,
      color: '#d97706'
    })),
    {
      id: 'shift-1',
      title: 'Shift Register is Active',
      time: 'Front desk operational',
      unread: false,
      icon: CheckCircle2,
      color: '#059669'
    },
    {
      id: 'inv-2',
      title: `${bookings?.length || 0} Total Bookings on file`,
      time: 'Inventory synchronized',
      unread: false,
      icon: BedDouble,
      color: '#2563eb'
    }
  ];

  const totalUnreadNotifs = overdueBookings.length + (dueTodayBookings.length > 0 ? 1 : 0);

  // Filtered search results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    
    // Search in bookings
    const matchedBookings = (bookings || [])
      .filter(b => 
        (b.guestName && b.guestName.toLowerCase().includes(q)) ||
        (b.manualId && b.manualId.toLowerCase().includes(q)) ||
        (b.room && b.room.toLowerCase().includes(q)) ||
        (b.id && b.id.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map(b => ({
        type: 'booking',
        title: b.guestName,
        subtitle: `Room ${b.room || 'Unassigned'} • ${b.status || 'Active'} • ID: ${b.manualId || b.id?.substring(0, 8)}`,
        data: b
      }));

    // Search in rooms
    const matchedRooms = (roomsList || [])
      .filter(r => r.toLowerCase().includes(q))
      .slice(0, 3)
      .map(r => ({
        type: 'room',
        title: `Room ${r}`,
        subtitle: 'Room Inventory Unit',
        data: r
      }));

    return [...matchedBookings, ...matchedRooms];
  }, [searchQuery, bookings, roomsList]);

  // User display name
  const displayName = currentUser?.name || 'User';
  const userInitials = currentUser?.initials || displayName.substring(0, 2).toUpperCase();

  return (
    <header className="top-header-bar">
      {/* Left: Global Search Input */}
      <div className="top-search-container" ref={searchDropdownRef}>
        <div className="top-search-input-wrapper">
          <Search size={16} className="top-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="top-search-input"
            placeholder="Search guest, room, or booking..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
          />
          {searchQuery ? (
            <button 
              className="top-search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <X size={14} />
            </button>
          ) : (
            <div className="top-search-shortcut">
              <span>Ctrl + K</span>
            </div>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="top-search-results-dropdown">
            <div className="top-search-header">
              <span>Search Results ({searchResults.length})</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="top-search-empty">
                No matching guest, booking, or room found for "{searchQuery}".
              </div>
            ) : (
              <div className="top-search-list">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="top-search-item"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      if (item.type === 'booking') {
                        setActiveTab('bookings');
                      } else {
                        setActiveTab('overview');
                      }
                    }}
                  >
                    <div className={`top-search-item-icon ${item.type}`}>
                      {item.type === 'booking' ? <Users size={14} /> : <BedDouble size={14} />}
                    </div>
                    <div className="top-search-item-info">
                      <div className="top-search-item-title">{item.title}</div>
                      <div className="top-search-item-sub">{item.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Date, Weather, Notifications, Profile */}
      <div className="top-actions-container">
        {/* Date Widget */}
        <div className="top-widget-pill" title="Today's Date">
          <Calendar size={14} className="top-widget-icon" color="#2563eb" />
          <div className="top-widget-text">
            <span className="top-widget-label">Today</span>
            <span className="top-widget-val">{formattedToday}</span>
          </div>
        </div>

        {/* Weather Widget */}
        <div className="top-widget-pill weather" title={`Current Local Weather (${weatherData.city})`}>
          <Sun size={15} className="top-widget-icon weather-sun" color="#f59e0b" />
          <div className="top-widget-text">
            <span className="top-widget-label">{weatherData.city}</span>
            <span className="top-widget-val">{weatherData.temp} &bull; {weatherData.condition}</span>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="top-notification-wrapper" ref={notificationRef}>
          <button 
            className={`top-icon-btn ${showNotifications ? 'active' : ''}`}
            onClick={() => {
              setShowNotifications(prev => !prev);
              setHasDismissedNotifications(true);
              setUnreadNotifications(0);
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {!hasDismissedNotifications && (totalUnreadNotifs > 0 || unreadNotifications > 0) && (
              <span className="top-notification-badge">
                {totalUnreadNotifs > 0 ? totalUnreadNotifs : unreadNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="top-notifications-popover">
              <div className="top-popover-header">
                <span>Notifications</span>
                <span className="top-popover-tag">Activity Log</span>
              </div>
              <div className="top-notifications-list">
                {recentNotifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No new notifications
                  </div>
                ) : (
                  recentNotifications.map(n => {
                    const IconComp = n.icon || Bell;
                    return (
                      <div 
                        key={n.id} 
                        className="top-notification-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setShowNotifications(false);
                          if (n.id.toString().startsWith('overdue') || n.id.toString().startsWith('duetoday') || n.id.toString().startsWith('inv')) {
                            setActiveTab('bookings');
                          }
                        }}
                      >
                        <div className="top-notif-icon" style={{ background: `${n.color}15`, color: n.color }}>
                          <IconComp size={14} />
                        </div>
                        <div className="top-notif-info">
                          <div className="top-notif-title">{n.title}</div>
                          <div className="top-notif-time">{n.time}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="top-profile-wrapper" ref={profileRef}>
          <div 
            className={`top-profile-trigger ${showProfileMenu ? 'active' : ''}`}
            onClick={() => setShowProfileMenu(prev => !prev)}
            title="User Account & Options"
          >
            <div className="top-avatar-circle">
              {userInitials}
            </div>
            <div className="top-user-details">
              <span className="top-user-name">{displayName}</span>
              <span className="top-user-role">{currentUser?.role || 'Staff'}</span>
            </div>
            <ChevronDown size={14} className={`top-chevron ${showProfileMenu ? 'open' : ''}`} />
          </div>

          {showProfileMenu && (
            <div className="top-profile-menu">
              <div className="top-profile-menu-header">
                <div className="top-menu-user-name">{displayName}</div>
                <div className="top-menu-user-email">{currentUser?.email || 'Logged in'}</div>
                <div className="top-menu-role-badge">
                  {currentUser?.role || 'Staff'} Mode
                </div>
              </div>
              <div className="top-menu-divider" />
              <button 
                className="top-menu-item"
                onClick={() => {
                  setActiveTab('settings');
                  setShowProfileMenu(false);
                }}
              >
                <Settings size={14} />
                <span>Settings & Controls</span>
              </button>
              <div className="top-menu-divider" />
              <button 
                className="top-menu-item logout"
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
