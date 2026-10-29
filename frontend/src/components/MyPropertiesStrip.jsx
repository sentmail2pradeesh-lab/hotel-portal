import React, { useRef, useState } from 'react';
import { BedDouble, Users, Search, ChevronLeft, ChevronRight, Plus, Building2 } from 'lucide-react';

// "My Properties" card row for the Overview page: pick a property, search, scroll, or add one.
export const MyPropertiesStrip = ({ properties = [], selectedId, isAllSelected = false, onSelect, onViewAll }) => {
  const [query, setQuery] = useState('');
  const rowRef = useRef(null);

  const q = query.trim().toLowerCase();
  const visible = q
    ? properties.filter((p) => `${p.firmName || ''} ${p.propertyCode || ''}`.toLowerCase().includes(q))
    : properties;

  const scrollRow = (direction) => {
    if (rowRef.current) rowRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' });
  };

  const navButtonStyle = {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-main)'
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border-color)',
      borderRadius: 16,
      padding: '18px 20px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Building2 size={20} color="#f59e0b" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>My Properties</h2>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', background: '#f1f5f9', borderRadius: 12, padding: '3px 10px' }}>
            {properties.length} {properties.length === 1 ? 'Property' : 'Properties'}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ minWidth: 260 }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search property by name or code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => scrollRow(-1)} style={navButtonStyle} title="Scroll left">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => scrollRow(1)} style={navButtonStyle} title="Scroll right">
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onViewAll}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 10,
              border: `1px solid ${isAllSelected ? '#0f172a' : '#cbd5e1'}`,
              background: isAllSelected ? '#0f172a' : '#ffffff',
              color: isAllSelected ? '#ffffff' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            View All
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollBehavior: 'smooth' }}
      >
        {visible.map((p) => {
          const total = p.totalRooms || p.total_rooms || 0;
          const occupied = p.occupiedRooms || p.occupied_rooms || 0;
          const occupancy = total ? Math.round((occupied / total) * 100) : 0;
          const active = !isAllSelected && selectedId === p.firmId;

          return (
            <button
              key={p.firmId}
              type="button"
              onClick={() => onSelect(p.firmId)}
              style={{
                flex: '0 0 250px',
                textAlign: 'left',
                background: active ? '#fff7ed' : '#ffffff',
                border: `${active ? 2 : 1}px solid ${active ? '#f59e0b' : '#e2e8f0'}`,
                borderRadius: 14,
                padding: 12,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <img
                  src={p.firmLogo || '/aszen_ventures.jpeg'}
                  alt=""
                  style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.propertyCode || p.firmName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.firmName}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <BedDouble size={14} /> {occupied}/{total} Rooms
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} /> {occupancy}%
                </span>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('open-add-property'))}
          style={{
            flex: '0 0 200px',
            border: '1.5px dashed #cbd5e1',
            borderRadius: 14,
            background: '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-main)',
            fontWeight: 700,
            fontSize: 13,
            minHeight: 110
          }}
        >
          <Plus size={22} /> Add / Manage Properties
        </button>
      </div>
    </div>
  );
};
