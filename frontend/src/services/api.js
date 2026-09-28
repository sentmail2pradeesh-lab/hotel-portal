const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running locally in development on localhost, use local backend
    if ((host === 'localhost' || host === '127.0.0.1') && import.meta.env.DEV) {
      return 'http://localhost:8000/api';
    }
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  return 'https://hotel-portal-tfn9.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

// Safe JSON parser preventing "Unexpected token '<', '<!doctype '..." crashes on HTML error responses
export async function parseJsonResponse(res, fallbackMessage = 'Request failed.') {
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
  } else {
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`API endpoint not found (404). Please ensure the backend is running at ${API_BASE_URL}`);
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(`Backend server temporarily unavailable (${res.status}). Server is waking up, please hold on.`);
      } else if (res.status >= 500) {
        throw new Error(`Backend server error (${res.status}). Please check backend terminal logs.`);
      } else {
        throw new Error(text.slice(0, 150) || fallbackMessage);
      }
    }
    // If the server returned HTTP 200 but it was HTML (e.g. Hostinger serving index.html for unknown /api route)
    throw new Error('Received unexpected HTML response from server instead of JSON API. Please check your backend connection.');
  }

  if (!res.ok) {
    const errorMsg = data?.detail || data?.message || fallbackMessage;
    throw new Error(errorMsg);
  }
  return data;
}

// Pre-warm backend immediately and periodically to eliminate Render free tier cold starts
const pingCloudBackend = () => {
  try {
    const rootUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
    fetch(`${rootUrl}/health`, { method: 'GET', keepalive: true, mode: 'cors' }).catch(() => {});
  } catch (_) {}
};

pingCloudBackend();
if (typeof window !== 'undefined') {
  // Keep alive every 8 minutes while user is on page
  setInterval(pingCloudBackend, 8 * 60 * 1000);
}

