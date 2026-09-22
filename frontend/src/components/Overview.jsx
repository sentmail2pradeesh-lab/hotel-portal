import React, { useState, useMemo } from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  PlusCircle, 
  ShieldCheck, 
  TrendingUp, 
  Building2, 
  CreditCard,
  Users, 
  ChevronRight, 
  BedDouble, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Edit2, 
  X, 
  Lock, 
  UserCheck, 
  Footprints,
  AlertTriangle,
  Key,
  DoorOpen
} from 'lucide-react';

export const Overview = () => {
  const { 
    currentUser,
    isRegisterOpen, 
    bookings,
    roomsList,
    roomsDetails,
    editCustomRoom,
    setActiveTab,
    isSuperAdmin,
    isAdmin,
    isManager,
    openNewBookingModal
  } = useHotel();

  // State for room editing modal (Super Admin & Admin only)
  const [editingRoom, setEditingRoom] = useState(null);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [isStaffRoom, setIsStaffRoom] = useState(false);
  const [roomType, setRoomType] = useState('Standard');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Helper for guest initials
  const getInitials = (name) => {
    if (!name) return 'VIP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Date constants for daily & monthly stay calculations
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Format today's date for display
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedToday = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  // Dynamic Greeting based on time of day
  const currentHour = today.getHours();
  let greetingPeriod = 'Morning';
  let greetingIcon = '☀️';
  if (currentHour >= 12 && currentHour < 17) {
    greetingPeriod = 'Afternoon';
    greetingIcon = '🌤️';
  } else if (currentHour >= 17) {
    greetingPeriod = 'Evening';
    greetingIcon = '🌙';
  }
  const userDisplayName = currentUser?.name || 'User';

  // --- ROOM & INVENTORY CALCULATIONS ---
  const roomDetailsMap = useMemo(() => {
    const map = {};
    (roomsDetails || []).forEach(rd => {
      map[rd.roomNumber] = rd;
    });
    return map;
  }, [roomsDetails]);

  // Active in-house bookings
  const inHouseBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'In-House' || b.status === 'Checked-In');
  }, [bookings]);

  // Map each room to its active booking
  const roomBookingMap = useMemo(() => {
    const map = {};
    inHouseBookings.forEach(b => {
      if (b.room) map[b.room] = b;
    });
    return map;
  }, [inHouseBookings]);

  const inHouseRoomsSet = useMemo(() => {
    const validSellableRooms = new Set(roomsList.filter(r => !roomDetailsMap[r]?.isStaffRoom));
    return new Set(inHouseBookings.map(b => b.room).filter(r => r && validSellableRooms.has(r)));
  }, [inHouseBookings, roomsList, roomDetailsMap]);

  // Staff rooms (excluded from sellable inventory)
  const staffRoomsCount = useMemo(() => {
    return roomsList.filter(r => roomDetailsMap[r]?.isStaffRoom).length;
  }, [roomsList, roomDetailsMap]);

  const totalRoomsCount = roomsList.length;
  const sellableInventory = Math.max(0, totalRoomsCount - staffRoomsCount);
  const inHouseRoomsCount = inHouseRoomsSet.size;
  const availableRoomsCount = Math.max(0, sellableInventory - inHouseRoomsCount);

  // Fully Paid / Pre-paid rooms
  const fullyPaidPrepaidRoomsCount = useMemo(() => {
    return bookings.filter(b => {
      const isOnlinePrepaid = b.isPrepaid || b.bookingType === 'Online Pre-paid';
      const isPaidCashOrUPI = b.amountPaid > 0 && b.paidVia && b.paidVia !== 'Pending';
      return (isOnlinePrepaid || isPaidCashOrUPI) && (b.status === 'In-House' || b.status === 'Upcoming');
    }).length;
  }, [bookings]);

  // Confirmed upcoming
  const confirmedUpcomingCount = useMemo(() => {
    return bookings.filter(b => {
      return b.status === 'Upcoming' && (b.isPrepaid || b.bookingType === 'Online Pre-paid' || b.amountPaid > 0);
    }).length;
  }, [bookings]);

  // Continue guest for tomorrow
  const continueGuestTomorrowCount = useMemo(() => {
    return inHouseBookings.filter(b => {
      return b.checkOut && b.checkOut > tomorrowStr;
    }).length;
  }, [inHouseBookings, tomorrowStr]);

  // Total walk-in rooms
  const totalWalkinRoomsCount = useMemo(() => {
    return bookings.filter(b => {
      return b.bookingType === 'Walk-in' || (!b.bookingType && b.paidVia === 'Cash');
    }).length;
  }, [bookings]);

  // Today's Overview specific counts
  const checkInsTodayCount = useMemo(() => {
    return bookings.filter(b => b.checkIn === todayStr).length;
  }, [bookings, todayStr]);

  const checkOutsTodayCount = useMemo(() => {
    return bookings.filter(b => b.checkOut === todayStr).length;
  }, [bookings, todayStr]);

  const overdueCheckOutsCount = useMemo(() => {
    return inHouseBookings.filter(b => b.checkOut && b.checkOut < todayStr).length;
  }, [inHouseBookings, todayStr]);

  // --- 7-DAY OCCUPANCY TREND DATA ---
  const occupancy7Days = useMemo(() => {
    const list = [];
    const totalCap = sellableInventory || 19;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      
      const occ = bookings.filter(b => {
        return b.checkIn && b.checkOut && dStr >= b.checkIn && dStr <= b.checkOut;
      }).length;
      
      const boundedOcc = Math.min(occ, totalCap);
      const avail = Math.max(0, totalCap - boundedOcc);
      const rate = Math.round((boundedOcc / totalCap) * 100);

      list.push({
        dateStr: dStr,
        label,
        occupied: boundedOcc,
        available: avail,
        total: totalCap,
        rate
      });
    }
    return list;
  }, [bookings, sellableInventory, today]);

  // Donut percentages
  const availablePct = Math.round((availableRoomsCount / Math.max(1, totalRoomsCount)) * 100);
  const occupiedPct = Math.round((inHouseRoomsCount / Math.max(1, totalRoomsCount)) * 100);
  const staffPct = Math.round((staffRoomsCount / Math.max(1, totalRoomsCount)) * 100);

  // SVG Donut calculation (circumference for radius 44 = 276.46)
  const C = 276.46;
  const availDash = (availablePct / 100) * C;
  const occDash = (occupiedPct / 100) * C;
  const staffDash = (staffPct / 100) * C;

  // --- FLOOR-WISE ROOM GROUPING ---
  const floorGroups = useMemo(() => {
    const groups = {};
    roomsList.forEach(roomNum => {
      const digits = roomNum.match(/\d+/);
      let floorKey = '1st Floor';
      if (digits) {
        const firstDigit = digits[0].length >= 3 ? digits[0][0] : '1';
        if (firstDigit === '1') floorKey = '1st Floor';
        else if (firstDigit === '2') floorKey = '2nd Floor';
        else if (firstDigit === '3') floorKey = '3rd Floor';
        else if (firstDigit === '4') floorKey = '4th Floor';
        else if (firstDigit === '5') floorKey = '5th Floor';
        else floorKey = `${firstDigit}th Floor`;
      }
      if (!groups[floorKey]) groups[floorKey] = [];
      groups[floorKey].push(roomNum);
    });

    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => {
        const nA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const nB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return nA - nB;
      });
    });

    return groups;
  }, [roomsList]);

  // --- RECENT GUEST STAYS ---
  const recentStays = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.createdAt || b.checkIn || 0) - new Date(a.createdAt || a.checkIn || 0))
      .slice(0, 5);
  }, [bookings]);

  // Open Edit Room Modal
  const handleOpenEditRoom = (roomNum) => {
    if (isManager) return; // View-only for managers
    const rd = roomDetailsMap[roomNum];
    setEditingRoom(roomNum);
    setNewRoomNumber(roomNum);
    setIsStaffRoom(Boolean(rd?.isStaffRoom));
    setRoomType(rd?.roomType || 'Standard');
    setEditError('');
  };

  const handleSaveRoomEdit = async (e) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) {
      setEditError('Room number is required.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const res = await editCustomRoom(editingRoom, newRoomNumber.trim(), isStaffRoom, roomType);
      if (res.success) {
        setEditingRoom(null);
      } else {
        setEditError(res.message || 'Failed to update room.');
      }
    } catch (err) {
      setEditError(err.message || 'Unexpected error while updating room.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="overview-view">
      {/* 1. WELCOME GREETING BANNER (NO BACKGROUND IMAGES) */}
      <div className="welcome-banner">
        <div>
          <div className="welcome-pre">WELCOME BACK,</div>
          <div className="welcome-title">
            Good {greetingPeriod}, {userDisplayName} {greetingIcon}
          </div>
          <div className="welcome-sub">
            Here's what's happening at your property today.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="welcome-quote">
            &ldquo;Great Hospitality Builds Brighter Tomorrows&rdquo;
          </div>
          <button 
            className="btn-main" 
            onClick={() => openNewBookingModal()} 
            title="Register New Stay"
            style={{ padding: '9px 18px', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            <PlusCircle size={16} /> New Booking
          </button>
        </div>
      </div>

      {/* 2. 7 EXECUTIVE METRIC CARDS ROW (NO BOTTOM WAVES) */}
      <div className="metrics-row-7">
        {/* Metric 1: Total Inventory */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Total Inventory</span>
            <div className="metric-icon-badge blue">
              <Building2 size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{sellableInventory}</span>
            <span className="metric-tag-pill neutral">Sellable</span>
          </div>
          <div className="metric-card-footer">
            <span>{totalRoomsCount} Total Rooms {staffRoomsCount > 0 ? `(−${staffRoomsCount} Staff)` : ''}</span>
          </div>
        </div>

        {/* Metric 2: In-House Stays */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">In-House Stays</span>
            <div className="metric-icon-badge amber">
              <Users size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{inHouseRoomsCount}</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot amber" />
            <span>Active guest suites</span>
          </div>
        </div>

        {/* Metric 3: Available Rooms (Tasteful Emerald Highlight) */}
        <div className="metric-card highlight-available">
          <div className="metric-card-header">
            <span className="metric-card-label" style={{ color: '#047857' }}>Available Rooms</span>
            <div className="metric-icon-badge emerald">
              <BedDouble size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{availableRoomsCount}</span>
            <span className="metric-tag-sub">/ {sellableInventory}</span>
          </div>
          <div className="metric-card-footer" style={{ color: '#047857' }}>
            <span className="metric-status-dot emerald" />
            <span>Vacant &amp; ready</span>
          </div>
        </div>

        {/* Metric 4: Pre-paid / Paid */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Pre-Paid / Paid</span>
            <div className="metric-icon-badge teal">
              <CreditCard size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{fullyPaidPrepaidRoomsCount}</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot teal" />
            <span>Online advance paid</span>
          </div>
        </div>

        {/* Metric 5: Confirmed Upcoming */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Confirmed Upcoming</span>
            <div className="metric-icon-badge rose">
              <Calendar size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{confirmedUpcomingCount}</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-status-dot blue" />
            <span>Guaranteed arrivals</span>
          </div>
        </div>

        {/* Metric 6: Continue Guests */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Continue Guests</span>
            <div className="metric-icon-badge indigo">
              <Clock size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{continueGuestTomorrowCount}</span>
          </div>
          <div className="metric-card-footer">
            <span>Stays tomorrow</span>
          </div>
        </div>

        {/* Metric 7: Walk-in Rooms */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Walk-In Rooms</span>
            <div className="metric-icon-badge slate">
              <Footprints size={15} />
            </div>
          </div>
          <div className="metric-card-value-row">
            <span className="metric-card-value">{totalWalkinRoomsCount}</span>
          </div>
          <div className="metric-card-footer">
            <span>Instant bookings</span>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE ROW: OCCUPANCY OVERVIEW, ROOM STATUS DONUT, TODAY'S OVERVIEW */}
      <div className="dashboard-middle-row">
        {/* Card A: Occupancy Overview (7-Day SVG Bar & Line Chart) */}
        <div className="pro-card">
          <div>
            <div className="pro-card-header">
              <div>
                <h3 className="pro-card-title">Occupancy Overview</h3>
                <p className="pro-card-subtitle">Room inventory and occupancy trend</p>
              </div>
              <div className="pro-card-action-btn">
                <span>Last 7 days</span>
                <ChevronRight size={12} />
              </div>
            </div>

            <div className="chart-legend-row">
              <div className="chart-legend-item">
                <span className="chart-legend-dot" style={{ background: '#f59e0b' }} />
                <span>Occupied</span>
              </div>
              <div className="chart-legend-item">
                <span className="chart-legend-dot" style={{ background: '#10b981' }} />
                <span>Available</span>
              </div>
              <div className="chart-legend-item">
                <span className="chart-legend-dot" style={{ background: '#cbd5e1' }} />
                <span>Total Rooms</span>
              </div>
            </div>

            {/* Clean SVG Mixed Chart */}
            <div className="chart-svg-container">
              <svg viewBox="0 0 460 160" width="100%" height="100%">
                {/* Horizontal Gridlines */}
                <line x1="30" y1="20" x2="440" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="60" x2="440" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="100" x2="440" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="135" x2="440" y2="135" stroke="#e2e8f0" strokeWidth="1" />

                {/* Y-axis Labels */}
                <text x="24" y="24" textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="system-ui">20</text>
                <text x="24" y="64" textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="system-ui">15</text>
                <text x="24" y="104" textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="system-ui">10</text>
                <text x="24" y="138" textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="system-ui">0</text>

                {/* Bars for 7 Days */}
                {occupancy7Days.map((d, i) => {
                  const x = 52 + i * 56;
                  const maxVal = 20;
                  const occHeight = Math.max(4, (d.occupied / maxVal) * 110);
                  const availHeight = Math.max(4, (d.available / maxVal) * 110);
                  const occY = 135 - occHeight;
                  const availY = 135 - availHeight;

                  return (
                    <g key={i}>
                      {/* Available bar (green) */}
                      <rect 
                        x={x - 7} 
                        y={availY} 
                        width="7" 
                        height={availHeight} 
                        fill="#10b981" 
                        rx="2" 
                        opacity="0.85"
                      />
                      {/* Occupied bar (amber) */}
                      <rect 
                        x={x + 1} 
                        y={occY} 
                        width="7" 
                        height={occHeight} 
                        fill="#f59e0b" 
                        rx="2" 
                      />
                      {/* X-axis Date label */}
                      <text 
                        x={x} 
                        y="152" 
                        textAnchor="middle" 
                        fontSize="9" 
                        fill="#64748b" 
                        fontWeight="600"
                        fontFamily="system-ui"
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}

                {/* Line trend across days */}
                <polyline
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  points={occupancy7Days.map((d, i) => {
                    const x = 52 + i * 56;
                    const y = 135 - Math.max(6, (d.occupied / 20) * 110);
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Trend dots */}
                {occupancy7Days.map((d, i) => {
                  const x = 52 + i * 56;
                  const y = 135 - Math.max(6, (d.occupied / 20) * 110);
                  return (
                    <circle 
                      key={i} 
                      cx={x} 
                      cy={y} 
                      r="3.5" 
                      fill="#ffffff" 
                      stroke="#d97706" 
                      strokeWidth="2" 
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Card B: Room Status (Donut Chart) */}
        <div className="pro-card">
          <div>
            <div className="pro-card-header">
              <div>
                <h3 className="pro-card-title">Room Status</h3>
              </div>
              <button 
                className="pro-card-action-btn"
                onClick={() => setActiveTab('bookings')}
                style={{ border: 'none', background: 'none', color: '#2563eb', padding: 0 }}
              >
                <span>View All Rooms</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Donut & Breakdown Stage */}
            <div className="donut-stage">
              <div className="donut-svg-box">
                <svg viewBox="0 0 110 110" width="100%" height="100%">
                  {/* Background Track */}
                  <circle
                    cx="55"
                    cy="55"
                    r="44"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="12"
                  />
                  {/* Available Segment (Green) */}
                  <circle
                    cx="55"
                    cy="55"
                    r="44"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${availDash} ${C}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                  />
                  {/* Occupied Segment (Orange) */}
                  <circle
                    cx="55"
                    cy="55"
                    r="44"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${occDash} ${C}`}
                    strokeDashoffset={`${-availDash}`}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                  />
                  {/* Staff Segment (Slate) */}
                  <circle
                    cx="55"
                    cy="55"
                    r="44"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="12"
                    strokeDasharray={`${staffDash} ${C}`}
                    strokeDashoffset={`${-(availDash + occDash)}`}
                    transform="rotate(-90 55 55)"
                  />
                </svg>

                <div className="donut-center-label">
                  <div className="donut-center-num">{totalRoomsCount}</div>
                  <div className="donut-center-sub">Total Rooms</div>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="donut-breakdown-list">
                <div className="donut-breakdown-item">
                  <div className="donut-breakdown-name">
                    <span className="chart-legend-dot" style={{ background: '#10b981' }} />
                    <span>Available</span>
                  </div>
                  <div className="donut-breakdown-values">
                    <span className="donut-breakdown-count">{availableRoomsCount}</span>
                    <span className="donut-breakdown-pct">{availablePct}%</span>
                  </div>
                </div>

                <div className="donut-breakdown-item">
                  <div className="donut-breakdown-name">
                    <span className="chart-legend-dot" style={{ background: '#f59e0b' }} />
                    <span>Occupied</span>
                  </div>
                  <div className="donut-breakdown-values">
                    <span className="donut-breakdown-count">{inHouseRoomsCount}</span>
                    <span className="donut-breakdown-pct">{occupiedPct}%</span>
                  </div>
                </div>

                <div className="donut-breakdown-item">
                  <div className="donut-breakdown-name">
                    <span className="chart-legend-dot" style={{ background: '#94a3b8' }} />
                    <span>Staff Quarter</span>
                  </div>
                  <div className="donut-breakdown-values">
                    <span className="donut-breakdown-count">{staffRoomsCount}</span>
                    <span className="donut-breakdown-pct">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Room Allocation Banner */}
          <div 
            className="quick-alloc-banner"
            onClick={() => setActiveTab('bookings')}
            title="Open Room Allocation"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={13} color="#b45309" />
              </div>
              <div>
                <div className="quick-alloc-title">Quick Room Allocation</div>
                <div className="quick-alloc-sub">Click to allocate rooms quickly</div>
              </div>
            </div>
            <ChevronRight size={14} color="#b45309" />
          </div>
        </div>

        {/* Card C: Today's Overview (KPI Rows) */}
        <div className="pro-card">
          <div>
            <div className="pro-card-header">
              <div>
                <h3 className="pro-card-title">Today's Overview</h3>
                <p className="pro-card-subtitle">{formattedToday}</p>
              </div>
              <button 
                className="pro-card-action-btn"
                onClick={() => setActiveTab('bookings')}
                title="View Calendar Bookings"
              >
                View Calendar
              </button>
            </div>

            <div className="todays-kpi-list">
              {/* 1. Check-ins Today */}
              <div className="todays-kpi-item">
                <div className="todays-kpi-left">
                  <div className="todays-kpi-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                    <Users size={14} />
                  </div>
                  <div>
                    <div className="todays-kpi-title">Check-ins Today</div>
                    <div className="todays-kpi-sub">Expected arrivals</div>
                  </div>
                </div>
                <div className="todays-kpi-val">{checkInsTodayCount}</div>
              </div>

              {/* 2. Check-outs Today */}
              <div className="todays-kpi-item">
                <div className="todays-kpi-left">
                  <div className="todays-kpi-badge" style={{ background: '#fff1f2', color: '#e11d48' }}>
                    <BedDouble size={14} />
                  </div>
                  <div>
                    <div className="todays-kpi-title">Check-outs Today</div>
                    <div className="todays-kpi-sub">Expected departures</div>
                  </div>
                </div>
                <div className="todays-kpi-val">{checkOutsTodayCount}</div>
              </div>

              {/* 3. Confirmed Arrivals */}
              <div className="todays-kpi-item">
                <div className="todays-kpi-left">
                  <div className="todays-kpi-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <Calendar size={14} />
                  </div>
                  <div>
                    <div className="todays-kpi-title">Confirmed Arrivals</div>
                    <div className="todays-kpi-sub">Upcoming reservations</div>
                  </div>
                </div>
                <div className="todays-kpi-val">{confirmedUpcomingCount}</div>
              </div>

              {/* 4. Overdue Check-outs */}
              <div className="todays-kpi-item">
                <div className="todays-kpi-left">
                  <div className="todays-kpi-badge" style={{ background: '#fffbeb', color: '#d97706' }}>
                    <AlertTriangle size={14} />
                  </div>
                  <div>
                    <div className="todays-kpi-title">Overdue Check-outs</div>
                    <div className="todays-kpi-sub">Require front desk attention</div>
                  </div>
                </div>
                <div className="todays-kpi-val">{overdueCheckOutsCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LOWER ROW: ROOM AVAILABILITY (BY FLOOR) & RECENT GUEST STAYS */}
      <div className="dashboard-lower-row">
        {/* Left: Room Availability Grouped by Floor */}
        <div className="pro-card" style={{ padding: '20px' }}>
          <div>
            <div className="pro-card-header">
              <div>
                <h3 className="pro-card-title">Room Availability ({totalRoomsCount} Suites)</h3>
                <p className="pro-card-subtitle">
                  Live status of all rooms. {!isManager && 'Click on a room to edit room number or staff allocation.'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#166534' }}>
                  <span className="chart-legend-dot" style={{ background: '#10b981' }} />
                  Available ({availableRoomsCount})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#9f1239' }}>
                  <span className="chart-legend-dot" style={{ background: '#f43f5e' }} />
                  Occupied ({inHouseRoomsCount})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                  <span className="chart-legend-dot" style={{ background: '#94a3b8' }} />
                  Staff Quarter ({staffRoomsCount})
                </span>
              </div>
            </div>

            {/* Floor Group Rows */}
            <div className="floor-group-container">
              {Object.keys(floorGroups).map(floorKey => (
                <div key={floorKey} className="floor-group-row">
                  <div className="floor-group-label">{floorKey}</div>
                  <div className="floor-rooms-flex">
                    {floorGroups[floorKey].map(roomNum => {
                      const rd = roomDetailsMap[roomNum];
                      const isStaff = Boolean(rd?.isStaffRoom);
                      const isOccupied = inHouseRoomsSet.has(roomNum);
                      const isAvailable = (!isOccupied) && (!isStaff);
                      const activeBooking = roomBookingMap[roomNum];

                      let statusClass = 'available';
                      let statusText = 'Available';
                      if (isStaff) {
                        statusClass = 'staff';
                        statusText = 'Staff';
                      } else if (isOccupied) {
                        statusClass = 'in-house';
                        statusText = activeBooking?.guestName ? 'In-House' : 'Occupied';
                      }

                      return (
                        <div
                          key={roomNum}
                          className={`room-pill ${statusClass}`}
                          onClick={() => handleOpenEditRoom(roomNum)}
                          title={isStaff ? `Staff Quarter (Room ${roomNum})` : (isOccupied ? `Occupied by: ${activeBooking?.guestName || 'Guest'}` : `Room ${roomNum} - Available for Check-in`)}
                        >
                          <BedDouble size={14} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="room-pill-num">{roomNum}</span>
                            <span className="room-pill-status">{statusText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Recent Guest Stays Table */}
        <div className="pro-card" style={{ padding: '20px' }}>
          <div>
            <div className="pro-card-header">
              <div>
                <h3 className="pro-card-title">Recent Guest Stays</h3>
              </div>
              <button 
                className="pro-card-action-btn"
                onClick={() => setActiveTab('bookings')}
                style={{ border: 'none', background: 'none', color: '#2563eb', padding: 0 }}
              >
                <span>View All</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {recentStays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '13px' }}>
                <BedDouble size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <div>No guest stays registered yet.</div>
              </div>
            ) : (
              <table className="recent-stays-table">
                <thead>
                  <tr>
                    <th>GUEST</th>
                    <th>ROOM</th>
                    <th>CHECK-IN</th>
                    <th style={{ textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStays.map(b => (
                    <tr key={b.id || b.manualId}>
                      <td>
                        <div className="guest-col-content">
                          <div className="guest-avatar-circle">
                            {getInitials(b.guestName)}
                          </div>
                          <div className="guest-name-box">
                            <span className="guest-table-name">{b.guestName}</span>
                            <span className="guest-table-code">{b.manualId || `BK-${b.id?.substring(0, 6)}`}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {b.room || '—'}
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {formatDate(b.checkIn)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: b.status === 'In-House' ? '#ecfdf5' : (b.status === 'Completed' ? '#f1f5f9' : '#eff6ff'),
                          color: b.status === 'In-House' ? '#047857' : (b.status === 'Completed' ? '#475569' : '#2563eb'),
                          border: `1px solid ${b.status === 'In-House' ? '#a7f3d0' : (b.status === 'Completed' ? '#e2e8f0' : '#bfdbfe')}`
                        }}>
                          {b.status || 'Upcoming'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 5. BOTTOM SHIFT REGISTER STATUS BANNER */}
      <div className="shift-register-banner-bottom">
        <div className="shift-banner-left">
          <div className="shift-banner-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="shift-banner-title">
              Shift Register Status: <span style={{ color: isRegisterOpen ? '#047857' : '#dc2626' }}>{isRegisterOpen ? 'REGISTER OPEN' : 'REGISTER CLOSED'}</span>
            </div>
            <div className="shift-banner-sub">
              {isRegisterOpen 
                ? 'All guest bookings, cash collections, and identity document mappings are active.'
                : 'Shift register is currently closed. Portal is operating in View-Only mode.'}
            </div>
          </div>
        </div>

        <button 
          className="pro-card-action-btn"
          onClick={() => setActiveTab('bookings')}
          style={{ padding: '7px 14px', fontSize: '12px' }}
        >
          <span>View Register Logs</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* 6. MODAL: EDIT ROOM NUMBER & STAFF STATUS (Super Admin & Admin only) */}
      {editingRoom && (
        <div className="modal-overlay" onClick={() => setEditingRoom(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#0284c7" />
                <h2 className="modal-heading">Edit Room {editingRoom}</h2>
              </div>
              <button className="icon-btn" onClick={() => setEditingRoom(null)}><X size={16} /></button>
            </div>

            {editError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#be123c', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveRoomEdit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Room Number / Identification</label>
                <input
                  type="text"
                  className="form-input"
                  value={newRoomNumber}
                  onChange={e => setNewRoomNumber(e.target.value)}
                  placeholder="e.g. 101, 204-A"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Room Type / Category</label>
                <select
                  className="form-select"
                  value={roomType}
                  onChange={e => setRoomType(e.target.value)}
                >
                  <option value="Standard">Standard Suite</option>
                  <option value="Deluxe">Deluxe Room</option>
                  <option value="Suite">Executive Suite</option>
                  <option value="Villa">Villa / Cottage</option>
                  <option value="Dorm">Dormitory</option>
                </select>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Designate as Staff Quarter
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Staff rooms are deducted from sellable property inventory.
                  </div>
                </div>

                <input
                  type="checkbox"
                  id="is-staff-room-toggle"
                  checked={isStaffRoom}
                  onChange={e => setIsStaffRoom(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-sub" onClick={() => setEditingRoom(null)}>Cancel</button>
                <button type="submit" className="btn-main" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Room Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
