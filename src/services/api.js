const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('frontdesk_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
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
    const token = localStorage.getItem('frontdesk_jwt_token');
    if (!token) return null;
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      localStorage.removeItem('frontdesk_jwt_token');
      return null;
    }
    return await res.json();
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

  async getRooms() {
    const res = await fetch(`${API_BASE_URL}/rooms`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch rooms.');
    return await res.json();
  },

  async addRoom(roomNumber) {
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomNumber })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to add room.');
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
  }
};
