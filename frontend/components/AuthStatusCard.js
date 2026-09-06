const PROTOCOLS = [
  {
    key: "spf",
    name: "SPF",
    fullName: "Sender Policy Framework",
    description: "Checks whether the sending host is authorized for the claimed domain.",
  },
  {
    key: "dkim",
    name: "DKIM",
    fullName: "DomainKeys Identified Mail",
    description: "Verifies the message cryptographic signature against the domain key.",
  },
  {
    key: "dmarc",
    name: "DMARC",
    fullName: "Domain-based Message Authentication",
    description: "Aligns SPF/DKIM results with the domain’s published policy.",
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
      pip: "bg-risk-green",
      badge: "border-risk-green/40 bg-canvas text-risk-green",
      bar: "bg-risk-green",
    };
  }
  if (tone === "fail") {
    return {
      pip: "bg-risk-red",
      badge: "border-risk-red/40 bg-canvas text-risk-red",
      bar: "bg-risk-red",
    };
  }
  if (tone === "warn") {
    return {
      pip: "bg-risk-amber",
      badge: "border-risk-amber/40 bg-canvas text-risk-amber",
      bar: "bg-risk-amber",
    };
  }
  return {
    pip: "bg-dim",
    badge: "border-edge bg-canvas text-dim",
    bar: "bg-dim",
  };
}

function StatusIcon({ tone }) {
  const common = {
    width: 12,
    height: 12,
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
    return `${failed} of ${results.length} authentication checks failed`;
  }
  if (passed === results.length) {
    return `All ${results.length} authentication checks passed`;
  }

  const parts = [];
  if (failed > 0) parts.push(`${failed} failed`);
  if (passed > 0) parts.push(`${passed} passed`);
  if (warn > 0) parts.push(`${warn} soft fail`);
  if (other > 0) parts.push(`${other} inconclusive`);
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return `${results.length} authentication checks with no result`;
}

export default function AuthStatusCard({ data, masked: _masked }) {
  const authentication = data?.authentication ?? {};
  const results = PROTOCOLS.map((protocol) => ({
    ...protocol,
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
            <p className="mt-0.5 text-xs text-dim">SPF / DKIM / DMARC checks</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
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

      <ul className="flex flex-1 flex-col gap-2">
        {results.map((item) => {
          const colors = toneClasses(item.status.tone);
          return (
            <li
              key={item.key}
              className="flex items-stretch gap-3 rounded-lg border border-edge bg-canvas px-3 py-2"
            >
              <span className={`w-0.5 shrink-0 self-stretch rounded-full ${colors.bar}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.pip}`} />
                    <span className="text-sm font-medium text-ink">{item.name}</span>
                    <span className="hidden truncate text-xs text-dim sm:inline">
                      {item.fullName}
                    </span>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${colors.badge}`}
                  >
                    <StatusIcon tone={item.status.tone} />
                    {item.status.label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug text-dim">{item.description}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className={`mt-3 text-xs ${allFailed ? "text-risk-red" : noneFailed ? "text-risk-green" : "text-dim"}`}>
        {summaryCopy(results)}
      </p>
    </section>
  );
}
