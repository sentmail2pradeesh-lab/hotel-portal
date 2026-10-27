// Monthly payment-type breakdown shared by the create-booking page and the Bookings page.

export const BREAKDOWN_COLORS = {
  'UPI (owner upi)': '#2563eb',
  'Cash': '#10b981',
  'Pre paid': '#f59e0b',
  'Partially paid': '#8b5cf6',
  'Unpaid': '#ef4444',
  'Other UPI': '#64748b'
};

const KNOWN_OPTIONS = Object.keys(BREAKDOWN_COLORS);

// Payment type of a booking. Uses the saved option; older bookings are inferred from amounts and channel.
export const classifyPayment = (b) => {
  if (KNOWN_OPTIONS.includes(b.paymentOption)) return b.paymentOption;
  const total = parseFloat(b.totalAmount) || 0;
  const paid = parseFloat(b.amountPaid) || 0;
  if (paid > 0 && total > 0 && paid < total) return 'Partially paid';
  if (b.paidVia === 'Pending') return 'Unpaid';
  if (b.paidVia === 'Cash') return 'Cash';
  if (b.paidVia === 'UPI (Owner UPI)') return 'UPI (owner upi)';
  if (b.paidVia === 'Other UPI') return 'Other UPI';
  return 'Pre paid';
};

// Share of this month's stays (by check-in date, drafts excluded) per payment type
export const computeMonthBreakdown = (bookings) => {
  const now = new Date();
  const monthBookings = (bookings || []).filter((b) => {
    if (!b.checkIn || b.status === 'Draft') return false;
    const d = new Date(b.checkIn);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalCount = monthBookings.length || 1;
  const counts = Object.fromEntries(KNOWN_OPTIONS.map((k) => [k, 0]));
  monthBookings.forEach((b) => { counts[classifyPayment(b)]++; });

  return KNOWN_OPTIONS.map((key) => ({
    key,
    label: key === 'UPI (owner upi)' ? 'Owner UPI' : key,
    count: counts[key],
    pct: Math.round((counts[key] / totalCount) * 100)
  }));
};
