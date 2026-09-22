import React from 'react';
import { HotelProvider, useHotel } from './context/HotelContext';
import { Navbar } from './components/Navbar';
import { TopHeader } from './components/TopHeader';
import { Overview } from './components/Overview';
import { Bookings } from './components/Bookings';
import { Expenses } from './components/Expenses';
import { Bills } from './components/Bills';
import { GuestIDCards } from './components/GuestIDCards';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { BookingModal } from './components/BookingModal';
import { Lock } from 'lucide-react';

const MainView = () => {
  const { activeTab } = useHotel();

  switch (activeTab) {
    case 'overview':
      return <Overview />;
    case 'bookings':
      return <Bookings />;
    case 'expenses':
      return <Expenses />;
    case 'bills':
      return <Bills />;
    case 'guest-ids':
      return <GuestIDCards />;
    case 'settings':
      return <SettingsView />;
    default:
      return <Overview />;
  }
};

const AppContent = () => {
  const { 
    isAuthenticated, 
    isAuthLoading, 
    isRegisterOpen,
    isImpersonating,
    currentUser,
    exitImpersonation,
    isBookingModalOpen,
    closeBookingModal,
    bookingModalInitialData
  } = useHotel();

  if (isAuthLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)'
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid rgba(245, 158, 11, 0.2)',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p
          style={{
            marginTop: 20,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#cbd5e1'
          }}
        >
          Connecting to FrontDesk PMS...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <div className="app-main-wrapper">
        <TopHeader />
        {isImpersonating && (
          <div className="impersonation-top-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} color="#fb923c" />
              <span>Super Admin View Mode: Currently viewing dashboard as <strong>{currentUser?.name} ({currentUser?.role})</strong></span>
            </div>
            <button 
              onClick={exitImpersonation}
              className="exit-impersonation-btn"
            >
              Exit to Super Admin
            </button>
          </div>
        )}
        {!isRegisterOpen && (
          <div className="register-closed-banner">
            <Lock size={18} />
            <span>
              <strong>Shift Register Closed</strong> — The portal is currently in <strong>View-Only Mode</strong>. Operations & actions (adding/editing/deleting bookings, expenses, statements, and room inventory) are disabled until the register shift is re-opened.
            </span>
          </div>
        )}
        <main className="view-body">
          <MainView />
        </main>
      </div>

      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={closeBookingModal}
          initialData={bookingModalInitialData}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <HotelProvider>
      <AppContent />
    </HotelProvider>
  );
}

export default App;
