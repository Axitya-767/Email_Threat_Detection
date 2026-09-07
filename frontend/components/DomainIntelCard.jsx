'use client';

function getDomainAgeBadge(days) {
  if (typeof days !== "number" || isNaN(days)) {
    return {
      label: "Unknown age",
      badgeClass: "border-edge bg-canvas text-dim",
    };
  }
  if (days < 30) {
    return {
      label: "Newly registered",
      badgeClass: "border-risk-red/40 bg-canvas text-risk-red",
    };
  }
  if (days < 180) {
    return {
      label: "Recent (<180d)",
      badgeClass: "border-risk-amber/40 bg-canvas text-risk-amber",
    };
  }
  return {
    label: "Established",
    badgeClass: "border-risk-green/40 bg-canvas text-risk-green",
  };
}

export default function DomainIntelCard({ data, masked: _masked }) {
  // Domain data is not personal (investigator or victim PII), so masked prop requires no redaction
  const iocs = data?.iocs ?? {};
  const domainAge = iocs.domain_age_days;
  const hasAge = typeof domainAge === "number" && !isNaN(domainAge);
  const ageBadge = getDomainAgeBadge(domainAge);
  const typosquatTarget = iocs.typosquat_target;

  // Extract domain from sender email for context if available
  const senderEmail = data?.sender?.email || "";
  const senderDomain = senderEmail.includes("@") ? senderEmail.split("@")[1] : null;

  return (
    <section className="flex min-h-[220px] flex-col rounded-lg border border-edge bg-surface p-4">
      {/* Card Header */}
      <header className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">Domain Intelligence</h2>
            <p className="mt-0.5 text-xs text-dim">Registration & lookalike analysis</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${ageBadge.badgeClass}`}
          >
            {ageBadge.label}
          </span>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 flex-col gap-2.5">
        {/* Domain Registration Age Block */}
        <div className="rounded-lg border border-edge bg-canvas px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-dim">Domain Age</span>
            {senderDomain && (
              <span className="truncate text-dim font-mono text-[11px] max-w-[140px]">
                {senderDomain}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-base font-semibold text-ink">
              {hasAge ? domainAge.toLocaleString() : "—"}
            </span>
            <span className="text-xs text-dim">
              {hasAge ? (domainAge === 1 ? "day active" : "days active") : "telemetry unavailable"}
            </span>
          </div>
        </div>

        {/* Impersonation / Typosquatting Check Block */}
        <div className="mt-auto rounded-lg border border-edge bg-canvas px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wider text-dim">
            Lookalike Detection
          </div>
          <div className="mt-1 flex items-start gap-2 text-xs">
            {typosquatTarget ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-risk-red"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-risk-red">
                    Impersonating:{" "}
                    <span className="font-mono underline decoration-risk-red/40">
                      {typosquatTarget}
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-risk-green"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="text-dim">No known impersonation detected</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
