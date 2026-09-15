import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ALL_PROPERTY_ROOMS } from '../utils/formatters';
import { api } from '../services/api';

const HotelContext = createContext();

export const HotelProvider = ({ children }) => {
  const [activeTab, setActiveTabState] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.replace('#', '') || 'overview';
    }
    return 'overview';
  });
  const [manager, setManager] = useState(null);
  const [propertiesList, setPropertiesList] = useState([]);
  const [activePropertyId, setActivePropertyIdState] = useState(
    localStorage.getItem('frontdesk_active_firm_id') || ''
  );
  const [authNotice, setAuthNotice] = useState('');
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isAdminRegistered, setIsAdminRegistered] = useState(true);

  // Property Operational Data States
  const [roomsList, setRoomsList] = useState(ALL_PROPERTY_ROOMS);
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(true);

  // Derived current active property
  const activeProperty = useMemo(() => {
    return propertiesList.find((p) => p.firmId === activePropertyId) || propertiesList[0] || null;
  }, [propertiesList, activePropertyId]);

  // Derived currentUser context object for views (memoized to prevent infinite re-renders)
  const currentUser = useMemo(() => {
    if (!manager) return null;
    const isSuper = manager.role === 'Overall Admin' || manager.role === 'Super Admin';
    const computedInitials = manager.name
      ? manager.name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : (isSuper ? 'SA' : 'PM');

    return {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      role: manager.role || (isSuper ? 'Super Admin' : 'Property Manager'),
      firmId: activeProperty?.firmId || '',
      firmName: activeProperty?.firmName || (propertiesList.length === 0 ? 'Initial Setup Required' : 'Select Property'),
      firmLogo: activeProperty?.firmLogo || null,
      firmAddress: activeProperty?.address || '',
      firmPhone: activeProperty?.phone || '',
      firmEmail: activeProperty?.email || '',
      assignedManagerName: activeProperty?.name || '',
      eSignature: activeProperty?.eSignature || null,
      sessionTimeoutMinutes: activeProperty?.sessionTimeoutMinutes || 15,
      initials: computedInitials
    };
  }, [manager, activeProperty, propertiesList.length]);

  // Property Switcher Handler
  const switchProperty = (firmId) => {
    setActivePropertyIdState(firmId);
    localStorage.setItem('frontdesk_active_firm_id', firmId);
  };

  // Sync active tab with browser history (popstate listener)
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
    if (!initialHash) {
      window.history.replaceState({ tab: 'overview' }, '', '#overview');
    } else {
      window.history.replaceState({ tab: initialHash }, '', '#' + initialHash);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch all operational property data from API for current active property
  const refreshPropertyData = useCallback(async () => {
    if (!activePropertyId) return;
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
  }, [activePropertyId]);

  // Initial user session check on app start
  useEffect(() => {
    const checkMe = async () => {
      try {
        const sysStatus = await api.getSystemStatus().catch(() => ({ isAdminRegistered: true }));
        setIsAdminRegistered(sysStatus?.isAdminRegistered ?? true);

        const mgrMe = await api.getManagerMe();
        if (mgrMe) {
          setManager({
            id: mgrMe.id,
            name: mgrMe.name,
            email: mgrMe.email,
            role: mgrMe.role
          });
          setPropertiesList(mgrMe.properties || []);
          if (mgrMe.activeProperty) {
            const savedPropId = localStorage.getItem('frontdesk_active_firm_id');
            const targetPropId = savedPropId && mgrMe.properties.some(p => p.firmId === savedPropId)
              ? savedPropId
              : mgrMe.activeProperty.firmId;
            setActivePropertyIdState(targetPropId);
            localStorage.setItem('frontdesk_active_firm_id', targetPropId);
          }
        }
      } catch (e) {
        console.warn('Authentication check failed:', e);
      }
    };
    checkMe();
  }, []);

  // Whenever manager or activePropertyId changes, fetch property data and poll
  useEffect(() => {
    if (manager && activePropertyId) {
      refreshPropertyData();
      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshPropertyData();
        }
      }, 10000);
      return () => clearInterval(intervalId);
    } else {
      setRoomsList(ALL_PROPERTY_ROOMS);
      setBookings([]);
      setExpenses([]);
      setBills([]);
      setIsRegisterOpen(true);
    }
  }, [manager, activePropertyId, refreshPropertyData]);

  const logout = useCallback(() => {
    localStorage.removeItem('frontdesk_jwt_token');
    localStorage.removeItem('frontdesk_active_firm_id');
    setManager(null);
    setPropertiesList([]);
    setActivePropertyIdState('');
    setActiveTabState('overview');
    if (typeof window !== 'undefined') {
      window.history.replaceState({ tab: 'overview' }, '', '#overview');
    }
    setAuthNotice('');
  }, []);

  // Inactivity timeout
  const [lastActivity, setLastActivity] = useState(() => Date.now());

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
  }, [currentUser, lastActivity, logout]);

  const isAuthenticated = Boolean(manager);

  // Auth Action: Register Overall Admin (One-Time Setup)
  const adminRegister = async (name, email, password) => {
    try {
      const res = await api.adminRegister(name, email, password);
      if (res.manager) {
        setManager(res.manager);
        setPropertiesList([]);
        setActivePropertyIdState('');
        localStorage.removeItem('frontdesk_active_firm_id');
        setIsAdminRegistered(true);
        setActiveTab('overview', true);
        setAuthNotice('');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Admin registration failed.' };
    }
    return { success: false, message: 'Admin registration failed.' };
  };

  // Auth Action: Register Manager (Super Admin)
  const managerRegister = async (name, email, password) => {
    try {
      const res = await api.managerRegister(name, email, password);
      if (res.manager) {
        setManager(res.manager);
        setPropertiesList([]);
        setActivePropertyIdState('');
        localStorage.removeItem('frontdesk_active_firm_id');
        setActiveTab('overview', true);
        setAuthNotice('');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Registration failed.' };
    }
    return { success: false, message: 'Registration failed.' };
  };

  // Auth Action: Login Manager
  const managerLogin = async (identity, password) => {
    try {
      const res = await api.managerLogin(identity, password);
      if (res.manager) {
        setManager({
          id: res.manager.id,
          name: res.manager.name,
          email: res.manager.email,
          role: res.manager.role
        });
        const props = res.manager.properties || [];
        setPropertiesList(props);
        if (props.length > 0) {
          const firstPropId = props[0].firmId;
          setActivePropertyIdState(firstPropId);
          localStorage.setItem('frontdesk_active_firm_id', firstPropId);
        }
        setActiveTab('overview', true);
        setAuthNotice('');
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Invalid manager credentials.' };
    }
    return { success: false, message: 'Invalid credentials.' };
  };

  // Add New Property under Manager
  const addProperty = async ({ firmName, firmLogo, eSignature, address, phone, email }) => {
    try {
      const newProp = await api.createProperty({ firmName, firmLogo, eSignature, address, phone, email });
      if (newProp && newProp.firmId) {
        setPropertiesList((prev) => [...prev, newProp]);
        switchProperty(newProp.firmId);
        return { success: true, property: newProp };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Failed to create property.' };
    }
    return { success: false, message: 'Failed to create property.' };
  };

  // Direct Manager Creation by Super Admin
  const createManager = async (name, email, propertyId, tempPassword) => {
    try {
      const res = await api.createManager(name, email, propertyId, tempPassword);
      const mgrMe = await api.getManagerMe();
      if (mgrMe?.properties) {
        setPropertiesList(mgrMe.properties);
      }
      return { success: true, message: res.message, manager: res.manager };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to create manager.' };
    }
  };

  // Password Change for Super Admin or Manager
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      return { success: true, message: res.message || 'Password changed successfully.' };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to change password.' };
    }
  };

  const checkRegisterOpen = () => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to perform operations.');
      return false;
    }
    return true;
  };

  const updateUserProfile = async (newFirmName, newName, newEmail, newAddress, newPhone) => {
    if (!currentUser) return;
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateProfile({
        firmName: newFirmName,
        name: newName,
        email: newEmail,
        address: newAddress,
        phone: newPhone
      });
      setPropertiesList((prev) =>
        prev.map((p) => (p.firmId === updated.firmId ? { ...p, ...updated } : p))
      );
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const updateFirmLogo = async (logoDataUri) => {
    if (!currentUser) return;
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateProfile({ firmLogo: logoDataUri });
      setPropertiesList((prev) =>
        prev.map((p) => (p.firmId === updated.firmId ? { ...p, firmLogo: updated.firmLogo } : p))
      );
    } catch (err) {
      console.error('Failed to update logo:', err);
    }
  };

  const updateESignature = async (eSignatureDataUri) => {
    if (!currentUser) return;
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateProfile({ eSignature: eSignatureDataUri });
      setPropertiesList((prev) =>
        prev.map((p) => (p.firmId === updated.firmId ? { ...p, eSignature: updated.eSignature } : p))
      );
    } catch (err) {
      console.error('Failed to update eSignature:', err);
    }
  };

  const updateSessionTimeout = async (minutes) => {
    if (!currentUser) return;
    const parsedMins = parseInt(minutes, 10) || 15;
    try {
      const updated = await api.updateProfile({ sessionTimeoutMinutes: parsedMins });
      setPropertiesList((prev) =>
        prev.map((p) => (p.firmId === updated.firmId ? { ...p, sessionTimeoutMinutes: updated.sessionTimeoutMinutes } : p))
      );
    } catch (err) {
      console.error('Failed to update session timeout:', err);
    }
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

  const confirmBooking = async (bookingId) => {
    if (!checkRegisterOpen()) return;
    try {
      const confirmed = await api.confirmBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? confirmed : b)));
    } catch (err) {
      console.error('Failed to confirm booking:', err);
      alert(err.message || 'Failed to confirm booking.');
    }
  };

  const checkInBooking = async (bookingId) => {
    if (!checkRegisterOpen()) return;
    try {
      const checkedIn = await api.checkInBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? checkedIn : b)));
    } catch (err) {
      console.error('Failed to check in booking:', err);
      alert(err.message || 'Failed to check in booking.');
    }
  };

  const checkOutBooking = async (bookingId) => {
    if (!checkRegisterOpen()) return;
    try {
      const checkedOut = await api.checkOutBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? checkedOut : b)));
    } catch (err) {
      console.error('Failed to check out booking:', err);
      alert(err.message || 'Failed to check out booking.');
    }
  };

  const earlyCheckOutBooking = async (bookingId, createHiddenSlot = true) => {
    if (!checkRegisterOpen()) return;
    try {
      const res = await api.earlyCheckOutBooking(bookingId, createHiddenSlot);
      if (res && res.updatedBooking) {
        setBookings((prev) => {
          let updatedList = prev.map((b) => (b.id === bookingId ? res.updatedBooking : b));
          if (res.hiddenBooking) {
            updatedList = [res.hiddenBooking, ...updatedList];
          }
          return updatedList;
        });
      }
    } catch (err) {
      console.error('Failed to process early check out:', err);
      alert(err.message || 'Failed to process early check out.');
    }
  };

  const updateBooking = async (id, updatedFields) => {
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateBooking(id, updatedFields);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      console.error('Failed to update booking:', err);
      alert(err.message || 'Failed to update booking.');
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

  const updateExpense = async (id, updatedFields) => {
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.updateExpense(id, updatedFields);
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      console.error('Failed to update expense:', err);
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

  // Aggregated Stats (Exclude Hidden Bookings from standard financial totals)
  const standardBookings = bookings.filter((b) => !b.isHidden);
  const hiddenBookingsList = bookings.filter((b) => b.isHidden);

  const totalCollected = standardBookings.reduce((sum, b) => sum + (parseFloat(b.amountPaid) || 0), 0);
  const hiddenRevenue = hiddenBookingsList.reduce((sum, b) => sum + (parseFloat(b.amountPaid) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netRevenue = totalCollected - totalExpenses;
  const totalBookingsCount = standardBookings.length;

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
        manager,
        propertiesList,
        activePropertyId,
        switchProperty,
        addProperty,
        currentUser,
        isAuthenticated,
        authNotice,
        setAuthNotice,
        isServerConnected,
        isAdminRegistered,
        adminRegister,
        createManager,
        changePassword,
        login: managerLogin,
        register: managerRegister,
        managerLogin,
        managerRegister,
        logout,
        updateUserProfile,
        updateFirmLogo,
        updateESignature,
        updateSessionTimeout,
        isRegisterOpen,
        toggleRegisterStatus,
        roomsList,
        addCustomRoom,
        removeCustomRoom,
        bookings,
        standardBookings,
        hiddenBookingsList,
        expenses,
        bills,
        addBooking,
        confirmBooking,
        checkInBooking,
        checkOutBooking,
        earlyCheckOutBooking,
        updateBooking,
        deleteBooking,
        addExpense,
        updateExpense,
        deleteExpense,
        addBill,
        updateBill,
        deleteBill,
        clearAllData,
        totalCollected,
        hiddenRevenue,
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
