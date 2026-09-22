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
  const [isAuthLoading, setIsAuthLoading] = useState(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('frontdesk_jwt_token'));
  });

  // Property Operational Data States
  const [roomsList, setRoomsList] = useState(ALL_PROPERTY_ROOMS);
  const [roomsDetails, setRoomsDetails] = useState([]);
  const [featureToggles, setFeatureToggles] = useState({
    Admin: { bookings: true, expenses: true, bills: true, guest_ids: true, reports: true, edit_rooms: true, shift_register: true },
    Manager: { bookings: true, guest_ids: true, expenses: false, bills: false, reports: false, edit_rooms: false, shift_register: false }
  });
  const [isImpersonating, setIsImpersonating] = useState(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('super_admin_original_token'));
  });
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingModalInitialData, setBookingModalInitialData] = useState(null);

  const openNewBookingModal = useCallback((initialData = null) => {
    if (!isRegisterOpen) {
      alert('Shift Register is Closed. Please open the shift register to add a new booking.');
      return;
    }
    setBookingModalInitialData(initialData);
    setIsBookingModalOpen(true);
  }, [isRegisterOpen]);

  const closeBookingModal = useCallback(() => {
    setIsBookingModalOpen(false);
    setBookingModalInitialData(null);
  }, []);

  // Derived current active property
  const activeProperty = useMemo(() => {
    return propertiesList.find((p) => p.firmId === activePropertyId) || propertiesList[0] || null;
  }, [propertiesList, activePropertyId]);

  // Derived currentUser context object for views (memoized to prevent infinite re-renders)
  const currentUser = useMemo(() => {
    if (!manager) return null;
    const isSuper = manager.role === 'Overall Admin' || manager.role === 'Super Admin';
    const isAdmin = manager.role === 'Admin';
    let computedInitials = 'PM';
    if (isSuper) {
      computedInitials = 'SA';
    } else if (isAdmin) {
      computedInitials = 'AD';
    } else if (manager.name) {
      computedInitials = manager.name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    const effectiveRole = isSuper ? 'Super Admin' : (isAdmin ? 'Admin' : 'Manager');

    return {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      role: effectiveRole,
      firmId: activeProperty?.firmId || '',
      propertyCode: activeProperty?.propertyCode || '',
      firmName: activeProperty?.firmName || (propertiesList.length === 0 ? 'Initial Setup Required' : 'Select Property'),
      firmLogo: activeProperty?.firmLogo || null,
      firmAddress: activeProperty?.address || '',
      firmPhone: activeProperty?.phone || '',
      firmEmail: activeProperty?.email || '',
      ownerName: activeProperty?.ownerName || '',
      ownerPhone: activeProperty?.ownerPhone || '',
      tnebNumber: activeProperty?.tnebNumber || '',
      managerId: activeProperty?.managerId || '',
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

  // Fetch all operational property data in a single atomic payload from API
  const refreshPropertyData = useCallback(async () => {
    if (!activePropertyId) return;
    try {
      const data = await api.syncPropertyData();
      if (data) {
        if (Array.isArray(data.rooms) && data.rooms.length > 0) {
          setRoomsList(data.rooms);
        }
        if (Array.isArray(data.roomDetails)) {
          setRoomsDetails(data.roomDetails);
        }
        if (Array.isArray(data.bookings)) {
          setBookings(data.bookings);
        }
        if (Array.isArray(data.expenses)) {
          setExpenses(data.expenses);
        }
        if (Array.isArray(data.bills)) {
          setBills(data.bills);
        }
        if (data.registerStatus && typeof data.registerStatus.isOpen === 'boolean') {
          setIsRegisterOpen(data.registerStatus.isOpen);
        }
        if (data.featureToggles) {
          setFeatureToggles(data.featureToggles);
        }
        setIsServerConnected(true);
      }
    } catch (err) {
      console.warn('Backend server disconnected or sync error:', err);
      setIsServerConnected(false);
      // Resilience guarantee: NEVER wipe out existing React state on network glitches
    }
  }, [activePropertyId]);

  // Initial user session check on app start
  useEffect(() => {
    let isMounted = true;
    const checkMe = async () => {
      try {
        const sysStatus = await api.getSystemStatus().catch(() => ({ isAdminRegistered: true }));
        if (isMounted) {
          setIsAdminRegistered(sysStatus?.isAdminRegistered ?? true);
        }

        if (!sysStatus?.isAdminRegistered) {
          localStorage.removeItem('frontdesk_jwt_token');
          localStorage.removeItem('frontdesk_active_firm_id');
          if (isMounted) {
            setManager(null);
            setPropertiesList([]);
            setActivePropertyIdState('');
          }
          return;
        }

        const mgrMe = await api.getManagerMe();
        if (mgrMe && isMounted) {
          setManager({
            id: mgrMe.id,
            name: mgrMe.name,
            email: mgrMe.email,
            phone: mgrMe.phone || '',
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
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };
    checkMe();
    return () => {
      isMounted = false;
    };
  }, []);

  // Whenever manager or activePropertyId changes, fetch property data and poll
  useEffect(() => {
    if (!manager) {
      setRoomsList(ALL_PROPERTY_ROOMS);
      setBookings([]);
      setExpenses([]);
      setBills([]);
      setIsRegisterOpen(true);
      return;
    }

    if (!activePropertyId) {
      return;
    }

    refreshPropertyData();

    // Re-fetch immediately when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPropertyData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll every 25 seconds while tab is active to preserve resources and eliminate lag
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshPropertyData();
      }
    }, 25000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
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
  const adminRegister = async (name, phone, email, password) => {
    try {
      const res = await api.adminRegister(name, phone, email, password);
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
          const savedPropId = localStorage.getItem('frontdesk_active_firm_id');
          const targetPropId = savedPropId && props.some(p => p.firmId === savedPropId)
            ? savedPropId
            : props[0].firmId;
          setActivePropertyIdState(targetPropId);
          localStorage.setItem('frontdesk_active_firm_id', targetPropId);
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

  // Add New Property under Manager (Super Admin Only)
  const addProperty = async (propData) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Only Super Admin is authorized to add properties. Admin accounts cannot add properties.' };
    }
    try {
      const payload = typeof propData === 'object' && propData !== null
        ? propData
        : { firmName: arguments[0] };
      const newProp = await api.createProperty(payload);
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

  // Delete Property (Super Admin Only)
  const deleteProperty = async (firmId) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Only Super Admin is authorized to delete properties.' };
    }
    try {
      const res = await api.deleteProperty(firmId);
      const remainingProps = propertiesList.filter((p) => p.firmId !== firmId);
      setPropertiesList(remainingProps);

      // If deleted property was the currently active property, switch to another or clear
      if (activePropertyId === firmId) {
        if (remainingProps.length > 0) {
          switchProperty(remainingProps[0].firmId);
        } else {
          setActivePropertyId('');
          localStorage.removeItem('frontdesk_active_firm_id');
        }
      }
      return { success: true, message: res.message || 'Property deleted successfully.' };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to delete property.' };
    }
  };

  // Direct User Creation by Super Admin (Admin/Manager) or Admin (Manager)
  const createManager = async (name, email, propertyId, tempPassword, role = "Manager") => {
    try {
      const res = await api.createManager(name, email, propertyId, tempPassword, role);
      const mgrMe = await api.getManagerMe();
      if (mgrMe?.properties) {
        setPropertiesList(mgrMe.properties);
      }
      return { success: true, message: res.message, manager: res.manager };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to create user.' };
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
  const addCustomRoom = async (roomNum, roomType = "Standard", isStaffRoom = false) => {
    if (!checkRegisterOpen()) return { success: false, message: 'Shift Register is Closed.' };
    const cleanNum = roomNum.trim();
    if (!cleanNum) return { success: false, message: 'Room identifier is required.' };
    if (roomsList.includes(cleanNum)) {
      return { success: false, message: `Room ${cleanNum} already exists in property inventory.` };
    }
    try {
      await api.addRoom(cleanNum, roomType, isStaffRoom);
      await refreshPropertyData();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const editCustomRoom = async (oldRoomNum, newRoomNum, isStaffRoom = false, roomType = "Standard") => {
    if (!checkRegisterOpen()) return { success: false, message: 'Shift Register is Closed.' };
    try {
      await api.updateRoom(oldRoomNum, {
        roomNumber: newRoomNum.trim(),
        isStaffRoom,
        roomType
      });
      await refreshPropertyData();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to update room.' };
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

  // Feature Toggles and RBAC permissions
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Overall Admin';
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager' || currentUser?.role === 'Property Manager';

  const canAccess = useCallback((featureName) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Overall Admin') return true;
    const roleToggles = featureToggles[currentUser.role] || {};
    if (typeof roleToggles[featureName] === 'boolean') {
      return roleToggles[featureName];
    }
    if (currentUser.role === 'Admin') return true;
    return ['bookings', 'guest_ids'].includes(featureName);
  }, [currentUser, featureToggles]);

  const updateRoleFeatureToggles = async (role, toggles) => {
    try {
      await api.updateFeatureToggles(role, toggles);
      setFeatureToggles((prev) => ({ ...prev, [role]: toggles }));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to update feature toggles.' };
    }
  };

  const impersonateUser = async (userId) => {
    try {
      const currentToken = localStorage.getItem('frontdesk_jwt_token');
      localStorage.setItem('super_admin_original_token', currentToken);
      const res = await api.impersonateUser(userId);
      if (res.token) {
        localStorage.setItem('frontdesk_jwt_token', res.token);
        setIsImpersonating(true);
        window.location.reload();
      }
    } catch (err) {
      alert(err.message || 'Failed to switch view.');
    }
  };

  const exitImpersonation = () => {
    const originalToken = localStorage.getItem('super_admin_original_token');
    if (originalToken) {
      localStorage.setItem('frontdesk_jwt_token', originalToken);
      localStorage.removeItem('super_admin_original_token');
      setIsImpersonating(false);
      window.location.reload();
    }
  };

  // Bookings Data Actions
  const addBooking = async (newBooking) => {
    if (!checkRegisterOpen()) return;
    try {
      const created = await api.createBooking(newBooking);
      setBookings((prev) => [created, ...prev]);
      refreshPropertyData();
      return created;
    } catch (err) {
      console.error('Failed to add booking:', err);
      alert(err.message || 'Failed to add booking.');
      throw err;
    }
  };

  const bulkImportBookings = async (bookingsList) => {
    if (!checkRegisterOpen()) return;
    try {
      const res = await api.bulkImportBookings(bookingsList);
      if (res && res.success) {
        if (res.importedBookings && res.importedBookings.length > 0) {
          setBookings((prev) => [...res.importedBookings, ...prev]);
        }
        refreshPropertyData();
      }
      return res;
    } catch (err) {
      console.error('Failed to bulk import bookings:', err);
      alert(err.message || 'Failed to import external bookings.');
      throw err;
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

  const allotRoom = async (bookingId, room, status = null, isGuaranteed = true) => {
    if (!checkRegisterOpen()) return;
    try {
      const updated = await api.allotRoom(bookingId, room, status, isGuaranteed);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      return updated;
    } catch (err) {
      console.error('Failed to allot room:', err);
      alert(err.message || 'Failed to allot room.');
      throw err;
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
      refreshPropertyData();
      return updated;
    } catch (err) {
      console.error('Failed to update booking:', err);
      alert(err.message || 'Failed to update booking.');
      throw err;
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
        deleteProperty,
        currentUser,
        isAuthenticated,
        isAuthLoading,
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
        roomsDetails,
        addCustomRoom,
        editCustomRoom,
        removeCustomRoom,
        featureToggles,
        canAccess,
        updateRoleFeatureToggles,
        isSuperAdmin,
        isAdmin,
        isManager,
        isImpersonating,
        impersonateUser,
        exitImpersonation,
        bookings,
        standardBookings,
        hiddenBookingsList,
        expenses,
        bills,
        addBooking,
        bulkImportBookings,
        confirmBooking,
        checkInBooking,
        allotRoom,
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
        refreshPropertyData,
        isBookingModalOpen,
        setIsBookingModalOpen,
        bookingModalInitialData,
        openNewBookingModal,
        closeBookingModal
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
