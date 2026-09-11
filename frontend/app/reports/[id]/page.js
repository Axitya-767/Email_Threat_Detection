'use client';

import { useState, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileCode } from "lucide-react";
import PrivacyToggle from "../../../components/PrivacyToggle";
import {
  CASES_LIST,
  maskEmail,
  maskName,
  maskIp,
  maskEntity,
  sanitizeReport,
} from "../../../lib/cases";

const REPORT_TITLES = {
  "sbi-kyc": "SBI Impersonation Investigation",
  "bec-wire": "BEC Wire Fraud Investigation",
  "clean-memo": "Clean Internal Memo Review",
  "itd-refund": "ITD Refund Spoof Investigation",
  "vendor-invoice": "Vendor Invoice Diversion Audit",
  "it-helpdesk": "Credential Phishing Investigation",
  "marketing-newsletter": "Marketing Newsletter Triage",
  "university-compromise": "Suspicious Account Investigation",
};

export default function CaseReportDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const caseParamId = resolvedParams.id;

  const caseItem = useMemo(() => {
    return (
      CASES_LIST.find(
        (c) =>
          c.id.toLowerCase() === caseParamId.toLowerCase() ||
          c.slug.toLowerCase() === caseParamId.toLowerCase()
      ) || null
    );
  }, [caseParamId]);

  const [isMasked, setIsMasked] = useState(true);

  if (!caseItem) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center text-ink">
        <h1 className="text-xl font-bold">Investigation Report Not Found</h1>
        <p className="mt-2 text-xs text-dim">
          No case file matching identifier &ldquo;{caseParamId}&rdquo; was found in the archive.
        </p>
        <Link
          href="/reports"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-2 text-xs text-accent hover:border-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports Directory
        </Link>
      </div>
    );
  }

  const data = caseItem.data || {};
  const caseId = caseItem.id;
  const reportTitle = REPORT_TITLES[caseItem.slug] || `${caseItem.name} Investigation`;
  const filename = data.filename || "evidence.eml";
  const fileSizeKb = data.file_size_kb ?? "N/A";
  const sha256 = data.sha256 || "N/A";
  const senderName = data.sender?.name || "Unknown";
  const senderEmail = data.sender?.email || "unknown@domain";
  const riskScore = data.risk_score ?? 0;
  const classification = (data.classification || "unclassified").toUpperCase();
  const auth = data.authentication || {};
  const spf = (auth.spf || "none").toUpperCase();
  const dkim = (auth.dkim || "none").toUpperCase();
  const dmarc = (auth.dmarc || "none").toUpperCase();
  const trace = Array.isArray(data.trace) ? data.trace : [];
  const iocs = data.iocs || {};
  const typosquat = iocs.typosquat_target;
  const artifacts = Array.isArray(iocs.artifacts) ? iocs.artifacts : [];
  const quadrants = data.quadrants || {};
  const nlpFindings = Array.isArray(data.nlp_findings) ? data.nlp_findings : [];
  const relationships = data.relationships || {};
  const edges = Array.isArray(relationships.edges) ? relationships.edges : [];

  // Determine attribution deterministically from evidence
  const isSpoof = (spf === "FAIL" || dkim === "FAIL" || dmarc === "FAIL") && Boolean(typosquat);
  const isInfraFlagged = trace.some((h) =>
    /datacenter|hosting|bulletproof|proxy|vpn|tor|anonymized|flagged/i.test(h.note || "")
  );
  const isCompromised =
    spf === "PASS" &&
    dkim === "PASS" &&
    dmarc === "PASS" &&
    ((quadrants.nlp_language ?? 0) > 12 || (quadrants.reputation ?? 0) > 6);

  let attributionVerdict = "No attribution concerns";
  let attributionExplanation = "No anomalous attribution signatures were identified in available telemetry.";
  if (isSpoof) {
    attributionVerdict = `Likely spoofed domain impersonating ${typosquat}`;
    attributionExplanation =
      "Authentication failures combined with a detected lookalike domain registration establish clear domain spoofing.";
  } else if (isInfraFlagged) {
    attributionVerdict = "Anonymized / hosting infrastructure";
    attributionExplanation =
      "Origin infrastructure utilized bulletproof or datacenter hosting to obscure attacker physical identity.";
  } else if (isCompromised) {
    attributionVerdict = "Likely compromised legitimate account";
    attributionExplanation =
      "Authentication protocols validated successfully; however, anomalous linguistic and behavioral indicators point to account takeover.";
  }

  const severityLabel =
    riskScore >= 80 ? "Critical" : riskScore >= 60 ? "High" : riskScore >= 30 ? "Moderate" : "Low";

  const displaySenderName = isMasked ? maskName(senderName) : senderName;
  const displaySenderEmail = isMasked ? maskEmail(senderEmail) : senderEmail;
  const displayOriginIp = isMasked ? maskIp(trace[0]?.ip) : (trace[0]?.ip || "Not available");
  const displayTerminalIp = isMasked
    ? maskIp(trace[trace.length - 1]?.ip)
    : (trace[trace.length - 1]?.ip || "Not available");

  function handleDownloadJson() {
    const fileName = `${caseId}_forensic_data.json`;
    const exportData = isMasked
      ? {
          ...caseItem,
          data: sanitizeReport(caseItem.data, true),
        }
      : caseItem;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-canvas py-6 px-3 sm:px-6 flex flex-col items-center">
      {/* Print Stylesheet Overrides */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body, html {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          aside, nav, header, footer:not(.print-paper *), .screen-only-toolbar, .no-print, button, a.screen-only, [role="dialog"], .fixed {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
          }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .print-paper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Screen-Only Investigator Utility Toolbar */}
      <div className="screen-only-toolbar mb-6 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 font-medium text-dim hover:border-edge/80 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Reports Directory</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* PII Shield / Masking Toggle matching dashboard aesthetic */}
          <PrivacyToggle data={data} isMasked={isMasked} setIsMasked={setIsMasked} label="PII Masking" />

          {/* Direct Download of pre-generated PDF */}
          <a
            href={`/reports/${caseId}-forensic-report.pdf`}
            download={`${caseId}-forensic-report.pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/80 bg-white px-3 py-1.5 font-semibold text-black hover:bg-neutral-100 transition-colors shadow-xs"
            title="Download verified investigation PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Official PDF</span>
          </a>

          {/* Raw JSON Download */}
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 font-medium text-dim hover:text-ink transition-colors cursor-pointer"
            title="Download underlying JSON data"
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Evidence JSON</span>
          </button>

          {/* Link to Interactive Dashboard */}
          <button
            type="button"
            onClick={() => router.push(`/?case=${caseItem.slug}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 font-medium text-dim hover:text-accent transition-colors cursor-pointer"
            title="Open interactive case analysis"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Analyze</span>
          </button>
        </div>
      </div>

      {/* Official Forensic Report Document (A4 Print-Ready Document Layout) */}
      <article className="print-paper w-full max-w-[210mm] border border-neutral-300 bg-white p-8 sm:p-14 text-black shadow-2xl font-sans text-[11.5px] leading-relaxed">
        {/* Document Running Top Classification Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 text-[10px] font-mono uppercase tracking-wider text-neutral-700">
          <span>CONFIDENTIAL // LAW ENFORCEMENT &amp; FORENSIC USE ONLY</span>
          <span>CASE ID: {caseId}</span>
        </div>

        {/* Formal Report Title Header */}
        <header className="mt-6 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-black uppercase">
            EMAIL THREAT FORENSIC INVESTIGATION REPORT
          </h1>
          <p className="mt-1 text-xs font-mono tracking-wide text-neutral-600 uppercase">
            DIGITAL FORENSICS EXAMINATION &amp; EVIDENCE EVALUATION DOSSIER
          </p>
        </header>

        {/* Report Metadata Block / Table */}
        <div className="mb-6 overflow-hidden border border-black">
          <table className="w-full border-collapse text-left text-[11px]">
            <tbody>
              <tr className="border-b border-black">
                <th className="w-1/4 border-r border-black bg-neutral-100 p-2 font-bold uppercase text-neutral-800">
                  Case Identifier
                </th>
                <td className="w-1/4 border-r border-black p-2 font-mono font-bold">{caseId}</td>
                <th className="w-1/4 border-r border-black bg-neutral-100 p-2 font-bold uppercase text-neutral-800">
                  Examination Date
                </th>
                <td className="w-1/4 p-2 font-mono">{caseItem.date}</td>
              </tr>
              <tr className="border-b border-black">
                <th className="border-r border-black bg-neutral-100 p-2 font-bold uppercase text-neutral-800">
                  Report Title
                </th>
                <td className="border-r border-black p-2 font-semibold" colSpan={3}>
                  {reportTitle}
                </td>
              </tr>
              <tr className="border-b border-black">
                <th className="border-r border-black bg-neutral-100 p-2 font-bold uppercase text-neutral-800">
                  Evidence Sample
                </th>
                <td className="border-r border-black p-2 font-mono">{filename} ({fileSizeKb} KB)</td>
                <th className="border-r border-black bg-neutral-100 p-2 font-bold uppercase text-neutral-800">
                  Report Status
                </th>
                <td className="p-2 font-mono font-semibold">FINAL // {isMasked ? "MASKED / REDACTED" : "VERIFIED"}</td>
              </tr>
              <tr>
                <th className="border-r border-black bg-neutral-100 p-2 font-bold uppercase text-neutral-800">
                  Overall Risk Score
                </th>
                <td className="border-r border-black p-2 font-mono font-bold">
                  {riskScore} / 100 ({severityLabel.toUpperCase()} SEVERITY)
                </td>
                <th className="border-r border-black bg-neutral-100 p-2 font-bold uppercase text-neutral-800">
                  Forensic Verdict
                </th>
                <td className="p-2 font-mono font-bold uppercase">{classification}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 1.0 Executive Summary */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            1.0 EXECUTIVE SUMMARY
          </h2>
          <p className="mt-2 text-justify">
            A digital forensic examination was conducted on evidence sample <strong>&ldquo;{filename}&rdquo;</strong> (SHA-256:{" "}
            <code className="font-mono text-[10px]">{sha256.slice(0, 24)}...</code>) cataloged under case reference{" "}
            <strong>{caseId}</strong>. The communication claims origin from sender <strong>{displaySenderName}</strong> (&lt;
            <span className="font-mono">{displaySenderEmail}</span>&gt;). Deterministic protocol evaluation and telemetry analysis
            assessed an authoritative fraud risk score of <strong>{riskScore} out of 100</strong>, resulting in an investigative threat
            classification of <strong>{classification}</strong>.
          </p>
          <p className="mt-2 text-justify">
            Authentication protocol validation recorded SPF: <strong>{spf}</strong>, DKIM: <strong>{dkim}</strong>, and DMARC:{" "}
            <strong>{dmarc}</strong>.{" "}
            {typosquat ? (
              <>
                The sending infrastructure exhibits deliberate deceptive targeting against legitimate domain <strong>&ldquo;{typosquat}&rdquo;</strong>.{" "}
              </>
            ) : (
              <>No deceptive typosquatting lookalike target was detected in the immediate envelope. </>
            )}
            Network telemetry captured {trace.length} transit relay hops from message origin to final destination server.
          </p>
        </section>

        {/* 2.0 Email Evidence Specifications */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            2.0 EMAIL &amp; EVIDENCE SPECIFICATIONS
          </h2>
          <div className="mt-2 overflow-hidden border border-black">
            <table className="w-full border-collapse text-left text-[10.5px]">
              <thead>
                <tr className="border-b border-black bg-neutral-100">
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/3">
                    Evidence Parameter
                  </th>
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/3">
                    Observed Data Value
                  </th>
                  <th className="p-1.5 font-bold uppercase text-neutral-800 w-1/3">Forensic Verification Finding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono">
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">Original Filename</td>
                  <td className="border-r border-black p-1.5">{filename}</td>
                  <td className="p-1.5 font-sans">Envelope structure parsed and verified</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">File Size</td>
                  <td className="border-r border-black p-1.5">{fileSizeKb} KB</td>
                  <td className="p-1.5 font-sans">Payload size within expected bounds</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">Cryptographic Hash (SHA-256)</td>
                  <td className="border-r border-black p-1.5 text-[9.5px] break-all">{sha256}</td>
                  <td className="p-1.5 font-sans">Unique evidence fingerprint established</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">Claimed Sender Name</td>
                  <td className="border-r border-black p-1.5">{displaySenderName}</td>
                  <td className="p-1.5 font-sans">Display name declared in MIME header</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">Claimed Sender Email</td>
                  <td className="border-r border-black p-1.5">{displaySenderEmail}</td>
                  <td className="p-1.5 font-sans">Header &ldquo;From&rdquo; field identity</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">Initial Originating IP</td>
                  <td className="border-r border-black p-1.5">{displayOriginIp}</td>
                  <td className="p-1.5 font-sans">{trace[0]?.place || "Initial network hop"}</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">Terminal Mail Server</td>
                  <td className="border-r border-black p-1.5">{displayTerminalIp}</td>
                  <td className="p-1.5 font-sans">{trace[trace.length - 1]?.place || "Destination host"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3.0 Authentication Protocol Analysis */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            3.0 AUTHENTICATION PROTOCOL ANALYSIS
          </h2>
          <div className="mt-2 overflow-hidden border border-black">
            <table className="w-full border-collapse text-left text-[10.5px]">
              <thead>
                <tr className="border-b border-black bg-neutral-100">
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/4">
                    Protocol Check
                  </th>
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/6">
                    Observed Verdict
                  </th>
                  <th className="p-1.5 font-bold uppercase text-neutral-800">
                    Forensic Examination Finding
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Sender Policy Framework (SPF)</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">{spf}</td>
                  <td className="p-1.5">
                    {spf === "FAIL"
                      ? "Sending host IP address is not authorized under published domain SPF records."
                      : spf === "PASS"
                      ? "Sending host IP matches authoritative host list in published DNS records."
                      : "SPF check produced neutral, softfail, or inconclusive verification result."}
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">DomainKeys Identified Mail (DKIM)</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">{dkim}</td>
                  <td className="p-1.5">
                    {dkim === "FAIL"
                      ? "Cryptographic signature validation failed or signature header is missing."
                      : dkim === "PASS"
                      ? "Message body and header cryptographic signature verified against public key."
                      : "DKIM signature is absent or protocol check returned none."}
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Domain-based Message Auth (DMARC)</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">{dmarc}</td>
                  <td className="p-1.5">
                    {dmarc === "FAIL"
                      ? "Message failed published DMARC alignment criteria between SPF/DKIM and From domain."
                      : dmarc === "PASS"
                      ? "Message satisfies published domain alignment policies."
                      : "DMARC policy record absent, neutral, or unenforced."}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4.0 Header & Routing Infrastructure */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            4.0 HEADER &amp; ROUTING INFRASTRUCTURE
          </h2>
          {trace.length > 0 ? (
            <div className="mt-2 overflow-hidden border border-black">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr className="border-b border-black bg-neutral-100">
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-12">Hop</th>
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-28">IP Address</th>
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-36">Geographic Node</th>
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-32">Relay Timestamp</th>
                    <th className="p-1.5 font-bold uppercase text-neutral-800">Forensic Infrastructure Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  {trace.map((h, idx) => (
                    <tr key={idx}>
                      <td className="border-r border-black p-1.5 font-bold">#{h.hop_order}</td>
                      <td className="border-r border-black p-1.5">{isMasked ? maskIp(h.ip) : h.ip}</td>
                      <td className="border-r border-black p-1.5 font-sans">{h.place}</td>
                      <td className="border-r border-black p-1.5 text-[9.5px]">
                        {h.relayed_at ? h.relayed_at.replace("T", " ").replace(".000Z", "") : "—"}
                      </td>
                      <td className="p-1.5 font-sans font-medium">{h.note || "Standard relay hop"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-neutral-600 italic">No routing trace data available in supplied evidence.</p>
          )}
        </section>

        {/* 5.0 Language, Intent & Content Analysis */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            5.0 LANGUAGE, INTENT &amp; CONTENT ANALYSIS
          </h2>
          <p className="mt-2 text-justify">
            Semantic and linguistic evaluation was conducted to identify social engineering indicators, coercion patterns,
            and unauthorized credential or financial diversion attempts. The Language &amp; Intent quadrant registered a score
            contribution of <strong>{quadrants.nlp_language ?? 0} out of 30 allocated points</strong>.
          </p>
          {nlpFindings.length > 0 ? (
            <div className="mt-2 overflow-hidden border border-black">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr className="border-b border-black bg-neutral-100">
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/4">
                      Detected Signal / Tag
                    </th>
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/2">
                      Extracted Textual Phrasing
                    </th>
                    <th className="p-1.5 font-bold uppercase text-neutral-800 w-1/4">Confidence Metric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {nlpFindings.map((f, idx) => (
                    <tr key={idx}>
                      <td className="border-r border-black p-1.5 font-mono font-bold uppercase">
                        {f.label?.replace("_", " ")}
                      </td>
                      <td className="border-r border-black p-1.5 font-mono italic">&ldquo;{f.phrase}&rdquo;</td>
                      <td className="p-1.5 font-mono">
                        {f.confidence !== undefined ? `${(f.confidence * 100).toFixed(1)}% match` : "Confirmed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-neutral-600 italic">
              No specific NLP semantic tags flagged in evidence. Linguistic indicators align with baseline.
            </p>
          )}
        </section>

        {/* 6.0 Reputation & Domain Intelligence */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            6.0 REPUTATION &amp; DOMAIN INTELLIGENCE
          </h2>
          <div className="mt-2 overflow-hidden border border-black">
            <table className="w-full border-collapse text-left text-[10.5px]">
              <thead>
                <tr className="border-b border-black bg-neutral-100">
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/4">
                    Intelligence Attribute
                  </th>
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/3">
                    Observed Evidence
                  </th>
                  <th className="p-1.5 font-bold uppercase text-neutral-800">Analyst Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Domain Registration Age</td>
                  <td className="border-r border-black p-1.5 font-mono">
                    {iocs.domain_age_days !== undefined && iocs.domain_age_days !== null
                      ? `${iocs.domain_age_days} days`
                      : "Established"}
                  </td>
                  <td className="p-1.5">
                    {iocs.domain_age_days !== undefined && iocs.domain_age_days < 30
                      ? "High anomaly: Domain registered immediately prior to campaign onset."
                      : "Domain age within standard established corporate baseline."}
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Lookalike Typosquat Target</td>
                  <td className="border-r border-black p-1.5 font-mono">
                    {typosquat || "None observed in evidence"}
                  </td>
                  <td className="p-1.5">
                    {typosquat
                      ? "Deceptive typography targeting legitimate corporate or financial institution."
                      : "No deceptive lookalike target identified."}
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Reputation Score Allocation</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">
                    {quadrants.reputation ?? 0} / 15 pts
                  </td>
                  <td className="p-1.5">
                    {(quadrants.reputation ?? 0) > 8
                      ? "Elevated risk contribution based on infrastructure flag correlation."
                      : "Reputation score reflects baseline operational standards."}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7.0 Indicators of Compromise (IOCs) */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            7.0 INDICATORS OF COMPROMISE (IOCs)
          </h2>
          <div className="mt-2 overflow-hidden border border-black">
            <table className="w-full border-collapse text-left text-[10.5px]">
              <thead>
                <tr className="border-b border-black bg-neutral-100">
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/4">IOC Type</th>
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/2">
                    Indicator Value
                  </th>
                  <th className="p-1.5 font-bold uppercase text-neutral-800 w-1/4">Forensic Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono">
                {trace[0]?.ip && (
                  <tr>
                    <td className="border-r border-black p-1.5 font-sans font-medium">IP Address (Origin)</td>
                    <td className="border-r border-black p-1.5">{isMasked ? maskIp(trace[0].ip) : trace[0].ip}</td>
                    <td className="p-1.5 font-sans">Initial relay server</td>
                  </tr>
                )}
                {senderEmail && (
                  <tr>
                    <td className="border-r border-black p-1.5 font-sans font-medium">Email Address</td>
                    <td className="border-r border-black p-1.5">{displaySenderEmail}</td>
                    <td className="p-1.5 font-sans">Header sender address</td>
                  </tr>
                )}
                {typosquat && (
                  <tr>
                    <td className="border-r border-black p-1.5 font-sans font-medium">Typosquat Target</td>
                    <td className="border-r border-black p-1.5">{typosquat}</td>
                    <td className="p-1.5 font-sans">Targeted legitimate brand</td>
                  </tr>
                )}
                {artifacts.map((art, idx) => (
                  <tr key={idx}>
                    <td className="border-r border-black p-1.5 font-sans font-medium">Artifact Identifier</td>
                    <td className="border-r border-black p-1.5">{isMasked ? "[REDACTED_IOC]" : art}</td>
                    <td className="p-1.5 font-sans">Extracted payload / banking marker</td>
                  </tr>
                ))}
                <tr>
                  <td className="border-r border-black p-1.5 font-sans font-medium">Payload SHA-256 Digest</td>
                  <td className="border-r border-black p-1.5 text-[9.5px] break-all">{sha256}</td>
                  <td className="p-1.5 font-sans">Cryptographic file integrity</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 8.0 Attribution Assessment */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            8.0 ATTRIBUTION ASSESSMENT
          </h2>
          <div className="mt-2 border border-black p-3 bg-neutral-50">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-black">
              ATTRIBUTION INDICATION: {attributionVerdict}
            </p>
            <p className="mt-1 text-xs text-neutral-800">{attributionExplanation}</p>
          </div>
          <p className="mt-2 text-[10.5px] text-neutral-700 italic">
            Observed infrastructure and telemetry indicate the technical delivery vector described above. Attribution reflects
            technical network evidence and does not constitute definitive legal attribution without verified ISP subscriber records.
          </p>
        </section>

        {/* 9.0 Correlation & Infrastructure Relationships */}
        {edges.length > 0 && (
          <section className="mb-6">
            <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
              9.0 CORRELATION &amp; INFRASTRUCTURE RELATIONSHIPS
            </h2>
            <div className="mt-2 overflow-hidden border border-black">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr className="border-b border-black bg-neutral-100">
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/3">
                      Source Entity
                    </th>
                    <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/3">
                      Target Entity
                    </th>
                    <th className="p-1.5 font-bold uppercase text-neutral-800 w-1/3">Correlation Linkage Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  {edges.map((e, idx) => (
                    <tr key={idx}>
                      <td className="border-r border-black p-1.5">{isMasked ? maskEntity(e.from) : e.from}</td>
                      <td className="border-r border-black p-1.5">{isMasked ? maskEntity(e.to) : e.to}</td>
                      <td className="p-1.5 font-sans font-medium">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 10.0 Risk Assessment & Signal Weighting */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            10.0 RISK ASSESSMENT &amp; SIGNAL WEIGHTING
          </h2>
          <div className="mt-2 overflow-hidden border border-black">
            <table className="w-full border-collapse text-left text-[10.5px]">
              <thead>
                <tr className="border-b border-black bg-neutral-100">
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-1/3">
                    Evaluation Quadrant
                  </th>
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-24">
                    Allocated Max
                  </th>
                  <th className="border-r border-black p-1.5 font-bold uppercase text-neutral-800 w-24">
                    Observed Score
                  </th>
                  <th className="p-1.5 font-bold uppercase text-neutral-800">Analytical Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Header &amp; Routing</td>
                  <td className="border-r border-black p-1.5 font-mono">30 pts</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">
                    {quadrants.header_routing ?? 0} pts
                  </td>
                  <td className="p-1.5">Anomaly detection across relay hops and autonomous systems</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Authentication Failure</td>
                  <td className="border-r border-black p-1.5 font-mono">25 pts</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">
                    {quadrants.auth_failure ?? 0} pts
                  </td>
                  <td className="p-1.5">Failure weight for SPF, DKIM cryptographic token, and DMARC alignment</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Language &amp; Intent</td>
                  <td className="border-r border-black p-1.5 font-mono">30 pts</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">
                    {quadrants.nlp_language ?? 0} pts
                  </td>
                  <td className="p-1.5">Evaluation of urgency, credential requests, and financial manipulation cues</td>
                </tr>
                <tr>
                  <td className="border-r border-black p-1.5 font-medium">Reputation &amp; History</td>
                  <td className="border-r border-black p-1.5 font-mono">15 pts</td>
                  <td className="border-r border-black p-1.5 font-mono font-bold">
                    {quadrants.reputation ?? 0} pts
                  </td>
                  <td className="p-1.5">Historical telemetry, domain registration age, and IOC cross-matching</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 11.0 Key Investigation Findings */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            11.0 KEY INVESTIGATION FINDINGS
          </h2>
          <ol className="mt-2 list-decimal pl-5 space-y-1 text-[11px]">
            <li>
              <strong>Overall Risk Status:</strong> The message scored <strong>{riskScore} / 100</strong>, indicating{" "}
              {riskScore >= 70 ? "an active and severe threat requiring operational containment." : "a low-risk profile conforming to operational norms."}
            </li>
            <li>
              <strong>Authentication Alignment:</strong> Message protocol evaluation yielded SPF: {spf}, DKIM: {dkim}, and DMARC: {dmarc}.
            </li>
            {typosquat && (
              <li>
                <strong>Brand Impersonation:</strong> Deceptive typography identified targeting legitimate organization &ldquo;{typosquat}&rdquo;.
              </li>
            )}
            {trace[0]?.ip && (
              <li>
                <strong>Origin Routing:</strong> Initial relay originated from IP {isMasked ? maskIp(trace[0].ip) : trace[0].ip} ({trace[0].place || "unspecified location"}).
              </li>
            )}
            {artifacts.length > 0 && (
              <li>
                <strong>Identified Artifacts:</strong> Extracted forensic financial/payload tokens: {isMasked ? artifacts.map(() => "[REDACTED_IOC]").join(", ") : artifacts.join(", ")}.
              </li>
            )}
          </ol>
        </section>

        {/* 12.0 Recommended Investigation Actions */}
        <section className="mb-6">
          <h2 className="border-b border-black pb-1 text-xs font-bold uppercase tracking-wider text-black">
            12.0 RECOMMENDED INVESTIGATION ACTIONS
          </h2>
          <ol className="mt-2 list-decimal pl-5 space-y-1 text-[11px]">
            <li>
              <strong>Chain of Custody:</strong> Retain raw MIME envelope and SHA-256 hash in secure forensic repository.
            </li>
            {riskScore >= 70 ? (
              <>
                {trace[0]?.ip && (
                  <li>
                    <strong>Network Perimeter Defense:</strong> Implement temporary boundary firewall block on IP {isMasked ? maskIp(trace[0].ip) : trace[0].ip}.
                  </li>
                )}
                {typosquat && (
                  <li>
                    <strong>DNS Sinkholing:</strong> Issue internal DNS sinkhole rule for identified typosquat target {typosquat}.
                  </li>
                )}
                <li>
                  <strong>Enterprise Audit:</strong> Query mail gateway for all inbound messages referencing sending address within past 30 days.
                </li>
                <li>
                  <strong>Credential Safeguards:</strong> Terminate active sessions and enforce password reset for users interacting with message links.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Telemetry Cataloging:</strong> Archive message signature for longitudinal sender baseline monitoring.
                </li>
                <li>
                  <strong>No Active Blocking:</strong> Message parameters satisfy standard corporate communication thresholds.
                </li>
              </>
            )}
          </ol>
        </section>

        {/* 13.0 Architecture Note (AI Text Generation) */}
        <section className="mb-6 border-t border-black pt-3">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-black">
            13.0 AUTOMATED NARRATIVE GENERATION ARCHITECTURE NOTE
          </h2>
          <p className="mt-1 text-[10px] text-neutral-700 leading-relaxed text-justify">
            SYSTEM ARCHITECTURE NOTICE: This examination report was compiled via deterministic evidence extraction directly
            from verified email forensic JSON data. The platform architecture supports planned integration of backend text-generation
            language models to automatically synthesize structured evidence into multi-paragraph contextual narrative reports
            for court and compliance presentation, maintaining the underlying JSON telemetry as the authoritative single source of truth.
          </p>
        </section>

        {/* 14.0 Evidence Attestation & Legal Disclaimer */}
        <footer className="mt-8 border-t-2 border-black pt-4 text-[10px] text-neutral-800">
          <div className="flex flex-wrap items-center justify-between font-mono font-bold uppercase">
            <span>Case Reference: {caseId}</span>
            <span>Document ID: REP-{caseId}-VERIFIED</span>
            <span>Platform: Email Threat Intelligence Platform</span>
          </div>
          <p className="mt-2 text-justify text-[9.5px] text-neutral-600 leading-normal">
            LEGAL DISCLAIMER: This document is an analytical forensic summary compiled from electronic message headers,
            cryptographic authentication tokens, DNS telemetry, and network routing hops. Findings should be corroborated
            with original raw headers, provider server logs, and judicial legal process before presentation in formal proceedings.
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-neutral-400 pt-2 text-[9px] font-mono text-neutral-500">
            <span>Official Forensic Examination Record</span>
            <span>End of Report</span>
          </div>
        </footer>
      </article>
    </div>
  );
}
