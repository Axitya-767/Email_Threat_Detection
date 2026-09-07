'use client';

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const INVESTIGATOR_ID = "Investigator ID: INV-2291";
const INVESTIGATOR_PIN = "1234";

const QUICK_REASONS = [
  "Subpoena compliance",
  "Target attribution review",
  "Victim notification",
];

export default function PrivacyToggle({ data, masked, setMasked }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [accessLogs, setAccessLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const inputRef = useRef(null);
  const canToggle = data?.masked_view_available !== false;

  useEffect(() => {
    if (showConfirmModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showConfirmModal]);

  const handleToggle = () => {
    if (!canToggle) return;
    if (!masked) {
      // Masking back to true does NOT require confirmation
      setMasked(true);
    } else {
      // Switching from masked to unmasked requires audited confirmation with PIN
      setReason("");
      setPin("");
      setError("");
      setShowConfirmModal(true);
    }
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError("Please state a justification for accessing unmasked PII.");
      return;
    }

    if (pin.trim() !== INVESTIGATOR_PIN) {
      setError("Incorrect investigator PIN (Default: 1234).");
      return;
    }

    const newEntry = {
      id: Date.now(),
      investigatorId: "INV-2291",
      reason: cleanReason,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    setAccessLogs((prev) => [newEntry, ...prev]);
    setMasked(false);
    setShowConfirmModal(false);
    setReason("");
    setPin("");
    setError("");
    setShowLogs(true);
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setReason("");
    setPin("");
    setError("");
  };

  return (
    <div className="relative inline-flex flex-col items-end">
      {/* Top Level Privacy Control Card */}
      <div className="inline-flex items-center gap-3 rounded-lg border border-edge bg-surface px-3 py-2">
        <div className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 ${masked ? "text-risk-green" : "text-risk-red"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            {masked ? <path d="m9 12 2 2 4-4" /> : <path d="m10 10 4 4m0-4-4 4" />}
          </svg>
          <span className="text-xs font-semibold text-ink">PII Shield</span>
        </div>

        <span
          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
            masked
              ? "border-risk-green/30 bg-risk-green/15 text-risk-green"
              : "border-risk-red/50 bg-risk-red/25 text-risk-red animate-pulse"
          }`}
        >
          {masked ? "Protected" : "Exposed"}
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={!masked}
          aria-label="Toggle PII Masking"
          disabled={!canToggle}
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-all focus:outline-hidden focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
            !masked
              ? "border-risk-red bg-risk-red shadow-xs shadow-red-600/50"
              : "border-edge bg-canvas/80"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full shadow-xs transition-transform ${
              !masked
                ? "translate-x-[18px] bg-white"
                : "translate-x-[3px] bg-dim/60"
            }`}
          />
        </button>

        {/* Access Log Indicator Button */}
        {accessLogs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowLogs((prev) => !prev)}
            className={`ml-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
              showLogs
                ? "border-accent bg-accent/15 text-accent"
                : "border-edge bg-canvas text-dim hover:text-ink hover:border-edge"
            }`}
            title="Toggle Forensic Access Log"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span>Access Log ({accessLogs.length})</span>
          </button>
        )}
      </div>

      {/* Access Log Dropdown List - Positioned Directly Under the Toggle */}
      {showLogs && accessLogs.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-edge bg-surface p-3 shadow-2xl z-30 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-edge">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink">
                Access Audit Log
              </span>
              <span className="rounded border border-edge bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-accent">
                {accessLogs.length} {accessLogs.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLogs(false)}
              className="text-dim hover:text-ink text-xs p-0.5 cursor-pointer"
              aria-label="Close access log"
            >
              ✕
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2 pr-0.5">
            {accessLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-md border border-edge/70 bg-canvas/70 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] text-dim mb-1">
                  <span className="font-mono font-semibold text-accent">
                    {log.investigatorId}
                  </span>
                  <span className="font-mono">{log.timestamp}</span>
                </div>
                <p className="text-ink text-[11px] leading-relaxed break-words font-sans">
                  &ldquo;{log.reason}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal - Rendered via Portal with high z-index & explicit width */}
      {typeof document !== "undefined" &&
        showConfirmModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
            <div className="w-[440px] max-w-[92vw] rounded-lg border border-edge bg-surface p-5 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-risk-amber/15 text-risk-amber text-xs">
                    ⚠️
                  </span>
                  <h3 className="text-sm font-semibold text-ink">
                    Reveal Personal Information
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-dim hover:text-ink text-sm cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-dim mb-4 leading-relaxed">
                Access to unmasked personally identifiable information is
                audited. Provide a justification and your 4-digit investigator PIN.
              </p>

              <form onSubmit={handleConfirm} className="space-y-4">
                {/* Mock Investigator ID Field */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-dim mb-1">
                    Investigator Identity
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={INVESTIGATOR_ID}
                    className="w-full rounded-md border border-edge bg-canvas/60 px-3 py-2 text-xs font-mono text-ink cursor-not-allowed select-none"
                  />
                </div>

                {/* Reason for Access Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-dim">
                      Reason for access <span className="text-risk-amber">*</span>
                    </label>
                    <span className="text-[10px] text-dim">Required</span>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g., Subpoena compliance, victim notification"
                    className="w-full rounded-md border border-edge bg-canvas px-3 py-2 text-xs text-ink placeholder:text-dim/50 outline-none focus:border-accent"
                  />

                  {/* Quick Preset Tags */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setReason(preset);
                          setError("");
                        }}
                        className="rounded border border-edge bg-canvas/40 px-2 py-0.5 text-[10px] text-dim hover:text-accent hover:border-accent transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Investigator PIN Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-dim">
                      Investigator PIN <span className="text-risk-amber">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-dim">Default: 1234</span>
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="••••"
                    className="w-full rounded-md border border-edge bg-canvas px-3 py-2 text-center font-mono text-base tracking-[0.4em] text-ink outline-none focus:border-accent"
                  />
                </div>

                {error && (
                  <p className="text-xs text-risk-red font-medium">{error}</p>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-1 border-t border-edge/60">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-md border border-edge bg-canvas px-3 py-1.5 text-xs text-dim hover:text-ink cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-canvas hover:opacity-90 transition-opacity cursor-pointer shadow"
                  >
                    Confirm & Reveal
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
