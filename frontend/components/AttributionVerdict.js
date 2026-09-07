function getAttributionVerdict(data) {
  const auth = data?.authentication || {};
  const spf = String(auth.spf || "").toLowerCase();
  const dkim = String(auth.dkim || "").toLowerCase();
  const dmarc = String(auth.dmarc || "").toLowerCase();
  const authFailed =
    spf === "fail" ||
    dkim === "fail" ||
    dmarc === "fail" ||
    spf === "softfail";
  const authAllPassed = spf === "pass" && dkim === "pass" && dmarc === "pass";

  const typosquat = data?.iocs?.typosquat_target;
  const traceHops = Array.isArray(data?.trace) ? data.trace : [];
  const infraNoteFound = traceHops.some((hop) => {
    const note = String(hop?.note || "").toLowerCase();
    return /datacenter|hosting|bulletproof|proxy|vpn|tor|anonymized|flagged/i.test(
      note
    );
  });

  const nlpScore = data?.quadrants?.nlp_language ?? 0;
  const repScore = data?.quadrants?.reputation ?? 0;
  const elevatedRisk = nlpScore > 12 || repScore > 6;

  // Priority 1 — Spoofed Domain
  if (authFailed && typosquat) {
    return {
      title: `Likely spoofed domain impersonating ${typosquat}`,
      explanation:
        "Authentication failures combined with a detected lookalike domain.",
      tone: "red",
    };
  }

  // Priority 2 — Anonymized / Hosting Infrastructure
  if (infraNoteFound) {
    return {
      title: "Anonymized / hosting infrastructure",
      explanation:
        "Origin infrastructure may obscure the attacker's direct identity.",
      tone: "red",
    };
  }

  // Priority 3 — Likely Compromised Legitimate Account
  if (authAllPassed && elevatedRisk) {
    return {
      title: "Likely compromised legitimate account",
      explanation:
        "Authentication appears legitimate, but other signals indicate suspicious activity.",
      tone: "amber",
    };
  }

  // Priority 4 — All Clear
  return {
    title: "No attribution concerns",
    explanation:
      "No strong attribution indicators were detected from the available signals.",
    tone: "green",
  };
}

function toneClasses(tone) {
  if (tone === "red") {
    return {
      badge: "border-risk-red/40 bg-risk-red/10 text-risk-red",
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    };
  }
  if (tone === "amber") {
    return {
      badge: "border-risk-amber/40 bg-risk-amber/10 text-risk-amber",
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    };
  }
  return {
    badge: "border-risk-green/40 bg-risk-green/10 text-risk-green",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  };
}

export default function AttributionVerdict({ data, masked: _masked }) {
  const verdict = getAttributionVerdict(data);
  const styles = toneClasses(verdict.tone);

  return (
    <section className="group relative flex min-w-0 flex-col rounded-lg border border-edge bg-surface p-4 transition-all duration-200 hover:border-accent/40 hover:bg-surface/90">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
          Attribution Verdict
        </span>
        <span className="shrink-0 font-mono text-[10px] text-dim/70">Origin Telemetry</span>
      </div>

      <div className="mt-1 flex min-w-0">
        <div
          className={`inline-flex max-w-full min-w-0 items-start gap-2 rounded-md border px-3 py-1.5 font-mono text-xs font-semibold ${styles.badge}`}
        >
          <span className="mt-0.5 shrink-0">{styles.icon}</span>
          <span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]">
            {verdict.title}
          </span>
        </div>
      </div>

      <p className="mt-2 break-words text-xs leading-relaxed text-dim">{verdict.explanation}</p>

      {/* Smooth Hover Drawer */}
      <div className="grid grid-rows-[0fr] transition-all duration-200 ease-in-out group-hover:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="mt-2 break-words border-t border-edge/40 pt-2 font-mono text-[10px] text-dim/80">
            Derived from authentication, routing, reputation and domain signals.
          </div>
        </div>
      </div>
    </section>
  );
}
