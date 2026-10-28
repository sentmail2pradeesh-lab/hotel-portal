import React from 'react';

export const AuthLoadingScreen = ({ message, onCancel }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        padding: 24,
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(245, 158, 11, 0.2)',
          borderTopColor: '#f59e0b',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <p style={{ marginTop: 18, marginBottom: 0, fontSize: 14, color: '#94a3b8' }}>
        {message || 'Signing you in...'}
      </p>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: 24,
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
};
