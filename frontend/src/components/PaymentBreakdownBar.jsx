import React from 'react';
import { CreditCard } from 'lucide-react';
import { BREAKDOWN_COLORS } from '../utils/paymentBreakdown';

// Current-month payment-type percentages (one row, wraps only on very narrow screens)
export const PaymentBreakdownBar = ({ items }) => (
  <div className="payment-breakdown-bar">
    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
      <CreditCard size={14} color="#4f46e5" />
      <span>Current Month Payment Breakdown:</span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px', alignItems: 'center' }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: BREAKDOWN_COLORS[item.key] || '#64748b' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.label}</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: BREAKDOWN_COLORS[item.key] || '#4f46e5' }}>
              {item.pct}% <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>({item.count})</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
