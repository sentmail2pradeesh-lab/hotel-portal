import React, { useState, useEffect } from 'react';
import { CloudLightning, Check, ArrowLeft, ShieldCheck, Sparkles, Server } from 'lucide-react';

export const AuthLoadingScreen = ({ message, identity, onCancel }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isColdStart = seconds >= 3;
  const isTakingLong = seconds >= 12;

  // Determine stage title
  const getStageTitle = () => {
    if (isTakingLong) return 'Waking Up Cloud Server...';
    if (isColdStart) return 'Connecting to Secure Cloud Backend...';
    return 'Authenticating & Signing In...';
  };

  // Determine display message
  const getDisplayMessage = () => {
    if (message) return message;
    if (isTakingLong) {
      return 'Cloud service is spinning up from idle state. Please hold on...';
    }
    if (isColdStart) {
      return 'Connecting to secure cloud server... (waking up service, please hold on)';
    }
    return 'Verifying credentials and establishing encrypted session...';
  };

  // Smooth progress estimation
  const progressPercent = Math.min(
    95,
    Math.max(12, Math.round(15 + seconds * (isTakingLong ? 2.5 : 5.5)))
  );

  return (
    <div className="auth-loading-page">
      {/* Dynamic ambient background glow lights */}
      <div className="auth-ambient-glow auth-ambient-gold" />
      <div className="auth-ambient-glow auth-ambient-cyan" />
      <div className="auth-ambient-glow auth-ambient-emerald" />

      {/* Main Glassmorphic Loading Card */}
      <div className="auth-loading-card">
        {/* Animated Brand Logo with Ripple Waves */}
        <div className="auth-loading-logo-container">
          <div className="auth-ripple-ring ring-1" />
          <div className="auth-ripple-ring ring-2" />
          <div className="auth-ripple-ring ring-3" />
          <div className="auth-loading-logo">
            <img
              src="/aszen_ventures.jpeg"
              alt="Aszen Ventures"
            />
          </div>
        </div>

        {/* Dual-Orbital High-Tech Spinner */}
        <div className="auth-spinner-wrapper">
          <div className="auth-spinner-orbit outer-orbit" />
          <div className="auth-spinner-orbit inner-orbit" />
          <div className="auth-spinner-core">
            <CloudLightning size={16} className="auth-core-icon" />
          </div>
        </div>

        {/* Stage Title */}
        <h2 className="auth-loading-title">{getStageTitle()}</h2>

        {/* Subtext */}
        <p className="auth-loading-subtitle">
          {identity ? (
            <>
              Signing into account <span className="auth-identity-highlight">{identity}</span>
            </>
          ) : (
            'Hotel Operations Portal • Secure Session'
          )}
        </p>

        {/* Highlighted Dynamic Loading Message Box (as requested) */}
        <div className="auth-loading-message-box">
          <div className="auth-message-pulse-dot" />
          <span className="auth-message-text">{getDisplayMessage()}</span>
        </div>

        {/* Shimmering Animated Progress Bar */}
        <div className="auth-progress-section">
          <div className="auth-progress-track">
            <div
              className="auth-progress-bar"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="auth-progress-shimmer" />
            </div>
          </div>
          <div className="auth-progress-meta">
            <span className="auth-progress-status">
              {isTakingLong ? 'Spinning up container...' : 'Synchronizing dashboard...'}
            </span>
            <span className="auth-progress-timer">
              Elapsed: {seconds}s
            </span>
          </div>
        </div>

        {/* Connection Step Milestones */}
        <div className="auth-steps-list">
          <div className="auth-step-item completed">
            <div className="auth-step-icon">
              <Check size={11} strokeWidth={3} />
            </div>
            <span>Credentials</span>
          </div>
          <div className="auth-step-line completed" />
          <div className="auth-step-item active">
            <div className="auth-step-icon">
              <div className="auth-step-mini-spinner" />
            </div>
            <span>Cloud Link</span>
          </div>
          <div className="auth-step-line" />
          <div className="auth-step-item">
            <div className="auth-step-icon">
              <Server size={11} />
            </div>
            <span>Workspace</span>
          </div>
        </div>

        {/* Notice for cold-start delay */}
        {isTakingLong && (
          <div className="auth-coldstart-notice">
            <Sparkles size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              Free cloud instance is awakening from sleep (~30–50s). You will be logged in automatically.
            </span>
          </div>
        )}

        {/* Cancel & Return to Sign In Button */}
        {onCancel && (
          <button
            type="button"
            className="auth-cancel-button"
            onClick={onCancel}
            title="Return to the sign-in form"
          >
            <ArrowLeft size={14} />
            <span>Cancel & Back to Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
};
