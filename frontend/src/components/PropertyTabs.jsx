import React from 'react';
import { Building2, Layers } from 'lucide-react';
import { useHotel } from '../context/HotelContext';

// Property tab row shared by module pages (same look as the Overview tabs).
// Picking a tab switches the active property app-wide; onSelectAll / onSelect let the page update its own state too.
export const PropertyTabs = ({ allOption = false, isAllSelected = false, onSelectAll, onSelect }) => {
  const { propertiesList = [], activePropertyId, switchProperty } = useHotel();

  if (propertiesList.length === 0) return null;

  const tabStyle = (active, activeColor) => ({
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 700,
    background: active ? activeColor : '#ffffff',
    color: active ? '#ffffff' : 'var(--text-main)',
    borderColor: active ? activeColor : '#cbd5e1',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    boxShadow: active ? `0 2px 8px ${activeColor}33` : 'none'
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      overflowX: 'auto',
      paddingBottom: '4px',
      marginBottom: '20px'
    }}>
      {allOption && (
        <button
          type="button"
          className={`btn-sub ${isAllSelected ? 'active' : ''}`}
          onClick={() => { if (onSelectAll) onSelectAll(); }}
          style={tabStyle(isAllSelected, '#0f172a')}
        >
          <Layers size={15} /> All Properties
        </button>
      )}

      {propertiesList.map((p) => {
        const active = !isAllSelected && activePropertyId === p.firmId;
        return (
          <button
            key={p.firmId}
            type="button"
            className={`btn-sub ${active ? 'active' : ''}`}
            onClick={() => {
              if (onSelect) onSelect(p.firmId);
              if (activePropertyId !== p.firmId && switchProperty) switchProperty(p.firmId);
            }}
            style={tabStyle(active, '#4f46e5')}
          >
            <Building2 size={14} />
            <span>{p.propertyCode ? `[${p.propertyCode}] ` : ''}{p.firmName}</span>
          </button>
        );
      })}
    </div>
  );
};
