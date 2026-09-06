'use client';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FolderKanban, ArrowRight } from "lucide-react";
import AuthStatusCard from "../components/AuthStatusCard";
import AttributionVerdict from "../components/AttributionVerdict";
import GraphView from "../components/GraphView";
import MapView from "../components/MapView";
import PrivacyToggle from "../components/PrivacyToggle";
import ReportButton from "../components/ReportButton";
import ScoreBreakdown from "../components/ScoreBreakdown";
import UploadPanel from "../components/UploadPanel";
import { CASES_LIST, getRiskBadgeClasses } from "../lib/cases";

function DashboardContent() {
  const searchParams = useSearchParams();
  const caseParam = searchParams.get("case");

  // Determine initial case from URL query param or default to first
  const initialCase =
    CASES_LIST.find(
      (c) =>
        c.slug === caseParam ||
        c.id.toLowerCase() === caseParam?.toLowerCase() ||
        c.data.sha256 === caseParam
    ) || CASES_LIST[0];

  const [data, setData] = useState(initialCase.data);
  const [masked, setMasked] = useState(false);

  // Sync if URL query param changes
  useEffect(() => {
    if (caseParam) {
      const match = CASES_LIST.find(
        (c) =>
          c.slug === caseParam ||
          c.id.toLowerCase() === caseParam.toLowerCase() ||
          c.data.sha256 === caseParam
      );
      if (match) {
        setData(match.data);
      }
    }
  }, [caseParam]);

  const activeCaseMeta =
    CASES_LIST.find((c) => c.data.sha256 === data?.sha256) || CASES_LIST[0];

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex flex-col gap-3">
        {/* Header Top Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-semibold text-ink">
              Email Threat Intelligence & Forensic Platform
            </h1>
            <p className="text-xs text-dim">
              Interactive case analysis, telemetry hops, and IOC graph exploration
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <PrivacyToggle data={data} masked={masked} setMasked={setMasked} />
            <ReportButton data={data} masked={masked} />
          </div>
        </div>

        {/* Active Case Banner & Cases Directory Navigation */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-edge bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-dim">
              Active Case:
            </span>
            <span className="font-semibold text-ink">
              {activeCaseMeta.name}
            </span>
            <span className="font-mono text-[11px] text-accent">
              [{activeCaseMeta.id}]
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${getRiskBadgeClasses(
                data?.risk_score ?? 0
              )}`}
            >
              {data?.risk_score ?? 0} Risk
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/cases"
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-canvas px-3 py-1.5 text-xs font-medium text-dim hover:border-accent hover:text-accent transition-colors"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              <span>Browse All Cases</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <UploadPanel data={data} masked={masked} setMasked={setMasked} />
        <ScoreBreakdown data={data} masked={masked} />
        <div className="flex flex-col gap-4">
          <AuthStatusCard data={data} masked={masked} />
          <AttributionVerdict data={data} masked={masked} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MapView data={data} masked={masked} />
        <GraphView data={data} masked={masked} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-xs text-dim">
          Loading forensic dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

