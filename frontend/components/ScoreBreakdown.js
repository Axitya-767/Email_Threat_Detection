'use client';

const QUADRANT_CONFIG = [
  {
    key: "header_routing",
    label: "Header & routing",
    max: 25,
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M9 6h6a3 3 0 0 1 3 3v6" />
        <path d="M6 9v6a3 3 0 0 0 3 3h6" />
      </svg>
    ),
  },
  {
    key: "auth_failure",
    label: "Authentication",
    max: 30,
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    key: "nlp_language",
    label: "Language & intent",
    max: 30,
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    key: "reputation",
    label: "Reputation",
    max: 15,
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
      </svg>
    ),
  },
];

function getRiskSeverity(score) {
  if (typeof score !== "number" || isNaN(score)) {
    return { label: "Unknown", tone: "neutral" };
  }
  if (score >= 80) {
    return { label: "Critical Risk", tone: "critical" };
  }
  if (score >= 60) {
    return { label: "High Risk", tone: "high" };
  }
  if (score >= 30) {
    return { label: "Moderate Risk", tone: "moderate" };
  }
  return { label: "Low Risk", tone: "low" };
}

function scoreExplanation(score) {
  if (typeof score !== "number" || isNaN(score)) {
    return "No score telemetry available for analysis.";
  }
  if (score >= 80) {
    return "Multiple critical-risk indicators detected; immediate triage and isolation recommended.";
  }
  if (score >= 60) {
    return "Elevated risk signals detected across authentication and communication channels.";
  }
  if (score >= 30) {
    return "Moderate threat anomalies observed; warrants manual investigator review.";
  }
  return "Standard communication patterns with clean authentication and routing telemetry.";
}

function toneBadgeClasses(tone) {
  if (tone === "critical" || tone === "high") {
    return "border-risk-red/40 bg-risk-red/15 text-risk-red";
  }
  if (tone === "moderate") {
    return "border-risk-amber/40 bg-risk-amber/15 text-risk-amber";
  }
  if (tone === "low") {
    return "border-risk-green/40 bg-risk-green/15 text-risk-green";
  }
  return "border-edge bg-canvas text-dim";
}

function toneScoreColor(tone) {
  if (tone === "critical" || tone === "high") {
    return "text-risk-red";
  }
  if (tone === "moderate") {
    return "text-risk-amber";
  }
  if (tone === "low") {
    return "text-risk-green";
  }
  return "text-ink";
}

function toneHexColor(tone) {
  if (tone === "critical" || tone === "high") {
    return "#b91c1c"; // deep red-700
  }
  if (tone === "moderate") {
    return "#d97706"; // risk-amber
  }
  if (tone === "low") {
    return "#16a34a"; // risk-green
  }
  return "#3b6998"; // deep slate-blue
}

// Exactly width = (value / max) * 100%, graded: < 50% amber, >= 50% red
function getSignalColorInfo(val, maxVal) {
  if (typeof val !== "number" || isNaN(val) || !maxVal) {
    return { barBg: "bg-dim/40", text: "text-dim", pct: 0 };
  }
  const clamped = Math.max(0, Math.min(val, maxVal));
  const pct = Number(((clamped / maxVal) * 100).toFixed(1));

  if (clamped === 0) {
    return { barBg: "bg-risk-green", text: "text-risk-green", pct: 0 };
  }
  if (pct >= 50) {
    return { barBg: "bg-risk-red", text: "text-risk-red", pct };
  }
  return { barBg: "bg-risk-amber", text: "text-risk-amber", pct };
}

