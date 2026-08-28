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
  } catch (e) {
    return dateStr;
  }
};

export const generateId = (prefix = 'BK') => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
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

/**
 * Double confirmation dialog helper.
 * Asks the user twice before executing sensitive deletion actions.
 */
export const confirmDouble = (firstMessage, secondMessage) => {
  const step1 = window.confirm(firstMessage);
  if (!step1) return false;
  return window.confirm(
    secondMessage || 'SECOND CONFIRMATION: Are you double sure you want to permanently delete this item? This action cannot be undone.'
  );
};


