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
import { ConnectingScreen } from './components/ConnectingScreen';
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
    setIsAuthLoading,
    retryAuth,
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
      <ConnectingScreen
        onRetry={retryAuth}
        onSkipToAuth={() => setIsAuthLoading(false)}
      />
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
