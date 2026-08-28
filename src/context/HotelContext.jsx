import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ALL_PROPERTY_ROOMS } from '../utils/formatters';
import { api } from '../services/api';

const HotelContext = createContext();

export const HotelProvider = ({ children }) => {
  const [activeTab, setActiveTabState] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [isServerConnected, setIsServerConnected] = useState(true);

  // Property Operational Data States
  const [roomsList, setRoomsList] = useState(ALL_PROPERTY_ROOMS);
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(true);

  // Sync active tab with browser history (popstate listener for back button)
  const setActiveTab = (tabName, replaceHistory = false) => {
    setActiveTabState(tabName);
    const hash = '#' + tabName;
    if (replaceHistory) {
      window.history.replaceState({ tab: tabName }, '', hash);
    } else {
      window.history.pushState({ tab: tabName }, '', hash);
    }
  };

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.tab) {
        setActiveTabState(event.state.tab);
      } else {
        const hash = window.location.hash.replace('#', '');
        setActiveTabState(hash || 'overview');
      }
    };

    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
      setActiveTabState(initialHash);
      window.history.replaceState({ tab: initialHash }, '', '#' + initialHash);
    } else {
      window.history.replaceState({ tab: 'overview' }, '', '#overview');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch all property data from Python API
  const refreshPropertyData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [fetchedRooms, fetchedBookings, fetchedExpenses, fetchedBills, fetchedRegStatus] = await Promise.all([
        api.getRooms().catch(() => ALL_PROPERTY_ROOMS),
        api.getBookings().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getBills().catch(() => []),
        api.getRegisterStatus().catch(() => ({ isOpen: true }))
      ]);

      setRoomsList(fetchedRooms && fetchedRooms.length > 0 ? fetchedRooms : ALL_PROPERTY_ROOMS);
      setBookings(fetchedBookings || []);
      setExpenses(fetchedExpenses || []);
      setBills(fetchedBills || []);
      setIsRegisterOpen(fetchedRegStatus?.isOpen ?? true);
      setIsServerConnected(true);
    } catch (err) {
      console.warn('Backend server disconnected or fetching error:', err);
      setIsServerConnected(false);
    }
  }, [currentUser]);

  // Initial user session check on app start
  useEffect(() => {
    const checkMe = async () => {
      try {
        const me = await api.getMe();
        if (me) {
          setCurrentUser(me);
        }
      } catch (e) {
        console.warn('Authentication check failed:', e);
      }
    };
    checkMe();
  }, []);

  // Whenever currentUser logs in or changes, fetch property data and set up live polling (simultaneous multi-device sync)
  useEffect(() => {
    if (currentUser) {
      refreshPropertyData();
      // Poll Python backend every 5 seconds for live multi-user/multi-device synchronization
      const intervalId = setInterval(() => {
        refreshPropertyData();
      }, 5000);
      return () => clearInterval(intervalId);
    } else {
      setRoomsList(ALL_PROPERTY_ROOMS);
      setBookings([]);
      setExpenses([]);
      setBills([]);
      setIsRegisterOpen(true);
    }
  }, [currentUser, refreshPropertyData]);

  // Session Inactivity Timeout Tracker for active property
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    if (!currentUser) return;

    const handleUserActivity = () => {
      setLastActivity(Date.now());
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity));

    const timeoutMins = currentUser.sessionTimeoutMinutes || 15;
    const timeoutMs = timeoutMins * 60 * 1000;

    const intervalId = setInterval(() => {
      if (Date.now() - lastActivity >= timeoutMs) {
        const propName = currentUser.firmName || 'Property';
        logout();
        setAuthNotice(`Session timed out after ${timeoutMins} minutes of inactivity for ${propName}. Please sign in again.`);
      }
    }, 5000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(intervalId);
    };
  }, [currentUser, lastActivity]);

  const isAuthenticated = Boolean(currentUser);

  // Authentication Action: Register New Property
  const register = async (firmName, name, email, password) => {
    try {
      const res = await api.register(firmName, name, email, password);
      if (res.user) {
        setCurrentUser(res.user);
        setActiveTab('overview', true);
        setAuthNotice('');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Registration failed.' };
    }
    return { success: false, message: 'Registration failed.' };
  };

  // Authentication Action: Sign In to Existing Property Account
  const login = async (identity, password) => {
    try {
      const res = await api.login(identity, password);
      if (res.user) {
        setCurrentUser(res.user);
        setActiveTab('overview', true);
        setAuthNotice('');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Invalid login credentials.' };
    }
    return { success: false, message: 'Invalid credentials.' };
  };

  const checkRegisterOpen = () => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to perform operations.');
      return false;
    }
    return true;
  };

  const updateUserProfile = async (newFirmName, newName, newEmail) => {
    if (!currentUser) return;
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateProfile({
        firmName: newFirmName,
        name: newName,
        email: newEmail
      });
      setCurrentUser(updated);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const updateFirmLogo = async (logoDataUri) => {
    if (!currentUser) return;
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateProfile({ firmLogo: logoDataUri });
      setCurrentUser(updated);
    } catch (err) {
      console.error('Failed to update logo:', err);
    }
  };

  const updateESignature = async (eSignatureDataUri) => {
    if (!currentUser) return;
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateProfile({ eSignature: eSignatureDataUri });
      setCurrentUser(updated);
    } catch (err) {
      console.error('Failed to update eSignature:', err);
    }
  };

  const updateSessionTimeout = async (minutes) => {
    if (!currentUser) return;
    const parsedMins = parseInt(minutes, 10) || 15;
    try {
      const updated = await api.updateProfile({ sessionTimeoutMinutes: parsedMins });
      setCurrentUser(updated);
    } catch (err) {
      console.error('Failed to update session timeout:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('frontdesk_jwt_token');
    setCurrentUser(null);
    setActiveTab('overview', true);
    setAuthNotice('');
  };

  // Rooms Management Actions
  const addCustomRoom = async (roomNum) => {
    if (!checkRegisterOpen()) return { success: false, message: 'Shift Register is Closed.' };
    const cleanNum = roomNum.trim();
    if (!cleanNum) return { success: false, message: 'Room identifier is required.' };
    if (roomsList.includes(cleanNum)) {
      return { success: false, message: `Room ${cleanNum} already exists in property inventory.` };
    }
    try {
      await api.addRoom(cleanNum);
      await refreshPropertyData();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const removeCustomRoom = async (roomNum) => {
    if (!checkRegisterOpen()) return;
    try {
      await api.deleteRoom(roomNum);
      await refreshPropertyData();
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  // Bookings Data Actions
  const addBooking = async (newBooking) => {
    if (!checkRegisterOpen()) return;
    try {
      const created = await api.createBooking(newBooking);
      setBookings((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add booking:', err);
    }
  };

  const updateBooking = async (id, updatedFields) => {
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateBooking(id, updatedFields);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      console.error('Failed to update booking:', err);
    }
  };

  const deleteBooking = async (id) => {
    if (!checkRegisterOpen()) return;
    try {
      await api.deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete booking:', err);
    }
  };

  // Expenses Data Actions
  const addExpense = async (newExpense) => {
    if (!checkRegisterOpen()) return;
    try {
      const created = await api.createExpense(newExpense);
      setExpenses((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add expense:', err);
    }
  };

  const deleteExpense = async (id) => {
    if (!checkRegisterOpen()) return;
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // Bills Data Actions
  const addBill = async (newBill) => {
    if (!checkRegisterOpen()) return;
    try {
      const created = await api.createBill(newBill);
      setBills((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add bill:', err);
    }
  };

  const updateBill = async (updatedBill) => {
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateBill(updatedBill);
      setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err) {
      console.error('Failed to update bill:', err);
    }
  };

  const deleteBill = async (id) => {
    if (!checkRegisterOpen()) return;
    try {
      await api.deleteBill(id);
      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bill:', err);
    }
  };

  const toggleRegisterStatus = async () => {
    try {
      const res = await api.toggleRegisterStatus();
      setIsRegisterOpen(res.isOpen);
    } catch (err) {
      console.error('Failed to toggle register:', err);
    }
  };

  const clearAllData = async () => {
    if (!checkRegisterOpen()) return;
    for (const b of bookings) {
      await api.deleteBooking(b.id).catch(() => {});
    }
    for (const e of expenses) {
      await api.deleteExpense(e.id).catch(() => {});
    }
    for (const bill of bills) {
      await api.deleteBill(bill.id).catch(() => {});
    }
    setBookings([]);
    setExpenses([]);
    setBills([]);
  };

  // Aggregated Stats for current property
  const totalCollected = bookings.reduce((sum, b) => sum + (parseFloat(b.amountPaid) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netRevenue = totalCollected - totalExpenses;
  const totalBookingsCount = bookings.length;

  // Filtered Guest ID cards list derived directly from current property Bookings
  const guestIDCards = bookings.map((b) => ({
    bookingId: b.id,
    guestName: b.guestName,
    phone: b.phone,
    room: b.room,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    idCard: b.idCard || null,
    idCardName: b.idCardName || 'ID Photo',
    hasID: Boolean(b.idCard),
    createdAt: b.createdAt
  }));

  return (
    <HotelContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        isAuthenticated,
        authNotice,
        setAuthNotice,
        isServerConnected,
        login,
        register,
        updateUserProfile,
        updateFirmLogo,
        updateESignature,
        updateSessionTimeout,
        logout,
        roomsList,
        addCustomRoom,
        removeCustomRoom,
        bookings,
        expenses,
        bills,
        isRegisterOpen,
        addBooking,
        updateBooking,
        deleteBooking,
        addExpense,
        deleteExpense,
        addBill,
        updateBill,
        deleteBill,
        toggleRegisterStatus,
        clearAllData,
        totalCollected,
        totalExpenses,
        netRevenue,
        totalBookingsCount,
        guestIDCards,
        refreshPropertyData
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};