export async function fetchWithRetry(url, options = {}, retries = 2, delayMs = 1500, timeoutMs = 25000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const fetchOptions = {
      ...options,
      signal: options.signal || controller.signal
    };

    try {
      const res = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Cloud server waking up (cold start returns 502/503/504 Bad Gateway / Service Unavailable)
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        console.warn(`[API] Server waking up (${res.status}). Retrying attempt ${attempt + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
      const isNetworkErr = isTimeout ||
                           err?.name === 'TypeError' || 
                           err?.message?.includes('Failed to fetch') || 
                           err?.message?.includes('NetworkError') ||
                           err?.message?.includes('Load failed');
      
      if (isNetworkErr && attempt < retries) {
        console.warn(`[API] Network retry (${err?.message || 'timeout'}). Retrying attempt ${attempt + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('frontdesk_jwt_token');
  const activeFirmId = localStorage.getItem('frontdesk_active_firm_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeFirmId ? { 'X-Property-ID': activeFirmId } : {})
  };
};

export async function apiFetch(endpoint, options = {}, retries = 2, fallbackMsg = 'Request failed.') {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const defaultHeaders = getAuthHeaders();
  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };
  const res = await fetchWithRetry(url, mergedOptions, retries);
  return await parseJsonResponse(res, fallbackMsg);
}

export const api = {
  async getSystemStatus() {
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/auth/system-status`, {}, 2, 1000, 15000);
      if (!res.ok) {
        return { isAdminRegistered: true, isError: true };
      }
      return await parseJsonResponse(res, 'Failed to fetch system status');
    } catch (e) {
      console.warn('System status fetch failed, preserving existing auth state:', e);
      // Resilience guarantee: If server is waking up or network is slow, NEVER assume admin is false!
      // This prevents destroying the stored user session!
      return { isAdminRegistered: true, isError: true, networkError: true };
    }
  },

  async adminRegister(name, phone, email, password) {
    let payload = {};
    if (typeof name === 'object' && name !== null) {
      payload = name;
    } else if (arguments.length === 3) {
      payload = { name: arguments[0], email: arguments[1], password: arguments[2] };
    } else {
      payload = { name, phone, email, password };
    }

    const res = await fetchWithRetry(`${API_BASE_URL}/auth/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await parseJsonResponse(res, 'Super Admin registration failed.');
    if (data?.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    if (data?.manager) {
      try {
        localStorage.setItem('frontdesk_cached_manager', JSON.stringify(data.manager));
      } catch (_) {}
    }
    return data;
  },

  async managerRegister(name, email, password) {
    const res = await fetchWithRetry(`${API_BASE_URL}/auth/manager/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await parseJsonResponse(res, 'Manager registration failed.');
    if (data?.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    if (data?.manager) {
      try {
        localStorage.setItem('frontdesk_cached_manager', JSON.stringify(data.manager));
      } catch (_) {}
    }
    return data;
  },

  async managerLogin(identity, password) {
    const res = await fetchWithRetry(`${API_BASE_URL}/auth/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, password })
    }, 2, 1500, 30000);
    const data = await parseJsonResponse(res, 'Manager sign in failed.');
    if (data?.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    if (data?.manager) {
      try {
        localStorage.setItem('frontdesk_cached_manager', JSON.stringify(data.manager));
        if (data.manager.properties) {
          localStorage.setItem('frontdesk_cached_properties', JSON.stringify(data.manager.properties));
        }
      } catch (_) {}
    }
    return data;
  },

  async getManagerMe() {
    const token = localStorage.getItem('frontdesk_jwt_token');
    if (!token) return null;
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/auth/manager/me`, {
        headers: getAuthHeaders()
      }, 2, 1500, 20000);

      if (!res.ok) {
        // ONLY clear credentials on explicit 401 Unauthorized or 403 Forbidden
        if (res.status === 401 || res.status === 403) {
          console.warn('[Auth] Token expired or invalid. Clearing saved token.');
          localStorage.removeItem('frontdesk_jwt_token');
          localStorage.removeItem('frontdesk_cached_manager');
          return null;
        }
        // If 500, 502, 503, server is waking up; DO NOT clear token!
        return null;
      }
      const data = await parseJsonResponse(res, 'Failed to fetch manager session');
      if (data) {
        try {
          localStorage.setItem('frontdesk_cached_manager', JSON.stringify(data));
          if (data.properties) {
            localStorage.setItem('frontdesk_cached_properties', JSON.stringify(data.properties));
          }
        } catch (_) {}
      }
      return data;
    } catch (err) {
      console.warn('Manager session check warning (server cold start):', err);
      return null;
    }
  },

  async getProperties() {
    return await apiFetch('/properties', {}, 2, 'Failed to fetch properties.');
  },

  async createProperty(propertyData) {
    const payload = typeof propertyData === 'object' && propertyData !== null
      ? propertyData
      : { firmName: arguments[0], firmLogo: arguments[1] || null, eSignature: arguments[2] || null };

    return await apiFetch('/properties', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, 2, 'Failed to create property.');
  },

  async deleteProperty(firmId) {
    return await apiFetch(`/properties/${firmId}`, {
      method: 'DELETE'
    }, 2, 'Failed to delete property.');
  },

  async register(firmName, name, email, password) {
    const res = await fetchWithRetry(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firmName, name, email, password })
    });
    const data = await parseJsonResponse(res, 'Registration failed.');
    if (data?.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async login(identity, password) {
    return await this.managerLogin(identity, password);
  },

  async getMe() {
    return await this.getManagerMe();
  },

  async updateProfile(profileData) {
    return await apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }, 2, 'Profile update failed.');
  },

  async syncPropertyData() {
    return await apiFetch('/sync', {}, 2, 'Failed to sync property data.');
  },

  async getRooms() {
    return await apiFetch('/rooms', {}, 2, 'Failed to fetch rooms.');
  },

  async getAvailableRooms(checkIn, checkOut, excludeBookingId) {
    const params = new URLSearchParams();
    if (checkIn) params.append('checkIn', checkIn);
    if (checkOut) params.append('checkOut', checkOut);
    if (excludeBookingId) params.append('excludeBookingId', excludeBookingId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiFetch(`/rooms/available${qs}`, {}, 2, 'Failed to fetch available rooms.');
  },

  async addRoom(roomNumber, roomType = "Standard", isStaffRoom = false) {
    return await apiFetch('/rooms', {
      method: 'POST',
      body: JSON.stringify({ roomNumber, roomType, isStaffRoom })
    }, 2, 'Failed to add room.');
  },

  async addRoomsBulk(rooms) {
    return await apiFetch('/rooms/bulk', {
      method: 'POST',
      body: JSON.stringify({ rooms })
    }, 2, 'Failed to bulk add rooms.');
  },

  async updateRoom(roomNumber, updateData) {
    return await apiFetch(`/rooms/${encodeURIComponent(roomNumber)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }, 2, 'Failed to update room.');
  },

  async deleteRoom(roomNumber) {
    return await apiFetch(`/rooms/${encodeURIComponent(roomNumber)}`, {
      method: 'DELETE'
    }, 2, 'Failed to delete room.');
  },

  async getBookings() {
    return await apiFetch('/bookings', {}, 2, 'Failed to fetch bookings.');
  },

  async createBooking(bookingData) {
    return await apiFetch('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    }, 2, 'Failed to create booking.');
  },

  async bulkImportBookings(bookingsList) {
    return await apiFetch('/bookings/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ bookings: bookingsList })
    }, 2, 'Failed to import external bookings.');
  },

  async updateBooking(bookingId, updatedFields) {
    return await apiFetch(`/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'PUT',
      body: JSON.stringify(updatedFields)
    }, 2, 'Failed to update booking.');
  },

  async confirmBooking(bookingId) {
    return await apiFetch(`/bookings/${encodeURIComponent(bookingId)}/confirm`, {
      method: 'POST'
    }, 2, 'Failed to confirm booking.');
  },

  async checkInBooking(bookingId) {
    return await apiFetch(`/bookings/${encodeURIComponent(bookingId)}/checkin`, {
      method: 'POST'
    }, 2, 'Failed to check in booking.');
  },

  async allotRoom(bookingId, room, status = null, isGuaranteed = true) {
    return await apiFetch(`/bookings/${encodeURIComponent(bookingId)}/allot-room`, {
      method: 'POST',
      body: JSON.stringify({ room, status, isGuaranteed })
    }, 2, 'Failed to allot room.');
  },

  async checkOutBooking(bookingId) {
    return await apiFetch(`/bookings/${encodeURIComponent(bookingId)}/checkout`, {
      method: 'POST'
    }, 2, 'Failed to check out booking.');
  },

  async earlyCheckOutBooking(bookingId, createHiddenSlot = true) {
    return await apiFetch(`/bookings/${encodeURIComponent(bookingId)}/early-checkout`, {
      method: 'POST',
      body: JSON.stringify({ createHiddenSlot })
    }, 2, 'Failed to process early check out.');
  },

  async deleteBooking(bookingId) {
    return await apiFetch(`/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'DELETE'
    }, 2, 'Failed to delete booking.');
  },

  async getExpenses() {
    return await apiFetch('/expenses', {}, 2, 'Failed to fetch expenses.');
  },

  async createExpense(expenseData) {
    return await apiFetch('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    }, 2, 'Failed to create expense.');
  },

  async deleteExpense(expenseId) {
    return await apiFetch(`/expenses/${encodeURIComponent(expenseId)}`, {
      method: 'DELETE'
    }, 2, 'Failed to delete expense.');
  },

  async getBills() {
    return await apiFetch('/bills', {}, 2, 'Failed to fetch bills.');
  },

  async createBill(billData) {
    return await apiFetch('/bills', {
      method: 'POST',
      body: JSON.stringify(billData)
    }, 2, 'Failed to create bill.');
  },

  async updateBill(billData) {
    return await apiFetch(`/bills/${encodeURIComponent(billData.id)}`, {
      method: 'PUT',
      body: JSON.stringify(billData)
    }, 2, 'Failed to update bill.');
  },

  async deleteBill(billId) {
    return await apiFetch(`/bills/${encodeURIComponent(billId)}`, {
      method: 'DELETE'
    }, 2, 'Failed to delete bill.');
  },

  async getRegisterStatus() {
    return await apiFetch('/register-status', {}, 2, 'Failed to fetch register status.');
  },

  async toggleRegisterStatus() {
    return await apiFetch('/register-status/toggle', {
      method: 'POST'
    }, 2, 'Failed to toggle register status.');
  },

  async sendManagerInvitation(propertyId, email) {
    return await apiFetch('/invitations/send', {
      method: 'POST',
      body: JSON.stringify({ propertyId, email })
    }, 2, 'Failed to send manager invitation.');
  },

  async getInvitationDetails(token) {
    const res = await fetchWithRetry(`${API_BASE_URL}/invitations/${encodeURIComponent(token)}`);
    return await parseJsonResponse(res, 'Invalid or expired invitation token.');
  },

  async acceptManagerInvitation(token, name, password) {
    const res = await fetchWithRetry(`${API_BASE_URL}/invitations/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password })
    });
    const data = await parseJsonResponse(res, 'Failed to accept invitation.');
    if (data?.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async getInvitations() {
    return await apiFetch('/invitations', {}, 2, 'Failed to fetch invitations list.');
  },

  async createManager(name, email, propertyId, tempPassword, role = "Manager") {
    return await apiFetch('/managers/create', {
      method: 'POST',
      body: JSON.stringify({ name, email, propertyId, tempPassword, role })
    }, 2, 'Failed to create user account.');
  },

  async getManagers() {
    return await apiFetch('/managers', {}, 2, 'Failed to fetch user list.');
  },

  async changePassword(currentPassword, newPassword) {
    return await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }, 2, 'Failed to change password.');
  },

  async getFeatureToggles() {
    return await apiFetch('/system/feature-toggles', {}, 2, 'Failed to fetch feature toggles.');
  },

  async updateFeatureToggles(role, features) {
    return await apiFetch('/system/feature-toggles', {
      method: 'POST',
      body: JSON.stringify({ role, features })
    }, 2, 'Failed to update feature toggles.');
  },

  async impersonateUser(userId) {
    return await apiFetch(`/auth/impersonate/${encodeURIComponent(userId)}`, {
      method: 'POST'
    }, 2, 'Failed to impersonate user.');
  }
};

export default api;