export default function ScoreBreakdown({ data, masked: _masked }) {
  const rawScore = data?.risk_score;
  const scoreValid = typeof rawScore === "number" && !isNaN(rawScore);
  const scoreDisplay = scoreValid ? Math.round(rawScore) : "—";
  const severity = getRiskSeverity(rawScore);
  const badgeClasses = toneBadgeClasses(severity.tone);
  const scoreColorClass = toneScoreColor(severity.tone);
  const scoreHex = toneHexColor(severity.tone);

  const quadrantsData = data?.quadrants ?? {};

  // Hero SVG Circular Gauge (Radius = 56, Circumference ≈ 351.86)
  const CIRCLE_CIRCUMFERENCE = 351.86;
  const scoreDashOffset = scoreValid
    ? CIRCLE_CIRCUMFERENCE -
      (CIRCLE_CIRCUMFERENCE * Math.min(100, Math.max(0, rawScore))) / 100
    : CIRCLE_CIRCUMFERENCE;

  return (
    <div className="flex flex-col rounded-xl border border-edge bg-surface p-6 shadow-sm">
      {/* Section Sub-Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Threat signals
          </span>
          <h2 className="text-lg font-semibold text-ink">Score breakdown</h2>
        </div>
        <span
          className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClasses}`}
        >
          {severity.label}
        </span>
      </div>

      {/* Main Two-Column Layout: Hero Gauge on Left, Breakdown Bars on Right */}
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Hero Circular Ring Gauge & Assessment (5 cols) */}
        <div className="flex flex-col items-center text-center lg:col-span-5 lg:border-r lg:border-edge/60 lg:pr-6">
          <div className="relative mb-4 flex shrink-0 items-center justify-center">
            <svg width="150" height="150" viewBox="0 0 130 130" className="-rotate-90">
              {/* Background Track */}
              <circle
                cx="65"
                cy="65"
                r="56"
                stroke="currentColor"
                strokeWidth="9"
                fill="transparent"
                className="text-canvas"
              />
              {/* Active Severity Ring */}
              <circle
                cx="65"
                cy="65"
                r="56"
                stroke={scoreHex}
                strokeWidth="9"
                fill="transparent"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={scoreDashOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold font-mono tracking-tight leading-none ${scoreColorClass}`}>
                {scoreDisplay}
              </span>
              <span className="mt-1 font-mono text-xs font-medium text-dim">
                / 100
              </span>
            </div>
          </div>

          {/* Proper width container preventing single-column word stacking */}
          <div className="w-full min-w-[260px] max-w-[340px] px-2 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-dim block mb-1">
              Assessment verdict
            </span>
            <p className="text-xs leading-relaxed text-dim break-normal whitespace-normal">
              {scoreExplanation(rawScore)}
            </p>
          </div>
        </div>

        {/* Quadrant Risk Breakdown Bars (7 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex items-center justify-between pb-1 border-b border-edge/40">
            <span className="text-xs font-semibold text-ink">Quadrant weight telemetry</span>
            <div className="flex items-center gap-3 text-[11px] text-dim">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-risk-red" />
                <span>Critical (≥50%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-risk-amber" />
                <span>Medium (&lt;50%)</span>
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {QUADRANT_CONFIG.map(({ key, label, max, icon }) => {
              const rawVal = quadrantsData[key];
              const hasVal = typeof rawVal === "number" && !isNaN(rawVal);
              // Guaranteed never to exceed max
              const clampedVal = hasVal ? Math.max(0, Math.min(rawVal, max)) : 0;
              const colorInfo = getSignalColorInfo(clampedVal, max);

              return (
                <div key={key} className="rounded-lg border border-edge/60 bg-canvas/60 p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex min-w-0 items-center gap-2 text-ink">
                      <span className="text-dim shrink-0">{icon}</span>
                      <span className="font-medium text-sm text-ink">{label}</span>
                    </div>
                    <div className="shrink-0 font-mono text-xs flex items-center gap-2">
                      {hasVal ? (
                        <>
                          <span className={`font-semibold text-sm ${colorInfo.text}`}>
                            {clampedVal}
                          </span>
                          <span className="text-dim">/ {max} pts</span>
                          <span className="rounded border border-edge/40 bg-surface px-1.5 py-0.5 text-[10px] font-mono text-dim">
                            {Math.round(colorInfo.pct)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </div>
                  </div>

                  {/* Progress Track with strictly computed fill width */}
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas border border-edge/40">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorInfo.barBg}`}
                      style={{ width: `${Math.max(0, Math.min(100, colorInfo.pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-dim text-right pt-1">
            Quadrants sum to 100 points max across 4 forensic signal categories.
          </p>
        </div>
      </div>
    </div>
  );
}
