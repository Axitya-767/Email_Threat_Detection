'use client';

import { useState, useEffect, useSyncExternalStore, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getAuthSnapshot() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("isAuthenticated") === "true";
}

function getServerAuthSnapshot() {
  return false;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseParam = searchParams.get("case");
  const isAuthenticated = useSyncExternalStore(
    subscribe,
    getAuthSnapshot,
    getServerAuthSnapshot
  );

  // Determine active case from URL query param or default to first
  const activeCase =
    CASES_LIST.find(
      (c) =>
        c.slug === caseParam ||
        c.id.toLowerCase() === caseParam?.toLowerCase() ||
        c.data?.sha256 === caseParam
    ) || CASES_LIST[0];

  const data = activeCase?.data;
  const activeCaseMeta = activeCase;
  const [masked, setMasked] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = (window.scrollY || document.documentElement.scrollTop || 0) > 0;
      setIsScrolled(scrolled);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex items-center gap-2 text-xs text-dim">
          <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Redirecting to authentication portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Pinned Sticky Top Section */}
      <header
        className={`sticky top-0 z-30 bg-canvas border-b px-6 pt-5 pb-4 transition-all duration-200 ${
          isScrolled
            ? "border-edge shadow-lg shadow-black/40"
            : "border-edge/50 shadow-none"
        }`}
      >
        <div className="flex flex-col gap-3">
          {/* Header Top Bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-base font-semibold text-ink">
                Email Threat Intelligence & Forensic Platform
              </h1>
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
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <UploadPanel data={data} masked={masked} setMasked={setMasked} />
          <ScoreBreakdown data={data} masked={masked} />
          <div className="flex flex-col gap-4">
            <AuthStatusCard data={data} masked={masked} />
            <AttributionVerdict data={data} masked={masked} />
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          <MapView data={data} masked={masked} />
          <GraphView data={data} masked={masked} />
        </div>
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

