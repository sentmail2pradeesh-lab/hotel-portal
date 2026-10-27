// Currency and date formatting utilities
import { storeDocument } from '../services/api';

export const ALL_PROPERTY_ROOMS = [
  '101', '102', '103', '104', '105',
  '201', '202', '203', '204', '205',
  '301', '302', '303', '304', '305',
  '401', '402', '403', '404', '405'
];

export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const generateId = (prefix = 'ASZ') => {
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
};

export const generateSystemBookingId = (existingBookings = []) => {
  let maxNum = 0;
  existingBookings.forEach((b) => {
    if (b.id && b.id.startsWith('ASZ-')) {
      const parsed = parseInt(b.id.replace('ASZ-', ''), 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `ASZ-${String(nextNum).padStart(3, '0')}`;
};

/**
 * CSV file export helper.
 */
// storeAs ({ docType, refId }) also saves the generated report to Dropbox
export const exportToCSV = (filename, headers, rows, storeAs = null) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (storeAs) {
    storeDocument(blob, filename, storeAs).catch((err) => {
      alert(`The report was downloaded, but saving it to Dropbox failed: ${err.message}`);
    });
  }
};

// Local calendar date as YYYY-MM-DD. Avoids toISOString(), which is UTC and shifts the date for India (UTC+5:30).
export const localDateStr = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// statusSetAt: when the booking became Upcoming (confirmation time). Only bookings confirmed before today
// can be archived as no-shows, so a booking confirmed today stays Upcoming even after the check-in deadline.
export const getAutoStayStatus = (checkInStr, checkOutStr, currentStatus, bufferMinutes = 120, statusSetAt = null) => {
  if (currentStatus === 'Archived') return 'Archived';
  if (currentStatus === 'Completed') return 'Completed';
  if (currentStatus === 'Draft') return 'Draft';

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);
  const confirmedBeforeToday = !statusSetAt || localDateStr(new Date(statusSetAt)) < todayStr;

  const inDate = checkInStr ? checkInStr.split('T')[0] : '';
  const outDate = checkOutStr ? checkOutStr.split('T')[0] : '';

  // Expired stay: If checkout date is before today, stay is automatically marked as Completed!
  if (outDate && outDate < todayStr) {
    return 'Completed';
  }

  if (currentStatus === 'In-House') return 'In-House';

  // Check-in buffer check: if stay was scheduled for past date and guest never checked in
  if (inDate && inDate < todayStr && currentStatus !== 'In-House' && confirmedBeforeToday) {
    return 'Archived';
  }

  // Check-in buffer check for today: 12:00 PM standard check-in + bufferMinutes
  if (inDate && inDate === todayStr && currentStatus !== 'In-House') {
    const checkinDeadline = new Date(today);
    checkinDeadline.setHours(12, 0, 0, 0); // 12:00 PM standard check-in time
    checkinDeadline.setMinutes(checkinDeadline.getMinutes() + (parseInt(bufferMinutes, 10) || 120));
    if (now > checkinDeadline && currentStatus === 'Upcoming' && confirmedBeforeToday) {
      return 'Archived';
    }
    return 'Upcoming';
  }

  if (inDate && inDate > todayStr) {
    return 'Upcoming';
  }
  return currentStatus || 'Upcoming';
};

export const calculateNights = (checkInStr, checkOutStr) => {
  if (!checkInStr || !checkOutStr) return 1;
  try {
    const d1 = new Date(checkInStr);
    const d2 = new Date(checkOutStr);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 1;
  } catch {
    return 1;
  }
};

export const confirmDouble = (firstMessage, secondMessage) => {
  const step1 = window.confirm(firstMessage);
  if (!step1) return false;
  return window.confirm(
    secondMessage || 'SECOND CONFIRMATION: Are you double sure you want to permanently delete this item? This action cannot be undone.'
  );
};


