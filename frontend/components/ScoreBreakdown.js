const QUADRANT_CONFIG = [
  {
    key: "header_routing",
    label: "Header & Routing",
    max: 30,
    icon: (
      <svg
        width="13"
        height="13"
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
    max: 25,
    icon: (
      <svg
        width="13"
        height="13"
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
    label: "Language & Intent",
    max: 30,
    icon: (
      <svg
        width="13"
        height="13"
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
        width="13"
        height="13"
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
    return "Multiple high-risk indicators detected; immediate triage recommended.";
  }
  if (score >= 60) {
    return "Elevated risk signals detected across header & communication channels.";
  }
  if (score >= 30) {
    return "Moderate threat anomalies observed; warrants investigator review.";
  }
  return "Normal email communication patterns with low risk telemetry.";
}

function toneBadgeClasses(tone) {
  if (tone === "critical" || tone === "high") {
    return "border-risk-red/40 bg-canvas text-risk-red";
  }
  if (tone === "moderate") {
    return "border-risk-amber/40 bg-canvas text-risk-amber";
  }
  if (tone === "low") {
    return "border-risk-green/40 bg-canvas text-risk-green";
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
    return "#dc2626"; // risk-red
  }
  if (tone === "moderate") {
    return "#d97706"; // risk-amber
  }
  if (tone === "low") {
    return "#16a34a"; // risk-green
  }
  return "#6ea3d8"; // accent
}

function getSignalColorInfo(val, maxVal) {
  if (typeof val !== "number" || isNaN(val) || !maxVal) {
    return { barBg: "bg-dim", text: "text-dim", pct: 0 };
  }
  const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
  if (pct > 70) {
    return { barBg: "bg-risk-red", text: "text-risk-red", pct };
  }
  if (pct > 40) {
    return { barBg: "bg-risk-amber", text: "text-risk-amber", pct };
  }
  return { barBg: "bg-risk-green", text: "text-risk-green", pct };
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

  // SVG Circular Gauge Calculations (Radius = 32, Circumference ≈ 201.06)
  const CIRCLE_CIRCUMFERENCE = 201.06;
  const scoreDashOffset = scoreValid
    ? CIRCLE_CIRCUMFERENCE -
      (CIRCLE_CIRCUMFERENCE * Math.min(100, Math.max(0, rawScore))) / 100
    : CIRCLE_CIRCUMFERENCE;

  return (
    <section className="flex min-h-[220px] flex-col rounded-lg border border-edge bg-surface p-4">
      {/* Card Header */}
      <header className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">Score Breakdown</h2>
            <p className="mt-0.5 text-xs text-dim">
              Signals contributing to the overall risk score
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClasses}`}
          >
            {severity.label}
          </span>
        </div>
      </header>

      {/* Overall Score Section — Circular Gauge & Explanation */}
      <div className="mb-4 flex flex-wrap items-center gap-3.5 rounded-lg border border-edge bg-canvas p-3">
        {/* Circular Ring Gauge */}
        <div className="relative flex shrink-0 items-center justify-center">
          <svg width="74" height="74" viewBox="0 0 80 80" className="-rotate-90">
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke="currentColor"
              strokeWidth="5"
              fill="transparent"
              className="text-edge"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke={scoreHex}
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={scoreDashOffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={`text-xl font-bold font-mono leading-none ${scoreColorClass}`}>
              {scoreDisplay}
            </span>
            <span className="mt-0.5 font-mono text-[10px] leading-none text-dim">/ 100</span>
          </div>
        </div>

        {/* Short Plain-Language Explanation */}
        <div className="flex flex-1 flex-col justify-center min-w-[130px]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-dim mb-0.5">
            Threat Assessment
          </span>
          <p className="text-xs leading-relaxed text-dim">
            {scoreExplanation(rawScore)}
          </p>
        </div>
      </div>

      {/* Signal Breakdown Header with Color Legend */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink">Signal Breakdown</span>
        <div className="flex items-center gap-2 text-[10px] text-dim">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-red" />
            High
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-amber" />
            Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-green" />
            Low
          </span>
        </div>
      </div>

      {/* Quadrant Risk Breakdown Rows */}
      <div className="flex flex-1 flex-col justify-between gap-2.5">
        {QUADRANT_CONFIG.map(({ key, label, max, icon }) => {
          const val = quadrantsData[key];
          const hasVal = typeof val === "number" && !isNaN(val);
          const colorInfo = getSignalColorInfo(val, max);
          const barWidthPercent = hasVal ? colorInfo.pct : 0;

          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex min-w-0 items-center gap-1.5 text-ink">
                  <span className="shrink-0 text-dim">{icon}</span>
                  <span className="truncate font-medium">{label}</span>
                </div>
                <div className="shrink-0 font-mono text-xs">
                  {hasVal ? (
                    <>
                      <span className={`font-semibold ${colorInfo.text}`}>{val}</span>
                      <span className="text-dim"> / {max} pts</span>
                    </>
                  ) : (
                    <span className="text-dim">—</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${colorInfo.barBg}`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
