const PROTOCOLS = [
  {
    key: "spf",
    name: "SPF",
    fullName: "Sender Policy Framework",
    description: "Verifies sending host authorization against domain MX/SPF records.",
  },
  {
    key: "dkim",
    name: "DKIM",
    fullName: "DomainKeys Identified Mail",
    description: "Validates cryptographic signature integrity against domain public key.",
  },
  {
    key: "dmarc",
    name: "DMARC",
    fullName: "Domain Alignment Policy",
    description: "Enforces alignment of SPF/DKIM authentication with sender domain policy.",
    isPolicy: true,
  },
];

function normalizeStatus(raw) {
  const value = String(raw ?? "").trim();
  const key = value.toLowerCase();

  if (key === "pass") {
    return { key: "pass", label: "Pass", tone: "pass" };
  }
  if (key === "fail") {
    return { key: "fail", label: "Fail", tone: "fail" };
  }
  if (key === "softfail") {
    return { key: "softfail", label: "Soft fail", tone: "warn" };
  }
  if (key === "neutral") {
    return { key: "neutral", label: "Neutral", tone: "neutral" };
  }
  if (key === "none") {
    return { key: "none", label: "None", tone: "neutral" };
  }
  if (key === "unknown" || key === "") {
    return { key: "unknown", label: "Unknown", tone: "neutral" };
  }

  return { key, label: value, tone: "neutral" };
}

function toneClasses(tone) {
  if (tone === "pass") {
    return {
      bar: "bg-risk-green",
      badge: "border-risk-green/30 bg-risk-green/10 text-risk-green",
      text: "text-risk-green",
    };
  }
  if (tone === "fail") {
    return {
      bar: "bg-risk-red",
      badge: "border-risk-red/30 bg-risk-red/10 text-risk-red",
      text: "text-risk-red",
    };
  }
  if (tone === "warn") {
    return {
      bar: "bg-risk-amber",
      badge: "border-risk-amber/30 bg-risk-amber/10 text-risk-amber",
      text: "text-risk-amber",
    };
  }
  return {
    bar: "bg-dim/40",
    badge: "border-edge bg-canvas text-dim",
    text: "text-dim",
  };
}

function StatusIcon({ tone }) {
  const common = {
    width: 11,
    height: 11,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (tone === "pass") {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (tone === "fail") {
    return (
      <svg {...common}>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  if (tone === "warn") {
    return (
      <svg {...common}>
        <path d="M12 8v5M12 16h.01" />
        <path d="M10.3 4.9 2.6 18.2A2 2 0 0 0 4.3 21h15.4a2 2 0 0 0 1.7-2.8L13.7 4.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function summaryCopy(results) {
  const failed = results.filter((item) => item.status.tone === "fail").length;
  const passed = results.filter((item) => item.status.tone === "pass").length;
  const warn = results.filter((item) => item.status.tone === "warn").length;
  const other = results.length - failed - passed - warn;

  if (failed === results.length) {
    return `${failed}/${results.length} failed`;
  }
  if (passed === results.length) {
    return `${passed}/${results.length} passed`;
  }

  const parts = [];
  if (failed > 0) parts.push(`${failed} failed`);
  if (passed > 0) parts.push(`${passed} passed`);
  if (warn > 0) parts.push(`${warn} soft fail`);
  if (other > 0) parts.push(`${other} inconclusive`);
  return parts.join(" · ");
}

export default function AuthStatusCard({ data, masked: _masked }) {
  const authentication = data?.authentication ?? {};
  const results = PROTOCOLS.map((protocol) => ({
    ...protocol,
    rawVal: authentication[protocol.key],
    status: normalizeStatus(authentication[protocol.key]),
  }));
  const failed = results.filter((item) => item.status.tone === "fail").length;
  const allFailed = failed === results.length;
  const noneFailed = failed === 0;

  return (
    <section className="flex min-h-[220px] flex-col rounded-lg border border-edge bg-surface p-4">
      <header className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">Authentication Status</h2>
            <p className="mt-0.5 text-xs text-dim">SPF / DKIM / DMARC verification</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs font-medium ${
              allFailed
                ? "border-risk-red/40 bg-canvas text-risk-red"
                : noneFailed
                  ? "border-risk-green/40 bg-canvas text-risk-green"
                  : "border-risk-amber/40 bg-canvas text-risk-amber"
            }`}
          >
            {failed}/{results.length} failed
          </span>
        </div>
      </header>

      <ul className="flex flex-1 flex-col gap-1.5">
        {results.map((item) => {
          const colors = toneClasses(item.status.tone);
          const isDmarc = item.isPolicy;

          return (
            <li
              key={item.key}
              className={`group relative flex flex-col rounded-md border bg-canvas transition-all duration-200 ease-in-out hover:border-accent/40 hover:bg-canvas/90 ${
                isDmarc ? "mt-1 border-edge/90" : "border-edge"
              }`}
            >
              {/* Compact Default Header Row */}
              <div className="flex items-center justify-between gap-2.5 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.bar}`} />
                  <span className="font-mono text-xs font-semibold text-ink">
                    {item.name}
                  </span>
                  <span className="hidden truncate text-[11px] text-dim sm:inline">
                    {item.fullName}
                  </span>
                  {isDmarc && (
                    <span className="rounded border border-edge bg-surface px-1.5 py-0.2 font-mono text-[9px] uppercase text-accent/90">
                      Policy
                    </span>
                  )}
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${colors.badge}`}
                >
                  <StatusIcon tone={item.status.tone} />
                  {item.status.label}
                </span>
              </div>

              {/* Smooth Hover-Revealed Forensic Detail Drawer */}
              <div className="grid grid-rows-[0fr] transition-all duration-200 ease-in-out group-hover:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <div className="border-t border-edge/40 bg-surface/50 px-3 py-2 text-xs">
                    <p className="text-[11px] leading-relaxed text-dim">
                      {item.description}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-dim/90">
                      <span>
                        Result: <strong className={colors.text}>{item.status.label.toUpperCase()}</strong>
                      </span>
                      <span>Field: authentication.{item.key}</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-edge/50 pt-2 text-xs font-mono text-dim">
        <span>Verification Telemetry</span>
        <span className={allFailed ? "text-risk-red font-semibold" : noneFailed ? "text-risk-green font-semibold" : "text-risk-amber"}>
          {summaryCopy(results)}
        </span>
      </div>
    </section>
  );
}
