'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileCode, ChevronDown, Download, Check } from "lucide-react";
import { CASES_LIST, sanitizeReport } from "../lib/cases";

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

export default function ReportButton({ data, masked, caseId }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportedStatus, setExportedStatus] = useState(null);
  const containerRef = useRef(null);

  // Resolve active case reference
  const matchedCase = CASES_LIST.find(
    (c) =>
      c.id.toLowerCase() === caseId?.toLowerCase() ||
      c.slug.toLowerCase() === caseId?.toLowerCase() ||
      c.data?.sha256 === data?.sha256 ||
      c.data?.filename === data?.filename
  ) || CASES_LIST[0];

  const currentCaseId = caseId || matchedCase?.id || "CASE-001";

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

  const handleExportEvidenceJson = () => {
    const fileName = `${currentCaseId}_forensic_data.json`;
    const exportCase = matchedCase
      ? {
          ...matchedCase,
          data: sanitizeReport(matchedCase.data, masked),
        }
      : {
          id: currentCaseId,
          data: sanitizeReport(data, masked),
        };

    downloadFile(JSON.stringify(exportCase, null, 2), fileName, "application/json");
    triggerFeedback("JSON");
    setMenuOpen(false);
  };

  const handleViewDossier = () => {
    setMenuOpen(false);
    router.push(`/reports/${currentCaseId}`);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <div className="inline-flex items-center rounded-lg border border-edge bg-surface">
        <button
          type="button"
          onClick={handleExportEvidenceJson}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink transition-colors hover:text-accent focus:outline-none cursor-pointer"
          title="Export evidence data as JSON"
        >
          {exportedStatus ? (
            <>
              <Check className="h-3.5 w-3.5 text-risk-green" />
              <span className="font-medium text-risk-green">{exportedStatus} Saved!</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5 text-accent" />
              <span>Export Report</span>
            </>
          )}
        </button>

        <div className="h-4 w-px bg-edge" />

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="px-2 py-2 text-xs text-dim transition-colors hover:text-ink focus:outline-none cursor-pointer"
          aria-expanded={menuOpen}
          aria-label="Select report action"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-lg border border-edge bg-surface py-1 shadow-xl shadow-canvas/50">
          <div className="border-b border-edge px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-dim">
            Forensic Actions {masked ? "(Masked)" : "(Raw)"}
          </div>

          {/* Action 1: View Forensic Dossier */}
          <button
            type="button"
            onClick={handleViewDossier}
            className="flex w-full items-start gap-2.5 px-3 py-2 text-left text-xs text-ink transition-colors hover:bg-canvas hover:text-accent cursor-pointer"
          >
            <FileText className="h-4 w-4 text-dim shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-ink">View Forensic Dossier</div>
              <div className="text-[10px] text-dim">Formal investigative report &amp; timeline</div>
            </div>
          </button>

          <div className="my-1 border-t border-edge/60" />

          {/* Action 2: Export Evidence JSON */}
          <button
            type="button"
            onClick={handleExportEvidenceJson}
            className="flex w-full items-start gap-2.5 px-3 py-2 text-left text-xs text-ink transition-colors hover:bg-canvas hover:text-accent cursor-pointer"
          >
            <FileCode className="h-4 w-4 text-dim shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-ink">Export Evidence JSON</div>
              <div className="text-[10px] text-dim">Machine-readable forensic telemetry</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
