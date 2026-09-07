'use client';

import { useState, useRef, useEffect } from "react";

function maskEmail(email) {
  if (!email || typeof email !== "string") return "[REDACTED]";
  const [local, domain] = email.split("@");
  if (!domain) return "[REDACTED]";
  const maskedLocal =
    local.length > 2
      ? `${local[0]}***${local[local.length - 1]}`
      : `${local[0] || ""}***`;
  const domainParts = domain.split(".");
  const maskedDomain =
    domainParts.length > 1
      ? `${domainParts[0][0] || ""}***.${domainParts.slice(1).join(".")}`
      : `${domain[0] || ""}***`;
  return `${maskedLocal}@${maskedDomain}`;
}

function maskName(name) {
  if (!name || typeof name !== "string") return "[REDACTED]";
  return name
    .split(" ")
    .map((word) => (word.length > 1 ? `${word[0]}***` : `${word}***`))
    .join(" ");
}

function maskIp(ip) {
  if (!ip || typeof ip !== "string") return "[REDACTED]";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return "[MASKED_IP]";
}

function sanitizeReport(data, isMasked) {
  if (!data) return {};
  if (!isMasked) return data;

  return {
    ...data,
    sender: {
      name: maskName(data.sender?.name),
      email: maskEmail(data.sender?.email),
    },
    trace: Array.isArray(data.trace)
      ? data.trace.map((hop) => ({
          ...hop,
          ip: maskIp(hop.ip),
        }))
      : [],
    iocs: {
      ...data.iocs,
      artifacts: Array.isArray(data.iocs?.artifacts)
        ? data.iocs.artifacts.map(() => "[REDACTED_IOC]")
        : [],
    },
    relationships: {
      nodes: Array.isArray(data.relationships?.nodes)
        ? data.relationships.nodes.map((node) => {
            if (node.type === "ip") {
              return { ...node, label: maskIp(node.label) };
            }
            if (node.type === "email") {
              return { ...node, label: maskEmail(node.label) };
            }
            return node;
          })
        : [],
      edges: data.relationships?.edges || [],
    },
  };
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function generateDossierText(data, isMasked) {
  const sanitized = sanitizeReport(data, isMasked);
  const now = new Date().toISOString();
  const filename = data?.filename || "unknown_sample.eml";
  const size = data?.file_size_kb ?? 0;
  const sha = data?.sha256 || "N/A";
  const classification = (data?.classification || "UNKNOWN").toUpperCase();
  const riskScore = data?.risk_score ?? "N/A";
  const privacyMode = isMasked ? "MASKED / REDACTED" : "FULL DISCLOSURE";

  const hops = Array.isArray(sanitized.trace)
    ? sanitized.trace
        .map(
          (h) =>
            `  Hop #${h.hop_order}: ${h.ip} | ${h.place} | Note: ${h.note || "None"}`
        )
        .join("\n")
    : "  No trace hops available";

  const artifacts =
    Array.isArray(sanitized.iocs?.artifacts) && sanitized.iocs.artifacts.length > 0
      ? sanitized.iocs.artifacts.join(", ")
      : "None detected";

  return `================================================================================
             EMAIL THREAT INTELLIGENCE & FORENSIC DOSSIER
================================================================================
Generated At       : ${now}
Original Filename  : ${filename} (${size} KB)
SHA-256 Hash       : ${sha}
Classification     : ${classification}
Risk Score         : ${riskScore} / 100
Privacy View Mode  : ${privacyMode}
--------------------------------------------------------------------------------

[SENDER IDENTIFICATION]
Name               : ${sanitized.sender?.name || "N/A"}
Email              : ${sanitized.sender?.email || "N/A"}

[AUTHENTICATION VERDICTS]
SPF                : ${(data?.authentication?.spf || "N/A").toUpperCase()}
DKIM               : ${(data?.authentication?.dkim || "N/A").toUpperCase()}
DMARC              : ${(data?.authentication?.dmarc || "N/A").toUpperCase()}

[RISK QUADRANTS]
Header & Routing   : ${data?.quadrants?.header_routing ?? "N/A"} / 30
Auth Failure       : ${data?.quadrants?.auth_failure ?? "N/A"} / 30
NLP & Language     : ${data?.quadrants?.nlp_language ?? "N/A"} / 30
Reputation Score   : ${data?.quadrants?.reputation ?? "N/A"} / 30

[NETWORK TRACE HOPS]
${hops}

[INDICATORS OF COMPROMISE (IOCs)]
Domain Age         : ${data?.iocs?.domain_age_days ? `${data.iocs.domain_age_days} days` : "N/A"}
Typosquat Target   : ${data?.iocs?.typosquat_target || "None"}
Observed Artifacts : ${artifacts}

[NLP & LANGUAGE FINDINGS]
${Array.isArray(sanitized.nlp_findings) && sanitized.nlp_findings.length > 0
  ? sanitized.nlp_findings
      .map(
        (f) =>
          `  - [${(f.label || "FLAG").toUpperCase()}] "${f.phrase}" (Confidence: ${Math.round((f.confidence ?? 0) * 100)}%)`
      )
      .join("\n")
  : "  No adversarial NLP patterns identified"}

================================================================================
                           END OF FORENSIC DOSSIER
================================================================================`;
}

export default function ReportButton({ data, masked }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportedStatus, setExportedStatus] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerFeedback = (formatLabel) => {
    setExportedStatus(formatLabel);
    setTimeout(() => {
      setExportedStatus(null);
    }, 2000);
  };

  const handleExportJson = () => {
    if (!data) return;
    const baseName = data.filename ? data.filename.replace(/\.[^/.]+$/, "") : "threat_sample";
    const modeSuffix = masked ? "masked" : "full";
    const fileName = `${baseName}_forensic_report_${modeSuffix}.json`;

    const payload = {
      report_metadata: {
        platform: "Email Threat Intelligence & Forensic Platform",
        generated_at: new Date().toISOString(),
        privacy_mode: masked ? "MASKED_VIEW" : "FULL_DISCLOSURE",
        sha256: data.sha256 || null,
      },
      forensic_analysis: sanitizeReport(data, masked),
    };

    downloadFile(JSON.stringify(payload, null, 2), fileName, "application/json");
    triggerFeedback("JSON");
    setMenuOpen(false);
  };

  const handleExportDossier = () => {
    if (!data) return;
    const baseName = data.filename ? data.filename.replace(/\.[^/.]+$/, "") : "threat_sample";
    const modeSuffix = masked ? "masked" : "full";
    const fileName = `${baseName}_forensic_dossier_${modeSuffix}.txt`;

    const text = generateDossierText(data, masked);
    downloadFile(text, fileName, "text/plain");
    triggerFeedback("Dossier");
    setMenuOpen(false);
  };

  const handlePrint = () => {
    setMenuOpen(false);
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <div className="inline-flex items-center rounded-lg border border-edge bg-surface">
        <button
          type="button"
          onClick={handleExportJson}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink transition-colors hover:text-accent focus:outline-none"
          title="Quick export report as JSON"
        >
          {exportedStatus ? (
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
                className="text-risk-green"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-medium text-risk-green">{exportedStatus} Saved!</span>
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export Report</span>
            </>
          )}
        </button>

        <div className="h-4 w-px bg-edge" />

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="px-2 py-2 text-xs text-dim transition-colors hover:text-ink focus:outline-none"
          aria-expanded={menuOpen}
          aria-label="Select export format"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-lg border border-edge bg-surface py-1 shadow-lg shadow-canvas/50">
          <div className="border-b border-edge px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-dim">
            Export Options {masked ? "(Masked)" : ""}
          </div>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink transition-colors hover:bg-canvas hover:text-accent"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-dim"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div>
              <div className="font-medium">JSON Report</div>
              <div className="text-[10px] text-dim">Full structured analysis</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportDossier}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink transition-colors hover:bg-canvas hover:text-accent"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-dim"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <div>
              <div className="font-medium">Forensic Dossier</div>
              <div className="text-[10px] text-dim">Human-readable .txt</div>
            </div>
          </button>

          <div className="my-1 border-t border-edge" />

          <button
            type="button"
            onClick={handlePrint}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink transition-colors hover:bg-canvas hover:text-accent"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-dim"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <div>
              <div className="font-medium">Print / PDF</div>
              <div className="text-[10px] text-dim">Browser print preview</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
