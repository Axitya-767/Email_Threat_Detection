'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

function subscribe() {
  return () => {};
}

function getEmailSnapshot() {
  return sessionStorage.getItem("userEmail") || "analyst@demo.com";
}

function getServerEmailSnapshot() {
  return "analyst@demo.com";
}

export default function SidebarProfile() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const email = useSyncExternalStore(subscribe, getEmailSnapshot, getServerEmailSnapshot);
  const menuRef = useRef(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("isAuthenticated");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("loginTimestamp");
    }
    setIsOpen(false);
    router.push("/login");
  };

  const initial = (email[0] || "A").toUpperCase();

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* Profile Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex w-full items-center gap-2.5 rounded-lg border p-1.5 transition-all text-left ${
          isOpen
            ? "border-accent/40 bg-canvas"
            : "border-transparent hover:border-edge hover:bg-canvas/70"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar with Status Indicator */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-xs font-semibold text-accent shadow-sm">
          {initial}
          <span
            className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-surface bg-risk-green"
            title="Session active"
          />
        </div>

        {/* User Details */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-ink group-hover:text-ink">
            SecOps Analyst
          </div>
          <div className="truncate text-[10px] text-dim">{email}</div>
        </div>

        {/* Chevron Icon */}
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-200 ${
            isOpen ? "rotate-180 text-accent" : "group-hover:text-ink"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Account Popup Menu (Anchored above avatar) */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-60 rounded-xl border border-edge bg-surface p-3 shadow-2xl z-50">
          {/* Header info */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-edge">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/20 text-sm font-semibold text-accent">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-ink">
                SecOps Analyst
              </div>
              <div className="truncate text-[11px] text-dim">{email}</div>
              <span className="mt-1 inline-block rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-accent border border-accent/20">
                Tier-2 SOC Analyst
              </span>
            </div>
          </div>

          {/* Account Details */}
          <div className="py-2.5 space-y-1.5 text-[11px] text-dim border-b border-edge">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="flex items-center gap-1 text-risk-green font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-risk-green" />
                Active Session
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Access Clearance</span>
              <span className="text-ink font-mono text-[10px]">Level 4 (Forensics)</span>
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-risk-red transition-colors hover:bg-risk-red/10"
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
