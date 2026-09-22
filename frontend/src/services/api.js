const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

const getAuthHeaders = () => {
  const token = localStorage.getItem('frontdesk_jwt_token');
  const activeFirmId = localStorage.getItem('frontdesk_active_firm_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeFirmId ? { 'X-Property-ID': activeFirmId } : {})
  };
};

export const api = {
  async getSystemStatus() {
    const res = await fetch(`${API_BASE_URL}/auth/system-status`);
    if (!res.ok) return { isAdminRegistered: true };
    return await res.json();
  },

  async adminRegister(name, phone, email, password) {
    let payload = {};
    if (typeof name === 'object' && name !== null) {
      payload = name;
    } else if (arguments.length === 3) {
      // Backward compatibility: (name, email, password)
      payload = { name: arguments[0], email: arguments[1], password: arguments[2] };
    } else {
      payload = { name, phone, email, password };
    }

    const res = await fetch(`${API_BASE_URL}/auth/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Super Admin registration failed.');
    if (data.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async managerRegister(name, email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/manager/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Manager registration failed.');
    if (data.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async managerLogin(identity, password) {
    const res = await fetch(`${API_BASE_URL}/auth/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Manager sign in failed.');
    if (data.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async getManagerMe() {
    const token = localStorage.getItem('frontdesk_jwt_token');
    if (!token) return null;
    const res = await fetch(`${API_BASE_URL}/auth/manager/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      localStorage.removeItem('frontdesk_jwt_token');
      return null;
    }
    return await res.json();
  },

  async getProperties() {
    const res = await fetch(`${API_BASE_URL}/properties`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch manager properties.');
    return await res.json();
  },

  async createProperty(propertyData) {
    const payload = typeof propertyData === 'object' && propertyData !== null
      ? propertyData
      : { firmName: arguments[0], firmLogo: arguments[1] || null, eSignature: arguments[2] || null };

    const res = await fetch(`${API_BASE_URL}/properties`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create property.');
    return data;
  },

  async deleteProperty(firmId) {
    const res = await fetch(`${API_BASE_URL}/properties/${firmId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to delete property.');
    return data;
  },

  async register(firmName, name, email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firmName, name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed.');
    if (data.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async login(identity, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed.');
    if (data.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async getMe() {
    return await this.getManagerMe();
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Profile update failed.');
    return data;
  },

  async syncPropertyData() {
    const res = await fetch(`${API_BASE_URL}/sync`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to sync property data.');
    return await res.json();
  },

  async getRooms() {
    const res = await fetch(`${API_BASE_URL}/rooms`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch rooms.');
    return await res.json();
  },

  async getAvailableRooms(checkIn, checkOut, excludeBookingId) {
    const params = new URLSearchParams();
    if (checkIn) params.append('checkIn', checkIn);
    if (checkOut) params.append('checkOut', checkOut);
    if (excludeBookingId) params.append('excludeBookingId', excludeBookingId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/rooms/available${qs}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch available rooms.');
    return await res.json();
  },

  async addRoom(roomNumber, roomType = "Standard", isStaffRoom = false) {
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomNumber, roomType, isStaffRoom })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to add room.');
    return data;
  },

  async updateRoom(roomNumber, updateData) {
    const res = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomNumber)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update room.');
    return data;
  },

  async deleteRoom(roomNumber) {
    const res = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomNumber)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete room.');
    return await res.json();
  },

  async getBookings() {
    const res = await fetch(`${API_BASE_URL}/bookings`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch bookings.');
    return await res.json();
  },

  async createBooking(bookingData) {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create booking.');
    return data;
  },

  async bulkImportBookings(bookingsList) {
    const res = await fetch(`${API_BASE_URL}/bookings/bulk-import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bookings: bookingsList })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to import external bookings.');
    return data;
  },

  async updateBooking(bookingId, updatedFields) {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedFields)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update booking.');
    return data;
  },

  async confirmBooking(bookingId) {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to confirm booking.');
    return data;
  },

  async checkInBooking(bookingId) {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/checkin`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to check in booking.');
    return data;
  },

  async allotRoom(bookingId, room, status = null, isGuaranteed = true) {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/allot-room`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ room, status, isGuaranteed })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to allot room.');
    return data;
  },

  async checkOutBooking(bookingId) {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/checkout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to check out booking.');
    return data;
  },

  async earlyCheckOutBooking(bookingId, createHiddenSlot = true) {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/early-checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ createHiddenSlot })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to process early check out.');
    return data;
  },

  async deleteBooking(bookingId) {
    const res = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete booking.');
    return await res.json();
  },

  async getExpenses() {
    const res = await fetch(`${API_BASE_URL}/expenses`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch expenses.');
    return await res.json();
  },

  async createExpense(expenseData) {
    const res = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create expense.');
    return data;
  },

  async deleteExpense(expenseId) {
    const res = await fetch(`${API_BASE_URL}/expenses/${encodeURIComponent(expenseId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete expense.');
    return await res.json();
  },

  async getBills() {
    const res = await fetch(`${API_BASE_URL}/bills`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch bills.');
    return await res.json();
  },

  async createBill(billData) {
    const res = await fetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(billData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create bill.');
    return data;
  },

  async updateBill(billData) {
    const res = await fetch(`${API_BASE_URL}/bills/${encodeURIComponent(billData.id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(billData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update bill.');
    return data;
  },

  async deleteBill(billId) {
    const res = await fetch(`${API_BASE_URL}/bills/${encodeURIComponent(billId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete bill.');
    return await res.json();
  },

  async getRegisterStatus() {
    const res = await fetch(`${API_BASE_URL}/register-status`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch register status.');
    return await res.json();
  },

  async toggleRegisterStatus() {
    const res = await fetch(`${API_BASE_URL}/register-status/toggle`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to toggle register status.');
    return data;
  },

  async sendManagerInvitation(propertyId, email) {
    const res = await fetch(`${API_BASE_URL}/invitations/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ propertyId, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to send manager invitation.');
    return data;
  },

  async getInvitationDetails(token) {
    const res = await fetch(`${API_BASE_URL}/invitations/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Invalid or expired invitation token.');
    return data;
  },

  async acceptManagerInvitation(token, name, password) {
    const res = await fetch(`${API_BASE_URL}/invitations/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to accept invitation.');
    if (data.token) localStorage.setItem('frontdesk_jwt_token', data.token);
    return data;
  },

  async getInvitations() {
    const res = await fetch(`${API_BASE_URL}/invitations`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch invitations list.');
    return await res.json();
  },

  async createManager(name, email, propertyId, tempPassword, role = "Manager") {
    const res = await fetch(`${API_BASE_URL}/managers/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, email, propertyId, tempPassword, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create user account.');
    return data;
  },

  async getManagers() {
    const res = await fetch(`${API_BASE_URL}/managers`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch user list.');
    return await res.json();
  },

  async changePassword(currentPassword, newPassword) {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to change password.');
    return data;
  },

  async getFeatureToggles() {
    const res = await fetch(`${API_BASE_URL}/system/feature-toggles`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch feature toggles.');
    return await res.json();
  },

  async updateFeatureToggles(role, features) {
    const res = await fetch(`${API_BASE_URL}/system/feature-toggles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, features })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update feature toggles.');
    return data;
  },

  async impersonateUser(userId) {
    const res = await fetch(`${API_BASE_URL}/auth/impersonate/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to impersonate user.');
    return data;
  }
};

export default api;
