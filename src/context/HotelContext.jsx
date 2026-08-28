import React, { createContext, useContext, useState, useEffect } from 'react';
import { ALL_PROPERTY_ROOMS } from '../utils/formatters';

const HotelContext = createContext();

// Storage Key Helper for Property Data Isolation
const getFirmIdKey = (userObj) => {
  if (!userObj) return 'firm_default';
  return userObj.firmId || ('firm_' + userObj.firmName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
};

export const HotelProvider = ({ children }) => {
  const [activeTab, setActiveTabState] = useState('overview');

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
        if (hash) {
          setActiveTabState(hash);
        } else {
          setActiveTabState('overview');
        }
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

  // Multi-Property User Database state stored in 'frontdesk_all_properties'
  const [allProperties, setAllProperties] = useState(() => {
    const saved = localStorage.getItem('frontdesk_all_properties');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Migration: If legacy single user exists, convert into first property record
    const legacyUser = localStorage.getItem('frontdesk_user');
    if (legacyUser) {
      try {
        const parsed = JSON.parse(legacyUser);
        const firmId = 'firm_' + Date.now();
        const initialRecord = { ...parsed, firmId: parsed.firmId || firmId };
        localStorage.setItem('frontdesk_all_properties', JSON.stringify([initialRecord]));
        return [initialRecord];
      } catch (e) {}
    }
    return [];
  });

  // Active Logged-in Property Account State (In-Memory Session: Reloading invalidates session)
  const [currentUser, setCurrentUser] = useState(null);
  const [authNotice, setAuthNotice] = useState('');

  // Clear any legacy persistent login key on app start to ensure reload requires re-login
  useEffect(() => {
    localStorage.removeItem('frontdesk_active_user');
    localStorage.removeItem('frontdesk_user');
  }, []);

  const isAuthenticated = Boolean(currentUser);

  // Derived property storage key
  const activeFirmId = getFirmIdKey(currentUser);

  // Loader helper for property-isolated state
  const loadFirmData = (firmId, dataType, defaultValue) => {
    const propertyKey = `data_${firmId}_${dataType}`;
    const savedProp = localStorage.getItem(propertyKey);
    if (savedProp !== null) {
      try { return JSON.parse(savedProp); } catch (e) {}
    }
    // Migration fallback for legacy keys
    const legacyKey = `prop_${currentUser?.firmName?.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_${dataType}`;
    const savedLegacyProp = localStorage.getItem(legacyKey);
    if (savedLegacyProp !== null) {
      try {
        const parsed = JSON.parse(savedLegacyProp);
        localStorage.setItem(propertyKey, JSON.stringify(parsed));
        return parsed;
      } catch (e) {}
    }
    const savedGlobal = localStorage.getItem(`frontdesk_${dataType}`);
    if (savedGlobal !== null) {
      try {
        const parsed = JSON.parse(savedGlobal);
        localStorage.setItem(propertyKey, JSON.stringify(parsed));
        return parsed;
      } catch (e) {}
    }
    return defaultValue;
  };

  // Property Rooms Inventory State (isolated per property)
  const [roomsList, setRoomsList] = useState(() => 
    loadFirmData(activeFirmId, 'rooms', ALL_PROPERTY_ROOMS)
  );

  // Property Operational Data States (isolated per property)
  const [bookings, setBookings] = useState(() => 
    loadFirmData(activeFirmId, 'bookings', [])
  );

  const [expenses, setExpenses] = useState(() => 
    loadFirmData(activeFirmId, 'expenses', [])
  );

  const [bills, setBills] = useState(() => 
    loadFirmData(activeFirmId, 'bills', [])
  );

  const [isRegisterOpen, setIsRegisterOpen] = useState(() => 
    loadFirmData(activeFirmId, 'register_open', true)
  );

  // Whenever the active logged-in property changes, dynamically reload that property's isolated data
  useEffect(() => {
    if (currentUser) {
      const key = getFirmIdKey(currentUser);
      setRoomsList(loadFirmData(key, 'rooms', ALL_PROPERTY_ROOMS));
      setBookings(loadFirmData(key, 'bookings', []));
      setExpenses(loadFirmData(key, 'expenses', []));
      setBills(loadFirmData(key, 'bills', []));
      setIsRegisterOpen(loadFirmData(key, 'register_open', true));
    } else {
      setRoomsList(ALL_PROPERTY_ROOMS);
      setBookings([]);
      setExpenses([]);
      setBills([]);
      setIsRegisterOpen(true);
    }
  }, [currentUser?.firmId, currentUser?.firmName]);

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
        setCurrentUser(null);
        setActiveTab('overview', true);
        setAuthNotice(`Session timed out after ${timeoutMins} minutes of inactivity for ${propName}. Please sign in again.`);
      }
    }, 5000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(intervalId);
    };
  }, [currentUser, lastActivity]);

  // Sync per-property data states to local storage
  useEffect(() => {
    if (currentUser) {
      const key = getFirmIdKey(currentUser);
      localStorage.setItem(`data_${key}_rooms`, JSON.stringify(roomsList));
    }
  }, [roomsList, currentUser?.firmId]);

  useEffect(() => {
    if (currentUser) {
      const key = getFirmIdKey(currentUser);
      localStorage.setItem(`data_${key}_bookings`, JSON.stringify(bookings));
    }
  }, [bookings, currentUser?.firmId]);

  useEffect(() => {
    if (currentUser) {
      const key = getFirmIdKey(currentUser);
      localStorage.setItem(`data_${key}_expenses`, JSON.stringify(expenses));
    }
  }, [expenses, currentUser?.firmId]);

  useEffect(() => {
    if (currentUser) {
      const key = getFirmIdKey(currentUser);
      localStorage.setItem(`data_${key}_bills`, JSON.stringify(bills));
    }
  }, [bills, currentUser?.firmId]);

  useEffect(() => {
    if (currentUser) {
      const key = getFirmIdKey(currentUser);
      localStorage.setItem(`data_${key}_register_open`, JSON.stringify(isRegisterOpen));
    }
  }, [isRegisterOpen, currentUser?.firmId]);

  // Authentication Action: Register New Property
  const register = (firmName, name, email, password) => {
    const cleanFirm = firmName.trim();
    const cleanName = name.trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanFirm || !cleanName || !cleanPass) {
      return { success: false, message: 'Please fill out all property registration fields.' };
    }

    // Check if property name or email is already registered in allProperties
    const existing = allProperties.find(
      (p) =>
        p.firmName.toLowerCase() === cleanFirm.toLowerCase() ||
        (cleanEmail && p.email && p.email.toLowerCase() === cleanEmail) ||
        p.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return {
        success: false,
        message: `Property "${cleanFirm}" or Manager "${cleanName}" is already registered. Please sign in instead.`
      };
    }

    const firmId = 'firm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    const parts = cleanName.split(' ');
    const initials = parts.length >= 2 
      ? (parts[0][0] + parts[1][0]).toUpperCase() 
      : cleanName.substring(0, 2).toUpperCase();

    const newPropertyAccount = {
      firmId,
      firmName: cleanFirm,
      name: cleanName,
      email: cleanEmail || `${cleanName.toLowerCase().replace(/\s+/g, '')}@property.com`,
      password: cleanPass,
      firmLogo: null,
      eSignature: null,
      sessionTimeoutMinutes: 15,
      role: 'Property Manager',
      initials,
      loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    const updatedList = [...allProperties, newPropertyAccount];
    setAllProperties(updatedList);
    localStorage.setItem('frontdesk_all_properties', JSON.stringify(updatedList));

    // Log in immediately as the newly registered property & view from homepage
    setCurrentUser(newPropertyAccount);
    setActiveTab('overview', true);
    setAuthNotice('');
    return { success: true };
  };

  // Authentication Action: Sign In to Existing Property Account
  const login = (identity, password) => {
    const cleanId = identity.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Please enter your manager username/email and password.' };
    }

    // Search property accounts database
    const matchedProperty = allProperties.find(
      (p) =>
        (p.firmName.toLowerCase() === cleanId ||
         p.name.toLowerCase() === cleanId ||
         (p.email && p.email.toLowerCase() === cleanId)) &&
        p.password === cleanPass
    );

    if (!matchedProperty) {
      return {
        success: false,
        message: 'Invalid Property Manager credentials or incorrect password. Please check your credentials or click "Register Property".'
      };
    }

    const updatedSession = {
      ...matchedProperty,
      sessionTimeoutMinutes: matchedProperty.sessionTimeoutMinutes || 15,
      loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Set logged in user & always redirect to homepage overview
    setCurrentUser(updatedSession);
    setActiveTab('overview', true);
    setAuthNotice('');
    return { success: true };
  };

  const updateUserProfile = (newFirmName, newName, newEmail) => {
    if (!currentUser) return;
    const cleanFirm = newFirmName.trim() || currentUser.firmName;
    const cleanName = newName.trim() || currentUser.name;
    const cleanEmail = (newEmail || currentUser.email || '').trim();

    const parts = cleanName.split(' ');
    const initials = parts.length >= 2 
      ? (parts[0][0] + parts[1][0]).toUpperCase() 
      : cleanName.substring(0, 2).toUpperCase();

    const updatedUser = {
      ...currentUser,
      firmName: cleanFirm,
      name: cleanName,
      email: cleanEmail,
      initials
    };

    setCurrentUser(updatedUser);

    setAllProperties((prev) => {
      const updatedList = prev.map((p) => (p.firmId === currentUser.firmId ? updatedUser : p));
      localStorage.setItem('frontdesk_all_properties', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const updateFirmLogo = (logoDataUri) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      firmLogo: logoDataUri
    };
    setCurrentUser(updatedUser);

    setAllProperties((prev) => {
      const updatedList = prev.map((p) => (p.firmId === currentUser.firmId ? updatedUser : p));
      localStorage.setItem('frontdesk_all_properties', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const updateESignature = (eSignatureDataUri) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      eSignature: eSignatureDataUri
    };
    setCurrentUser(updatedUser);

    setAllProperties((prev) => {
      const updatedList = prev.map((p) => (p.firmId === currentUser.firmId ? updatedUser : p));
      localStorage.setItem('frontdesk_all_properties', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const updateSessionTimeout = (minutes) => {
    if (!currentUser) return;
    const parsedMins = parseInt(minutes, 10) || 15;
    const updatedUser = {
      ...currentUser,
      sessionTimeoutMinutes: parsedMins
    };
    setCurrentUser(updatedUser);

    setAllProperties((prev) => {
      const updatedList = prev.map((p) => (p.firmId === currentUser.firmId ? updatedUser : p));
      localStorage.setItem('frontdesk_all_properties', JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveTab('overview', true);
    setAuthNotice('');
    localStorage.removeItem('frontdesk_active_user');
    localStorage.removeItem('frontdesk_user');
  };

  // Rooms Management Actions
  const addCustomRoom = (roomNum) => {
    const cleanNum = roomNum.trim();
    if (!cleanNum) return { success: false, message: 'Room identifier is required.' };
    if (roomsList.includes(cleanNum)) {
      return { success: false, message: `Room ${cleanNum} already exists in property inventory.` };
    }
    const updated = [...roomsList, cleanNum].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    setRoomsList(updated);
    return { success: true };
  };

  const removeCustomRoom = (roomNum) => {
    setRoomsList((prev) => prev.filter((r) => r !== roomNum));
  };

  // Data Actions
  const addBooking = (newBooking) => {
    setBookings((prev) => [newBooking, ...prev]);
  };

  const updateBooking = (id, updatedFields) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updatedFields } : b))
    );
  };

  const deleteBooking = (id) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const addExpense = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const addBill = (newBill) => {
    setBills((prev) => [newBill, ...prev]);
  };

  const updateBill = (updatedBill) => {
    setBills((prev) =>
      prev.map((b) => (b.id === updatedBill.id ? { ...b, ...updatedBill } : b))
    );
  };

  const deleteBill = (id) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleRegisterStatus = () => {
    setIsRegisterOpen((prev) => !prev);
  };

  const clearAllData = () => {
    setBookings([]);
    setExpenses([]);
    setBills([]);
    if (currentUser) {
      const key = getFirmIdKey(currentUser);
      localStorage.removeItem(`data_${key}_bookings`);
      localStorage.removeItem(`data_${key}_expenses`);
      localStorage.removeItem(`data_${key}_bills`);
    }
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
        guestIDCards
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
