import React, { useState, useEffect } from 'react';

export const ConnectingScreen = ({ onRetry, onSkipToAuth }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Emergency safety timeout: after 40 seconds, automatically allow user to proceed to login
  useEffect(() => {
    if (seconds >= 40 && onSkipToAuth) {
      console.warn('ConnectingScreen reached 40s timeout. Releasing loading screen to Auth view.');
      onSkipToAuth();
    }
  }, [seconds, onSkipToAuth]);

  const isTakingLong = seconds >= 15;

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
        {isTakingLong
          ? 'Server is waking up, please wait...'
          : 'Loading...'}
      </p>

      {isTakingLong && (
        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          )}

          {onSkipToAuth && (
            <button
              type="button"
              onClick={onSkipToAuth}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: 'transparent',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Go to Sign In
            </button>
          )}
        </div>
      )}
    </div>
  );
};
