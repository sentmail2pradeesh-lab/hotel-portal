import React from 'react';
import { HotelProvider, useHotel } from './context/HotelContext';
import { Navbar } from './components/Navbar';
import { Overview } from './components/Overview';
import { Bookings } from './components/Bookings';
import { Expenses } from './components/Expenses';
import { Bills } from './components/Bills';
import { GuestIDCards } from './components/GuestIDCards';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';

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
  const { isAuthenticated } = useHotel();

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="view-body">
        <MainView />
      </main>
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
