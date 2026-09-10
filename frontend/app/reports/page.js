'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  Download,
  X,
  Printer,
} from "lucide-react";
import {
  CASES_LIST,
  CATEGORIES,
  getRiskBadgeClasses,
  getClassificationBadgeClasses,
} from "../../lib/cases";

// Maps case slugs to formal investigation report titles
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

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Format reports list with formal investigation titles
  const reportsData = useMemo(() => {
    return CASES_LIST.map((c) => ({
      ...c,
      reportTitle: REPORT_TITLES[c.slug] || `${c.name} Investigation`,
    }));
  }, []);

  // Filtered reports
  const filteredReports = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return reportsData.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (q) {
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesTitle = item.reportTitle.toLowerCase().includes(q);
        const matchesFilename = item.data?.filename?.toLowerCase().includes(q);
        const matchesSender = item.data?.sender?.email?.toLowerCase().includes(q);
        const matchesClassification = item.data?.classification
          ?.toLowerCase()
          .includes(q);

        return (
          matchesId ||
          matchesName ||
          matchesTitle ||
          Boolean(matchesFilename) ||
          Boolean(matchesSender) ||
          Boolean(matchesClassification)
        );
      }
      return true;
    });
  }, [reportsData, searchQuery, activeCategory]);

  const stats = useMemo(() => {
    const total = reportsData.length;
    const critical = reportsData.filter(
      (r) => (r.data?.risk_score ?? 0) >= 70
    ).length;
    const medium = reportsData.filter((r) => {
      const s = r.data?.risk_score ?? 0;
      return s >= 40 && s < 70;
    }).length;
    const low = reportsData.filter((r) => (r.data?.risk_score ?? 0) < 40).length;
    return { total, critical, medium, low };
  }, [reportsData]);

  return (
    <div className="min-h-screen p-6">
      {/* Page Header */}
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-edge bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dim">
                Forensic documentation archive
              </span>
              <span className="text-xs text-dim">
                {stats.total} official investigation reports available
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
              Reports
            </h1>
            <p className="text-xs text-dim">
              Investigation reports and forensic evidence summaries
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
            <span className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs text-dim">
              Critical:{" "}
              <strong className="text-risk-red">{stats.critical}</strong>
            </span>
            <span className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs text-dim">
              Elevated:{" "}
              <strong className="text-risk-amber">{stats.medium}</strong>
            </span>
            <span className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs text-dim">
              Clean:{" "}
              <strong className="text-risk-green">{stats.low}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Search & Filter Toolbar */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-edge bg-surface p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex w-full items-center lg:w-96">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-dim"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Report, Case ID, filename, or sender..."
              className="w-full rounded-lg border border-edge bg-canvas py-2 pr-8 pl-9 text-xs text-ink placeholder:text-dim focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-dim hover:text-ink"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 text-xs text-dim">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              const count =
                cat.id === "all"
                  ? stats.total
                  : cat.id === "critical"
                  ? stats.critical
                  : cat.id === "bec"
                  ? reportsData.filter((r) => r.category === "bec").length
                  : stats.low;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? "border-accent bg-accent/15 text-accent shadow-xs"
                      : "border-edge bg-canvas/60 text-dim hover:border-edge/80 hover:bg-canvas hover:text-ink"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`inline-flex items-center justify-center rounded px-1.5 py-0.2 text-[10px] font-semibold leading-tight ${cat.badgeClasses}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="overflow-hidden rounded-xl border border-edge bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-edge bg-canvas/60 text-[11px] font-medium tracking-wider text-dim uppercase">
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Verdict</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60 text-ink">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-dim">
                    No investigation reports match your search query.
                  </td>
                </tr>
              ) : (
                filteredReports.map((item) => {
                  const riskScore = item.data?.risk_score ?? 0;
                  const classification =
                    item.data?.classification ?? "unclassified";
                  const riskBadge = getRiskBadgeClasses(riskScore);
                  const classBadge =
                    getClassificationBadgeClasses(classification);

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-canvas/40"
                    >
                      {/* Report Title & Subject */}
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-md border border-edge bg-canvas p-1.5 text-accent">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <Link
                              href={`/reports/${item.id}`}
                              className="font-semibold text-ink hover:text-accent transition-colors"
                            >
                              {item.reportTitle}
                            </Link>
                            <p className="mt-0.5 max-w-xs truncate text-[11px] text-dim">
                              {item.data?.filename || item.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Case ID */}
                      <td className="px-4 py-3">
                        <span className="rounded border border-edge bg-canvas px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                          {item.id}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${riskBadge}`}
                          >
                            {riskScore} / 100
                          </span>
                        </div>
                      </td>

                      {/* Verdict */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${classBadge}`}
                        >
                          {classification.replace("_", " ")}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 font-mono text-dim">
                        {item.date}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View opens the dedicated official investigation document */}
                          <Link
                            href={`/reports/${item.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-canvas px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>View Report</span>
                          </Link>

                          {/* Download directly triggers download of the generated PDF */}
                          <a
                            href={`/api/reports/${item.id}/pdf`}
                            download={`${item.id}-forensic-report.pdf`}
                            title={`Download ${item.id} Forensic PDF`}
                            className="inline-flex items-center rounded-md border border-edge bg-canvas p-1.5 text-dim transition-colors hover:border-edge/80 hover:text-ink"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
