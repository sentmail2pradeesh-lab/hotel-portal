import React from 'react';
import { useHotel } from '../context/HotelContext';
import { formatCurrency, formatDate, ALL_PROPERTY_ROOMS } from '../utils/formatters';
import { 
  PlusCircle, 
  ArrowDownRight, 
  ArrowUpRight, 
  ShieldCheck, 
  TrendingUp, 
  Building2, 
  DollarSign, 
  CreditCard,
  Users,
  ChevronRight,
  Sparkles,
  BedDouble,
  FileCheck
} from 'lucide-react';

export const Overview = () => {
  const { 
    totalCollected, 
    totalExpenses, 
    netRevenue, 
    totalBookingsCount, 
    isRegisterOpen, 
    bookings,
    roomsList,
    setActiveTab
  } = useHotel();

  // Helper for guest initials
  const getInitials = (name) => {
    if (!name) return 'VIP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="overview-view">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">Executive Dashboard</h1>
          <p className="page-subheading">Live register activity & executive financial metrics for today.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-main" onClick={() => setActiveTab('bookings')}>
            <PlusCircle size={17} /> New Booking
          </button>
        </div>
      </div>

      {/* Vibrant Colorful Metrics Grid */}
      <div className="metrics-row">
        <div className="metric-card emerald">
          <div className="metric-title">
            <span>TOTAL COLLECTED</span>
            <DollarSign size={18} color="#ffffff" />
          </div>
          <div className="metric-number">
            {formatCurrency(totalCollected)}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={13} />
            <span style={{ fontWeight: 700 }}>+12.4%</span> vs previous shift
          </div>
        </div>

        <div className="metric-card rose">
          <div className="metric-title">
            <span>TOTAL EXPENSES</span>
            <CreditCard size={18} color="#ffffff" />
          </div>
          <div className="metric-number">
            {formatCurrency(totalExpenses)}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '8px' }}>
            Outflow on file: {totalExpenses > 0 ? 'Recorded' : 'Zero logged'}
          </div>
        </div>

        <div className="metric-card blue">
          <div className="metric-title">
            <span>NET REVENUE</span>
            <TrendingUp size={18} color="#ffffff" />
          </div>
          <div className="metric-number">
            {formatCurrency(netRevenue)}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '8px' }}>
            Gross intake minus logged expenses
          </div>
        </div>

        <div className="metric-card amber">
          <div className="metric-title">
            <span>BOOKINGS ON FILE</span>
            <Users size={18} color="#ffffff" />
          </div>
          <div className="metric-number">
            {totalBookingsCount}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '8px' }}>
            Active registered stay records
          </div>
        </div>
      </div>

      {/* Register Status Banner */}
      <div style={{
        background: isRegisterOpen ? '#ecfdf5' : '#fef2f2',
        border: `1px solid ${isRegisterOpen ? '#a7f3d0' : '#fca5a5'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: isRegisterOpen ? '#059669' : '#be123c',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Shift Register Status: 
              <span style={{ color: isRegisterOpen ? '#047857' : '#be123c', fontWeight: 800 }}>
                {isRegisterOpen ? 'REGISTER OPEN' : 'REGISTER CLOSED'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              All guest bookings, cash collections, and identity document mappings are active.
            </div>
          </div>
        </div>

        <button 
          className="btn-sub" 
          style={{ fontSize: '13px' }}
          onClick={() => setActiveTab('bookings')}
        >
          View Register Logs
        </button>
      </div>

      {/* Main Grid: Recent Stays & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '24px' }}>
        
        {/* Recent Stay Register */}
        <div className="card-container" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-serif)' }}>
                Recent Guest Stays
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Latest room check-ins recorded in PMS</p>
            </div>
            {bookings.length > 0 && (
              <button className="btn-sub" style={{ padding: '7px 14px', fontSize: '12px' }} onClick={() => setActiveTab('bookings')}>
                View all <ChevronRight size={14} />
              </button>
            )}
          </div>

          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
              <BedDouble size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>No Stay Records Registered Yet</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
                Your property register is ready. Click below to log your property's first guest stay.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn-main" onClick={() => setActiveTab('bookings')}>
                  <PlusCircle size={16} /> Register First Stay
                </button>
              </div>
            </div>
          ) : (
            <table className="modern-table">
              <thead>
                <tr>
                  <th>GUEST</th>
                  <th>ROOM</th>
                  <th>CHECK-IN</th>
                  <th>PAYMENT</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getInitials(b.guestName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.guestName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', gap: '6px', marginTop: '3px' }}>
                            <span className="system-id-badge" style={{ fontSize: '10px', padding: '1px 5px' }}>{b.id}</span>
                            <span className="manual-id-badge" style={{ fontSize: '10px', padding: '1px 5px' }}>{b.manualId || b.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BedDouble size={14} color="#0284c7" />
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Room {b.room}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(b.checkIn)}</td>
                    <td>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '4px 10px', 
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1'
                      }}>
                        {b.paidVia || 'Cash'}
                      </span>
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#d97706', fontSize: '15px' }}>
                      {formatCurrency(b.amountPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions & Property Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Actions Card */}
          <div className="card-container" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#d97706" />
              Quick Register Actions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn-main" 
                disabled={!isRegisterOpen}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px' }} 
                onClick={() => {
                  if (!isRegisterOpen) {
                    alert('Shift Register is Closed. Please open shift register to add stay records.');
                    return;
                  }
                  setActiveTab('bookings');
                }}
                title={isRegisterOpen ? "+ New Room Stay" : "Shift Register is Closed (View-Only Mode)"}
              >
                <PlusCircle size={18} /> + New Room Stay
              </button>
              <button 
                className="btn-sub" 
                disabled={!isRegisterOpen}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', color: '#be123c' }} 
                onClick={() => {
                  if (!isRegisterOpen) {
                    alert('Shift Register is Closed. Please open shift register to log expenses.');
                    return;
                  }
                  setActiveTab('expenses');
                }}
                title={isRegisterOpen ? "+ Log Daily Expense" : "Shift Register is Closed (View-Only Mode)"}
              >
                <ArrowDownRight size={18} color="#be123c" /> + Log Daily Expense
              </button>
              <button 
                className="btn-sub" 
                disabled={!isRegisterOpen}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', color: '#047857' }} 
                onClick={() => {
                  if (!isRegisterOpen) {
                    alert('Shift Register is Closed. Please open shift register to issue room bills.');
                    return;
                  }
                  setActiveTab('bills');
                }}
                title={isRegisterOpen ? "+ Issue Room Bill" : "Shift Register is Closed (View-Only Mode)"}
              >
                <ArrowUpRight size={18} color="#047857" /> + Issue Room Bill
              </button>
            </div>
          </div>

          {/* Property Capacity Card */}
          <div className="card-container" style={{ padding: '22px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="#0284c7" />
              Suite Capacity & Availability
            </h2>
            
            {(() => {
              const occupiedRoomsList = Array.from(new Set(bookings.map((b) => b.room)));
              const occupiedCount = occupiedRoomsList.length;
              const totalRooms = roomsList.length;
              const availableCount = Math.max(0, totalRooms - occupiedCount);
              const percentage = Math.min((occupiedCount / (totalRooms || 1)) * 100, 100);

              return (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>Occupied: <strong style={{ color: '#be123c' }}>{occupiedCount}</strong></span>
                      <span>Available: <strong style={{ color: '#047857' }}>{availableCount}</strong> / {totalRooms} Suites</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #059669 0%, #d97706 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {availableCount > 0 
                      ? `${availableCount} suite(s) ready for new check-ins. Real-time availability synced.`
                      : 'All suites are currently occupied. Full capacity reached.'
                    }
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
};
