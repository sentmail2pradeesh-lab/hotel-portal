import React from 'react';
import { Building2 } from 'lucide-react';
import { useHotel } from '../context/HotelContext';

// Shared property switcher used on each module page.
// Switching here changes the active property for the whole app.
export const PropertySwitcher = ({ compact = false, allOption = false, isAllSelected = false, onSelectAll, onSelectProperty }) => {
  const { propertiesList = [], activePropertyId, switchProperty } = useHotel();

  if (propertiesList.length === 0) return null;

  const active = propertiesList.find((p) => p.firmId === activePropertyId);

  if (compact) {
    const pillStyle = {
      display: 'flex',
      alignItems: 'stretch',
      minWidth: '300px',
      height: '44px',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden'
    };
    const iconStyle = {
      width: '44px',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRight: '1px solid #e2e8f0'
    };

    if (propertiesList.length === 1) {
      return (
        <div style={pillStyle}>
          <div style={iconStyle}><Building2 size={18} color="#f59e0b" /></div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
            {active ? `${active.propertyCode ? `[${active.propertyCode}] ` : ''}${active.firmName}` : ''}
          </div>
        </div>
      );
    }

    return (
      <div style={pillStyle}>
        <div style={iconStyle}><Building2 size={18} color="#f59e0b" /></div>
        <select
          value={allOption && isAllSelected ? '__all__' : (activePropertyId || '')}
          onChange={(e) => {
            if (e.target.value === '__all__') {
              if (onSelectAll) onSelectAll();
              return;
            }
            if (onSelectProperty) onSelectProperty();
            switchProperty(e.target.value);
          }}
          title="Switch property"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '0 14px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-main)',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer'
          }}
        >
          {allOption && <option value="__all__">All Properties</option>}
          {propertiesList.map((p) => (
            <option key={p.firmId} value={p.firmId}>
              {p.propertyCode ? `[${p.propertyCode}] ` : ''}{p.firmName}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <Building2 size={15} color="#d97706" />
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Property
      </span>
      <select
        className="form-input"
        value={activePropertyId || ''}
        onChange={(e) => switchProperty(e.target.value)}
        title="Switch property"
        style={{ height: 'auto', minWidth: '260px', padding: '8px 12px', lineHeight: 1.4, fontSize: '13px', fontWeight: 600 }}
      >
        {propertiesList.map((p) => (
          <option key={p.firmId} value={p.firmId}>
            {p.propertyCode ? `[${p.propertyCode}] ` : ''}{p.firmName}
          </option>
        ))}
      </select>
    </div>
  );
};
