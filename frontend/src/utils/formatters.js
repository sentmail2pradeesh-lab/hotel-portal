// Currency and date formatting utilities

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
export const exportToCSV = (filename, headers, rows) => {
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
};

export const getAutoStayStatus = (checkInStr, checkOutStr, currentStatus) => {
  if (currentStatus === 'Completed') return 'Completed';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const inDate = checkInStr ? checkInStr.split('T')[0] : '';
  const outDate = checkOutStr ? checkOutStr.split('T')[0] : '';

  // Expired stay: If checkout date is before today, stay is automatically marked as Completed!
  if (outDate && outDate < todayStr) {
    return 'Completed';
  }

  if (currentStatus === 'In-House') return 'In-House';

  if (inDate && inDate <= todayStr && (!outDate || outDate >= todayStr)) {
    return 'In-House';
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


