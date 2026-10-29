import React from 'react';
import { Plus } from 'lucide-react';
import { useHotel } from '../context/HotelContext';

// Header-right row shared by module pages: page action(s), then New Booking, on one line at the same height.
// Property tabs sit below the header (see PropertyTabs).
export const PageHeaderActions = ({ children, disableNewBooking = false }) => {
  const { isRegisterOpen, navigateToCreateBooking } = useHotel();

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {children}
      <button
        className="btn-main"
        disabled={!isRegisterOpen || disableNewBooking}
        onClick={() => navigateToCreateBooking()}
        title={isRegisterOpen ? 'Open Dedicated Booking Console' : 'Shift Register is Closed (View-Only Mode)'}
        style={{ height: '44px' }}
      >
        <Plus size={17} /> New Booking
      </button>
    </div>
  );
};
