import { generateSampleIDCardSVG } from './formatters';

export const initialBookings = [
  {
    id: 'OYO-10234',
    guestName: 'Arjun Verma',
    phone: '9876543210',
    room: '204',
    checkIn: '2026-08-26',
    checkOut: '2026-08-29',
    amountPaid: 4500.00,
    paidVia: 'UPI',
    notes: 'Requested quiet room, high floor.',
    idCard: generateSampleIDCardSVG('Arjun Verma', '5492 8812 9041', 'Aadhaar Card'),
    idCardName: 'arjun_verma_aadhaar.png',
    createdAt: '2026-08-26T10:30:00Z'
  },
  {
    id: 'BK-8842',
    guestName: 'Priya Sharma',
    phone: '9123456789',
    room: '108',
    checkIn: '2026-08-27',
    checkOut: '2026-08-28',
    amountPaid: 3200.00,
    paidVia: 'Cash',
    notes: 'Late check-in at 9 PM.',
    idCard: generateSampleIDCardSVG('Priya Sharma', 'DL-9820119284', 'Driving License'),
    idCardName: 'priya_sharma_dl.png',
    createdAt: '2026-08-27T09:15:00Z'
  },
  {
    id: 'BK-9915',
    guestName: 'Vikramaditya Roy',
    phone: '9988776655',
    room: '302',
    checkIn: '2026-08-27',
    checkOut: '2026-08-30',
    amountPaid: 8900.00,
    paidVia: 'Credit Card',
    notes: 'Deluxe Suite booking. Breakfast included.',
    idCard: generateSampleIDCardSVG('Vikramaditya Roy', 'PASS-Z9018472', 'Passport'),
    idCardName: 'vikramaditya_passport.png',
    createdAt: '2026-08-27T11:00:00Z'
  }
];

export const initialExpenses = [
  {
    id: 'EXP-101',
    date: '2026-08-27',
    category: 'Supplies',
    description: 'Fresh room linens & bath towel stock replenishment',
    amount: 1450.00
  },
  {
    id: 'EXP-102',
    date: '2026-08-27',
    category: 'Utilities',
    description: 'Petty cash payment for mineral water bottles & coffee sachets',
    amount: 620.00
  },
  {
    id: 'EXP-103',
    date: '2026-08-26',
    category: 'Repairs',
    description: 'AC Servicing & filter cleaning for Room 204',
    amount: 1200.00
  }
];

export const initialBills = [
  {
    id: 'BILL-401',
    bookingId: 'OYO-10234',
    guestName: 'Arjun Verma',
    roomNo: '204',
    roomCharge: 4500.00,
    addOns: [
      { id: 'item-1', name: 'Extra Mattress', amount: 500.00 },
      { id: 'item-2', name: 'Special Breakfast Buffet', amount: 350.00 }
    ],
    total: 5350.00,
    date: '2026-08-27'
  }
];
