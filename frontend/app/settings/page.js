'use client';

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  AlertTriangle,
  GitMerge,
  Bell,
  Key,
  Plug,
  LogOut,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sliders,
  Lock,
  Check,
  Building2,
  Globe,
  Radio,
  FileCode,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

function subscribe() {
  return () => {};
}

function getEmailSnapshot() {
  return sessionStorage.getItem("userEmail") || "analyst@demo.com";
}

function getServerEmailSnapshot() {
  return "analyst@demo.com";
}

export default function SettingsPage() {
  const router = useRouter();

  // User identity from session
  const analystEmail = useSyncExternalStore(subscribe, getEmailSnapshot, getServerEmailSnapshot);
  const analystName = "SecOps Analyst";

  // Display Theme State: "dark" | "system" | "light"
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("settings_displayTheme");
      if (stored === "light" || stored === "system" || stored === "dark") {
        return stored;
      }
    }
    return "dark";
  });

  // Setting 1: PII Masking Default
  const [piiMaskingDefault, setPiiMaskingDefault] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("settings_piiMaskingDefault");
      if (stored !== null) return stored === "true";
    }
    return true;
  });

  // Setting 2: Risk Alert Threshold (expandable)
  const [riskThreshold, setRiskThreshold] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("settings_riskThreshold");
      if (stored !== null) return Number(stored);
    }
    return 75;
  });
  const [isThresholdExpanded, setIsThresholdExpanded] = useState(false);

  // Setting 3: Auto-correlate new cases into campaigns
  const [autoCorrelate, setAutoCorrelate] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("settings_autoCorrelate");
      if (stored !== null) return stored === "true";
    }
    return true;
  });

  // Setting 4: Notifications (expandable)
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false);
  const [notifCritical, setNotifCritical] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("settings_notifCritical");
      if (stored !== null) return stored === "true";
    }
    return true;
  });
  const [notifCampaign, setNotifCampaign] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("settings_notifCampaign");
      if (stored !== null) return stored === "true";
    }
    return true;
  });
  const [notifDigest, setNotifDigest] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("settings_notifDigest");
      if (stored !== null) return stored === "true";
    }
    return true;
  });

  // Setting 6: Connected Integrations (expandable)
  const [isIntegrationsExpanded, setIsIntegrationsExpanded] = useState(false);

  // Save confirmation indicator
  const [lastSaved, setLastSaved] = useState(null);

  const triggerSaveNotification = (settingName) => {
    setLastSaved(settingName);
    setTimeout(() => setLastSaved(null), 2500);
  };

  const applyTheme = (theme) => {
    if (typeof window === "undefined") return;

    let isDark = true;
    if (theme === "light") {
      isDark = false;
    } else if (theme === "system") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    const root = document.documentElement;
    const body = typeof document !== "undefined" ? document.body : null;
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      if (body) {
        body.classList.add("dark");
        body.classList.remove("light");
      }
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      if (body) {
        body.classList.add("light");
        body.classList.remove("dark");
      }
    }
  };

  const handleSelectTheme = (theme) => {
    setSelectedTheme(theme);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("settings_displayTheme", theme);
    }
    applyTheme(theme);
    triggerSaveNotification(
      `Theme: ${theme === "dark" ? "Dark Mode" : theme === "light" ? "Light Mode" : "System Default"}`
    );
  };

  // Sync theme changes & OS listener
  useEffect(() => {
    applyTheme(selectedTheme);

    if (selectedTheme === "system" && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [selectedTheme]);

  const handleTogglePii = () => {
    const nextVal = !piiMaskingDefault;
    setPiiMaskingDefault(nextVal);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("settings_piiMaskingDefault", String(nextVal));
    }
    triggerSaveNotification("PII Masking Default");
  };

  const handleChangeThreshold = (val) => {
    const num = Number(val);
    setRiskThreshold(num);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("settings_riskThreshold", String(num));
    }
    triggerSaveNotification("Risk Alert Threshold");
  };

  const handleToggleAutoCorrelate = () => {
    const nextVal = !autoCorrelate;
    setAutoCorrelate(nextVal);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("settings_autoCorrelate", String(nextVal));
    }
    triggerSaveNotification("Campaign Auto-Correlation");
  };

  const handleToggleNotifCritical = () => {
    const nextVal = !notifCritical;
    setNotifCritical(nextVal);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("settings_notifCritical", String(nextVal));
    }
    triggerSaveNotification("Critical Case Alerts");
  };

  const handleToggleNotifCampaign = () => {
    const nextVal = !notifCampaign;
    setNotifCampaign(nextVal);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("settings_notifCampaign", String(nextVal));
    }
    triggerSaveNotification("Campaign Correlation Alerts");
  };

  const handleToggleNotifDigest = () => {
    const nextVal = !notifDigest;
    setNotifDigest(nextVal);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("settings_notifDigest", String(nextVal));
    }
    triggerSaveNotification("Weekly Digest Reports");
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("isAuthenticated");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("loginTimestamp");
    }
    router.push("/login");
  };

  const initial = (analystEmail[0] || "S").toUpperCase();

  // Integrations list
  const INTEGRATIONS = [
    {
      name: "MaxMind GeoLite2",
      purpose: "IP Autonomous System & Geo-Routing database",
      status: "Connected",
      icon: <Globe className="h-4 w-4 text-accent" />,
      latency: "12ms",
    },
    {
      name: "AbuseIPDB API",
      purpose: "Crowdsourced IP reputation & malicious host lookups",
      status: "Connected",
      icon: <Radio className="h-4 w-4 text-risk-amber" />,
      latency: "45ms",
    },
    {
      name: "VirusTotal Enterprise",
      purpose: "Multi-engine artifact hash & URL sandbox telemetry",
      status: "Connected",
      icon: <FileCode className="h-4 w-4 text-risk-red" />,
      latency: "98ms",
    },
    {
      name: "HuggingFace NLP Model",
      purpose: "Local transformer intent & urgency classifier",
      status: "Connected",
      icon: <CheckCircle2 className="h-4 w-4 text-risk-green" />,
      latency: "4ms (Local)",
    },
  ];

  const activeNotifsCount = [notifCritical, notifCampaign, notifDigest].filter(Boolean).length;

  return (
    <div className="min-h-screen p-6 bg-canvas text-ink font-sans">
      <div className="max-w-2xl mx-auto py-4">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Settings & Preferences
            </h1>
            <p className="mt-1 text-xs text-dim">
              Manage analyst profile, investigation defaults, telemetry alerts, and system integrations.
            </p>
          </div>

          {/* Real-time Save Toast */}
          {lastSaved && (
            <div className="flex items-center gap-1.5 rounded-full border border-risk-green/40 bg-risk-green/15 px-3 py-1 text-xs text-risk-green animate-in fade-in duration-150">
              <Check className="h-3.5 w-3.5" />
              <span>{lastSaved} updated</span>
            </div>
          )}
        </div>

        {/* 1. Chrome-Inspired Profile Header Card */}
        <div className="mb-6 rounded-2xl border border-edge bg-surface p-6 text-center shadow-sm relative overflow-hidden">
          {/* Large Circular Avatar with analyst initial matching sidebar footer accent */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent/40 bg-accent/20 text-accent text-2xl font-bold shadow-md">
            {initial}
            {/* Live active session indicator dot */}
            <span
              className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-surface bg-risk-green"
              title="Active session"
            />
          </div>

          {/* Analyst Display Name and Email */}
          <div className="mt-3">
            <h2 className="text-lg font-bold tracking-tight text-ink">
              {analystName}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-dim">
              {analystEmail}
            </p>
          </div>

          {/* Clearance & Role Pill */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 text-[11px] font-semibold text-accent">
              <Shield className="h-3 w-3" />
              Tier-2 SOC Analyst • Level 4 Clearance
            </span>
          </div>
        </div>

        {/* Display Theme & Visual Ergonomics */}
        <div className="mb-6 rounded-2xl border border-edge bg-surface p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold tracking-tight text-ink">
              Display Theme &amp; Visual Ergonomics
            </h2>
            <p className="mt-1 text-xs text-dim">
              Select your preferred visual theme. Dark mode is optimized for 24/7 low-light security operations center (SOC) environments.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {/* Card 1: Dark Mode */}
            <button
              type="button"
              id="theme-card-dark"
              onClick={() => handleSelectTheme("dark")}
              className={`relative flex flex-col justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                selectedTheme === "dark"
                  ? "border-accent bg-surface shadow-xs shadow-accent/10"
                  : "border-edge bg-surface/70 hover:border-edge/90 hover:bg-surface"
              }`}
            >
              {selectedTheme === "dark" && (
                <span className="absolute top-3 right-3 rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                  Active
                </span>
              )}
              <div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-accent mb-3">
                  <Moon className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-ink">
                  Dark Mode (Default)
                </h3>
                <p className="mt-1 text-[11px] text-dim leading-relaxed">
                  High-contrast slate palette designed for long forensic investigations.
                </p>
              </div>
            </button>

            {/* Card 2: System Default */}
            <button
              type="button"
              id="theme-card-system"
              onClick={() => handleSelectTheme("system")}
              className={`relative flex flex-col justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                selectedTheme === "system"
                  ? "border-accent bg-surface shadow-xs shadow-accent/10"
                  : "border-edge bg-surface/70 hover:border-edge/90 hover:bg-surface"
              }`}
            >
              {selectedTheme === "system" && (
                <span className="absolute top-3 right-3 rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                  Active
                </span>
              )}
              <div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-accent mb-3">
                  <Monitor className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-ink">
                  System Default
                </h3>
                <p className="mt-1 text-[11px] text-dim leading-relaxed">
                  Synchronizes with client operating system color-scheme preference.
                </p>
              </div>
            </button>

            {/* Card 3: Light Mode */}
            <button
              type="button"
              id="theme-card-light"
              onClick={() => handleSelectTheme("light")}
              className={`relative flex flex-col justify-between p-4 rounded-lg border text-left transition-all cursor-pointer ${
                selectedTheme === "light"
                  ? "border-accent bg-surface shadow-xs shadow-accent/10"
                  : "border-edge bg-surface/70 hover:border-edge/90 hover:bg-surface"
              }`}
            >
              {selectedTheme === "light" && (
                <span className="absolute top-3 right-3 rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                  Active
                </span>
              )}
              <div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-accent mb-3">
                  <Sun className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-ink">
                  Light Mode
                </h3>
                <p className="mt-1 text-[11px] text-dim leading-relaxed">
                  Daylight environment rendering for presentation and report generation.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Main Settings Rows Card */}
        <div className="rounded-2xl border border-edge bg-surface shadow-sm overflow-hidden divide-y divide-edge/60 mb-6">
          {/* Row 1: PII Masking Default */}
          <div
            onClick={handleTogglePii}
            className="flex items-center justify-between p-4.5 hover:bg-canvas/40 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-accent">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    PII Masking Default
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider border ${
                      piiMaskingDefault
                        ? "border-risk-green/30 bg-risk-green/15 text-risk-green"
                        : "border-risk-red/40 bg-risk-red/15 text-risk-red"
                    }`}
                  >
                    {piiMaskingDefault ? "Protected" : "Exposed"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-dim">
                  Default view masks sender personal identifiers, names, and email handles across all cases.
                </p>
              </div>
            </div>

            {/* Standard Project Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={piiMaskingDefault}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePii();
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-all focus:outline-hidden focus:ring-2 focus:ring-accent ${
                piiMaskingDefault
                  ? "border-accent bg-accent shadow-xs shadow-accent/30"
                  : "border-edge bg-canvas/80"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full shadow-xs transition-transform ${
                  piiMaskingDefault
                    ? "translate-x-[18px] bg-canvas font-bold"
                    : "translate-x-[3px] bg-dim/60"
                }`}
              />
            </button>
          </div>

          {/* Row 2: Risk Alert Threshold (Expandable) */}
          <div>
            <div
              onClick={() => setIsThresholdExpanded(!isThresholdExpanded)}
              className="flex items-center justify-between p-4.5 hover:bg-canvas/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-risk-amber">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-ink">
                    Risk Alert Threshold
                  </span>
                  <p className="mt-0.5 text-xs text-dim">
                    Trigger automated alerts and elevated triage when a case risk score reaches this score.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-md border border-edge bg-canvas px-2.5 py-1 font-mono text-xs font-bold text-accent">
                  {riskThreshold} / 100
                </span>
                {isThresholdExpanded ? (
                  <ChevronUp className="h-4 w-4 text-dim" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-dim" />
                )}
              </div>
            </div>

            {/* Expanded Slider Panel */}
            {isThresholdExpanded && (
              <div className="border-t border-edge/60 bg-canvas/40 p-4.5 pl-16 pr-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-dim">Sensitivity:</span>
                  <span className="font-semibold text-ink">
                    Score &gt;= {riskThreshold}{" "}
                    <span className="text-dim font-normal">
                      ({riskThreshold >= 75 ? "High / Critical Alert" : "Moderate Alert"})
                    </span>
                  </span>
                </div>

                <input
                  type="range"
                  min="30"
                  max="95"
                  step="5"
                  value={riskThreshold}
                  onChange={(e) => handleChangeThreshold(e.target.value)}
                  className="w-full accent-accent cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-dim/70 mt-1.5 font-mono">
                  <span>30 (Permissive)</span>
                  <span>50 (Moderate)</span>
                  <span>75 (High - Recommended)</span>
                  <span>95 (Critical Only)</span>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Auto-Correlate New Cases Into Campaigns */}
          <div
            onClick={handleToggleAutoCorrelate}
            className="flex items-center justify-between p-4.5 hover:bg-canvas/40 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-accent">
                <GitMerge className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-ink">
                  Auto-Correlate Cases into Campaigns
                </span>
                <p className="mt-0.5 text-xs text-dim">
                  Automatically link incoming cases to threat clusters using matching ASN and registrar telemetry.
                </p>
              </div>
            </div>

            {/* Standard Project Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={autoCorrelate}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAutoCorrelate();
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-all focus:outline-hidden focus:ring-2 focus:ring-accent ${
                autoCorrelate
                  ? "border-accent bg-accent shadow-xs shadow-accent/30"
                  : "border-edge bg-canvas/80"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full shadow-xs transition-transform ${
                  autoCorrelate
                    ? "translate-x-[18px] bg-canvas font-bold"
                    : "translate-x-[3px] bg-dim/60"
                }`}
              />
            </button>
          </div>

          {/* Row 4: Notifications (Expandable) */}
          <div>
            <div
              onClick={() => setIsNotificationsExpanded(!isNotificationsExpanded)}
              className="flex items-center justify-between p-4.5 hover:bg-canvas/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-accent">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-ink">
                    Notifications
                  </span>
                  <p className="mt-0.5 text-xs text-dim">
                    Configure real-time dispatch for critical events, campaign correlations, and digests.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-md border border-edge bg-canvas px-2.5 py-1 text-xs text-dim font-medium">
                  {activeNotifsCount} active
                </span>
                {isNotificationsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-dim" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-dim" />
                )}
              </div>
            </div>

            {/* Expanded Notifications Sub-Toggles */}
            {isNotificationsExpanded && (
              <div className="border-t border-edge/60 bg-canvas/40 p-4.5 pl-16 pr-6 space-y-3.5 animate-in fade-in duration-150">
                {/* Sub-toggle 1 */}
                <div
                  onClick={handleToggleNotifCritical}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-semibold text-ink">
                      New critical case alert
                    </span>
                    <p className="text-[11px] text-dim">
                      Instant notification upon detection of phishing with score &gt;= threshold
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifCritical}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleNotifCritical();
                    }}
                    className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border transition-all ${
                      notifCritical
                        ? "border-accent bg-accent shadow-xs"
                        : "border-edge bg-canvas"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full transition-transform ${
                        notifCritical
                          ? "translate-x-[16px] bg-canvas"
                          : "translate-x-[2px] bg-dim/60"
                      }`}
                    />
                  </button>
                </div>

                {/* Sub-toggle 2 */}
                <div
                  onClick={handleToggleNotifCampaign}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-semibold text-ink">
                      Campaign correlation found
                    </span>
                    <p className="text-[11px] text-dim">
                      Alert when a new case matches an existing attacker infrastructure cluster
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifCampaign}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleNotifCampaign();
                    }}
                    className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border transition-all ${
                      notifCampaign
                        ? "border-accent bg-accent shadow-xs"
                        : "border-edge bg-canvas"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full transition-transform ${
                        notifCampaign
                          ? "translate-x-[16px] bg-canvas"
                          : "translate-x-[2px] bg-dim/60"
                      }`}
                    />
                  </button>
                </div>

                {/* Sub-toggle 3 */}
                <div
                  onClick={handleToggleNotifDigest}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-semibold text-ink">
                      Weekly summary report
                    </span>
                    <p className="text-[11px] text-dim">
                      Consolidated SOC metrics digest and quarantine statistics report
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifDigest}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleNotifDigest();
                    }}
                    className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border transition-all ${
                      notifDigest
                        ? "border-accent bg-accent shadow-xs"
                        : "border-edge bg-canvas"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full transition-transform ${
                        notifDigest
                          ? "translate-x-[16px] bg-canvas"
                          : "translate-x-[2px] bg-dim/60"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row 5: Change Password (Disabled / Greyed Out) */}
          <div className="flex items-center justify-between p-4.5 opacity-60 bg-canvas/20 cursor-not-allowed">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-canvas/50 text-dim">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    Change Password &amp; Credentials
                  </span>
                  <Lock className="h-3 w-3 text-dim/70" />
                </div>
                <p className="mt-0.5 text-xs text-dim">
                  Manage master analyst credentials, security keys, and MFA authenticators.
                </p>
              </div>
            </div>

            <span className="rounded-md border border-edge bg-surface px-2.5 py-1 text-[11px] font-medium text-dim shrink-0">
              Available once backend auth is live
            </span>
          </div>

          {/* Row 6: Connected Integrations (Expandable) */}
          <div>
            <div
              onClick={() => setIsIntegrationsExpanded(!isIntegrationsExpanded)}
              className="flex items-center justify-between p-4.5 hover:bg-canvas/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-canvas/80 text-accent">
                  <Plug className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-ink">
                    Connected Integrations
                  </span>
                  <p className="mt-0.5 text-xs text-dim">
                    Threat intelligence APIs, CTI databases, and AI classification pipelines.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-md border border-risk-green/40 bg-risk-green/10 px-2.5 py-1 text-xs font-semibold text-risk-green">
                  4 Connected
                </span>
                {isIntegrationsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-dim" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-dim" />
                )}
              </div>
            </div>

            {/* Expanded Integrations List */}
            {isIntegrationsExpanded && (
              <div className="border-t border-edge/60 bg-canvas/40 p-4.5 pl-16 pr-6 space-y-2.5 animate-in fade-in duration-150">
                {INTEGRATIONS.map((integ) => (
                  <div
                    key={integ.name}
                    className="flex items-center justify-between rounded-lg border border-edge/60 bg-surface/70 p-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-canvas border border-edge">
                        {integ.icon}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-ink">
                          {integ.name}
                        </div>
                        <div className="text-[10px] text-dim">
                          {integ.purpose}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono text-[10px] text-dim">
                        {integ.latency}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-risk-green/40 bg-risk-green/15 px-2 py-0.5 text-[10px] font-semibold text-risk-green">
                        <span className="h-1.5 w-1.5 rounded-full bg-risk-green" />
                        {integ.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Distinct Sign Out Card (Chrome profile style) */}
        <div className="rounded-2xl border border-edge bg-surface shadow-sm overflow-hidden">
          <div
            onClick={handleSignOut}
            className="flex items-center justify-between p-4.5 hover:bg-risk-red/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-risk-red/30 bg-risk-red/10 text-risk-red">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-risk-red">
                  Sign out
                </span>
                <p className="mt-0.5 text-xs text-dim">
                  End current analyst session on this device and return to authentication portal.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-risk-red/40 bg-risk-red/15 px-3 py-1.5 text-xs font-semibold text-risk-red group-hover:bg-risk-red group-hover:text-canvas transition-all shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
