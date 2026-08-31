import React, { useState, useRef } from 'react';
import { useHotel } from '../context/HotelContext';
import { Building2, Upload, FileSignature, X, Plus } from 'lucide-react';

export const AddPropertyModal = ({ isOpen, onClose }) => {
  const { addProperty } = useHotel();

  const [firmName, setFirmName] = useState('');
  const [firmLogo, setFirmLogo] = useState(null);
  const [eSignature, setESignature] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drawing canvas state for E-Signature
  const [signatureMode, setSignatureMode] = useState('upload'); // 'upload' | 'draw'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFirmLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setESignature(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setESignature(canvas.toDataURL('image/png'));
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setESignature(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firmName.trim()) {
      setError('Please enter the property name.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await addProperty({
        firmName: firmName.trim(),
        firmLogo,
        eSignature
      });
      setIsSubmitting(false);
      if (res.success) {
        onClose();
      } else {
        setError(res.message || 'Failed to add property.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to add property.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        
        {/* Modal Header */}
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={22} color="#d97706" />
            </div>
            <div>
              <h3 className="modal-heading">Add New Property</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Create & configure a separate property under Super Admin manager.</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="auth-error-banner" style={{ marginTop: '12px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Property Name */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              Property / Hotel Name <span style={{ color: '#be123c' }}>*</span>
            </label>
            <div className="input-icon-wrapper">
              <Building2 size={16} className="input-icon" />
              <input
                type="text"
                className="form-input icon-padded"
                placeholder="e.g. Royal Crown Hotel & Suites"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Property Logo */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              Property Header Logo (Optional)
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              background: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {firmLogo ? (
                  <img src={firmLogo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Building2 size={24} color="#f59e0b" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {firmLogo ? 'Custom Logo Uploaded' : 'No Logo Uploaded'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG, JPG or SVG image</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="file"
                  accept="image/*"
                  id="add-prop-logo-file"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
                <label htmlFor="add-prop-logo-file" className="btn-sub" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                  <Upload size={13} /> {firmLogo ? 'Change' : 'Upload'}
                </label>
                {firmLogo && (
                  <button type="button" className="btn-sub" style={{ padding: '6px 8px', fontSize: '12px', color: '#be123c' }} onClick={() => setFirmLogo(null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* E-Signature */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                Manager E-Signature (Optional)
              </label>
              <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: signatureMode === 'upload' ? '#ffffff' : 'transparent',
                    color: signatureMode === 'upload' ? '#0f172a' : '#64748b',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSignatureMode('upload')}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: signatureMode === 'draw' ? '#ffffff' : 'transparent',
                    color: signatureMode === 'draw' ? '#0f172a' : '#64748b',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSignatureMode('draw')}
                >
                  Draw Signature
                </button>
              </div>
            </div>

            {signatureMode === 'upload' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed #cbd5e1'
              }}>
                <div style={{
                  width: '90px',
                  height: '42px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {eSignature ? (
                    <img src={eSignature} alt="Signature Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <FileSignature size={20} color="#94a3b8" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {eSignature ? 'Digital Signature Attached' : 'No Signature Attached'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Transparent PNG scan</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="add-prop-esign-file"
                    style={{ display: 'none' }}
                    onChange={handleSignatureUpload}
                  />
                  <label htmlFor="add-prop-esign-file" className="btn-sub" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                    <Upload size={13} /> {eSignature ? 'Change' : 'Upload'}
                  </label>
                  {eSignature && (
                    <button type="button" className="btn-sub" style={{ padding: '6px 8px', fontSize: '12px', color: '#be123c' }} onClick={() => setESignature(null)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={100}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'crosshair',
                    touchAction: 'none'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sign inside the box above using mouse or touch</span>
                  <button type="button" className="btn-sub" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={clearCanvas}>
                    Clear Drawing
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-sub" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-main" disabled={isSubmitting || !firmName.trim()}>
              {isSubmitting ? 'Creating Property...' : <><Plus size={16} /> Add Property & Open Dashboard</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
