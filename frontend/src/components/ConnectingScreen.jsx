import React, { useState, useEffect } from 'react';
import { RefreshCw, LogIn, CloudLightning } from 'lucide-react';

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

  const isColdStart = seconds >= 4;
  const isTakingLong = seconds >= 15;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e293b 100%)',
        color: '#f8fafc',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        padding: '24px',
        textAlign: 'center',
        userSelect: 'none'
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 20,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.3)',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src="/aszen_ventures.jpeg"
          alt="Aszen Ventures"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Modern Spinner */}
      <div style={{ position: 'relative', width: 44, height: 44, marginBottom: 18 }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '3px solid rgba(245, 158, 11, 0.15)',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 0.85s linear infinite'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            border: '2px dashed rgba(245, 158, 11, 0.4)',
            animation: 'spin 3s linear infinite reverse'
          }}
        />
      </div>

      {/* Main Status Heading */}
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#f8fafc'
        }}
      >
        {isTakingLong
          ? 'Cloud Server is Waking Up...'
          : isColdStart
          ? 'Connecting to Secure Cloud Backend...'
          : 'Connecting to Aszen Ventures Portal...'}
      </h2>

      {/* Dynamic Informative Subtext */}
      <p
        style={{
          marginTop: 10,
          marginBottom: 0,
          fontSize: 13.5,
          color: '#94a3b8',
          maxWidth: 440,
          lineHeight: 1.55
        }}
      >
        {isTakingLong
          ? 'Render free cloud instances sleep after 15 minutes of inactivity and take ~30–50s to boot. Almost ready...'
          : isColdStart
          ? 'Verifying authentication session and preparing properties data...'
          : 'Establishing encrypted link to hotel management server...'}
      </p>

      {/* Elapsed seconds badge */}
      {seconds >= 2 && (
        <div
          style={{
            marginTop: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: 12.5,
            color: '#cbd5e1',
            fontFamily: 'var(--font-mono, monospace)'
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isTakingLong ? '#fbbf24' : '#10b981',
              boxShadow: isTakingLong ? '0 0 8px #fbbf24' : '0 0 8px #10b981'
            }}
          />
          Connecting: {seconds}s
        </div>
      )}

      {/* Progress Bar for cold start */}
      {isColdStart && (
        <div
          style={{
            width: 260,
            height: 4,
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
            overflow: 'hidden',
            marginTop: 18
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              width: `${Math.min(96, Math.max(10, seconds * 3))}%`,
              transition: 'width 0.8s ease'
            }}
          />
        </div>
      )}

      {/* Interactive Controls when taking longer than 12 seconds */}
      {isTakingLong && (
        <div
          style={{
            marginTop: 26,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 18px',
                borderRadius: 8,
                background: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <RefreshCw size={14} />
              Retry Connection
            </button>
          )}

          {onSkipToAuth && (
            <button
              type="button"
              onClick={onSkipToAuth}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 18px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            >
              <LogIn size={14} />
              Open Sign In Screen
            </button>
          )}
        </div>
      )}
    </div>
  );
};
