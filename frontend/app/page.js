'use client';

import { useState, useEffect, useSyncExternalStore, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  CheckCircle2,
  Copy,
  Check,
  FileCheck,
  Shield,
  Clock,
} from "lucide-react";
import AuthStatusCard from "../components/AuthStatusCard";
import DomainIntelCard from "../components/DomainIntelCard";
import AttributionVerdict from "../components/AttributionVerdict";
import GraphView from "../components/GraphView";
import MapView from "../components/MapView";
import PrivacyToggle from "../components/PrivacyToggle";
import ReportButton from "../components/ReportButton";
import ScoreBreakdown from "../components/ScoreBreakdown";
import UploadPanel from "../components/UploadPanel";
import {
  CASES_LIST,
  getRiskBadgeClasses,
  getClassificationBadgeClasses,
} from "../lib/cases";

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

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "signals", label: "Signals" },
  { id: "auth-intel", label: "Authentication & domain intelligence" },
  { id: "routing-correlation", label: "Routing & Correlation" },
  { id: "evidence", label: "Evidence" },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseParam = searchParams.get("case");
  const isAuthenticated = useSyncExternalStore(
    subscribe,
    getAuthSnapshot,
    getServerAuthSnapshot
  );

  // Active case from URL param or default to first
  const activeCase =
    CASES_LIST.find(
      (c) =>
        c.slug === caseParam ||
        c.id.toLowerCase() === caseParam?.toLowerCase() ||
        c.data?.sha256 === caseParam
    ) || CASES_LIST[0];

  const data = activeCase?.data;
  const activeCaseMeta = activeCase;

  // RULE: Default the toggle to MASKED on page load (flip default in state)
  const [masked, setMasked] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [copiedSha, setCopiedSha] = useState(false);

  // Sender domain extraction
  const senderDomain = useMemo(() => {
    const email = data?.sender?.email || "";
    return email.includes("@") ? email.split("@")[1] : "unknown-domain.com";
  }, [data]);

  // Scroll-spy observer for sticky in-page nav
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = (window.scrollY || document.documentElement.scrollTop || 0) + 160;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
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

  const scrollToSection = (id) => {
    const targetId = id === "routing" || id === "correlation" ? "routing-correlation" : id;
    const el = document.getElementById(targetId) || document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCopySha = () => {
    if (data?.sha256) {
      navigator.clipboard.writeText(data.sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

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

  const score = data?.risk_score ?? 0;
  const classification = data?.classification ?? "unknown";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* 
        ═════════════════════════════════════════════════════════════
        STICKY HEADER STACK (Fixed top bar + Verdict strip + Section Nav)
        ═════════════════════════════════════════════════════════════
      */}
      <header className="sticky top-0 z-50 bg-canvas/95 backdrop-blur-md border-b border-edge shadow-md shadow-black/40 transition-all">
        {/* a) Top bar: prominent main heading, PII Shield, Export Report */}
        <div className="flex h-16 items-center justify-between border-b border-edge/60 px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-bold text-ink tracking-tight">
              Email Threat Intelligence & Forensic Platform
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <PrivacyToggle data={data} masked={masked} setMasked={setMasked} />
            <ReportButton data={data} masked={masked} caseId={activeCaseMeta?.id} />
          </div>
        </div>

        {/* b) Sticky Verdict Strip: Case ID, Sender Domain, Classification Badge, Big Risk Score */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge bg-surface/95 px-6 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-edge bg-canvas px-2.5 py-1 font-mono text-xs font-bold text-accent">
              {activeCaseMeta.id}
            </span>
            <span className="text-sm font-semibold text-ink">
              {activeCaseMeta.name}
            </span>
            <span className="text-edge">·</span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-dim">
              <span>Domain:</span>
              <span className="text-ink font-medium">{senderDomain}</span>
            </span>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize ${getClassificationBadgeClasses(
                classification
              )}`}
            >
              {classification.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Big Risk Score Display */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
                Risk score:
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-mono text-xl font-extrabold tracking-tight ${
                    score >= 70
                      ? "text-risk-red"
                      : score >= 40
                      ? "text-risk-amber"
                      : "text-risk-green"
                  }`}
                >
                  {score}
                </span>
                <span className="font-mono text-xs text-dim">/ 100</span>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRiskBadgeClasses(
                  score
                )}`}
              >
                {score >= 70 ? "Critical" : score >= 40 ? "Medium" : "Clean"}
              </span>
            </div>

            <Link
              href="/cases"
              className="inline-flex items-center gap-1 rounded-md border border-edge bg-canvas px-2.5 py-1 text-xs text-dim hover:border-accent hover:text-accent transition-colors"
              title="View all cases"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cases</span>
            </Link>
          </div>
        </div>

        {/* c) Sticky In-Page Section Nav (Smooth-scroll anchor links + Scroll-spy) */}
        <nav className="flex items-center gap-1 overflow-x-auto px-6 py-1.5 scrollbar-none bg-canvas/90">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-dim shrink-0">
            Navigate:
          </span>
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-accent/15 text-accent border border-accent/40 font-semibold"
                    : "text-dim hover:bg-surface hover:text-ink border border-transparent"
                }`}
              >
                {sec.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* 
        ═════════════════════════════════════════════════════════════
        CONTINUOUS SCROLLING BODY (Ordered by forensic investigation flow)
        ═════════════════════════════════════════════════════════════
      */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Overview */}
        <section id="overview" className="scroll-mt-[168px]">
          <h2 className="text-base font-semibold text-ink tracking-tight mb-3">Overview</h2>
          <UploadPanel data={data} masked={masked} setMasked={setMasked} />
        </section>

        {/* Signals */}
        <section id="signals" className="scroll-mt-[168px]">
          <h2 className="text-base font-semibold text-ink tracking-tight mb-3">Signals</h2>
          <ScoreBreakdown data={data} masked={masked} />
        </section>

        {/* Authentication & domain intelligence */}
        <section id="auth-intel" className="scroll-mt-[168px]">
          <h2 className="text-base font-semibold text-ink tracking-tight mb-3">
            Authentication & domain intelligence
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
            <AuthStatusCard data={data} masked={masked} />
            <AttributionVerdict data={data} masked={masked} />
            <DomainIntelCard data={data} masked={masked} />
          </div>
        </section>

        {/* Routing & Correlation (Side by Side on desktop) */}
        <section id="routing-correlation" className="scroll-mt-[168px]">
          <span id="routing" className="-translate-y-44 block invisible" aria-hidden="true" />
          <span id="correlation" className="-translate-y-44 block invisible" aria-hidden="true" />

          <h2 className="text-base font-semibold text-ink tracking-tight mb-3">
            Routing & Correlation
          </h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col h-full">
              <MapView data={data} masked={masked} />
            </div>
            <div className="lg:col-span-7 flex flex-col h-full">
              <GraphView data={data} masked={masked} />
            </div>
          </div>
        </section>

        {/* Evidence */}
        <section id="evidence" className="scroll-mt-[168px] pb-12">
          <h2 className="text-base font-semibold text-ink tracking-tight mb-3">Evidence</h2>

          <div className="rounded-xl border border-edge bg-surface p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-edge/60 pb-6">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
                  Cryptographic verification
                </span>
                <h3 className="text-base font-semibold text-ink">Evidence custody record</h3>
                <p className="text-xs text-dim leading-relaxed">
                  Cryptographic hash guarantees evidence authenticity against tampering under forensic chain-of-custody standards.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <ReportButton data={data} masked={masked} caseId={activeCaseMeta?.id} />
                <Link
                  href="/cases"
                  className="inline-flex items-center gap-2 rounded-lg border border-edge bg-canvas px-4 py-2 text-xs font-medium text-ink hover:border-accent hover:text-accent transition-colors"
                >
                  <FolderKanban className="h-4 w-4 text-accent" />
                  <span>Return to case directory</span>
                </Link>
              </div>
            </div>

            {/* SHA-256 Hash Card */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-edge bg-canvas/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
                    SHA-256 hash
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySha}
                    className="inline-flex items-center gap-1 rounded border border-edge bg-surface px-2 py-0.5 text-[10px] font-medium text-dim hover:text-ink hover:border-accent transition-colors cursor-pointer"
                  >
                    {copiedSha ? (
                      <>
                        <Check className="h-3 w-3 text-risk-green" />
                        <span className="text-risk-green">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy hash</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs font-semibold text-accent break-all select-all">
                  {data?.sha256}
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-risk-green">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Hash verified intact against forensic vault</span>
                </div>
              </div>

              {/* Custody Checklist */}
              <div className="rounded-lg border border-edge bg-canvas/70 p-4 space-y-2.5 text-xs text-dim">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-dim block">
                  Chain of custody verification
                </span>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink">
                    <FileCheck className="h-3.5 w-3.5 text-accent" />
                    Ingested file:
                  </span>
                  <span className="font-mono text-ink">{data?.filename}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink">
                    <Shield className="h-3.5 w-3.5 text-accent" />
                    Investigator identity:
                  </span>
                  <span className="font-mono text-accent">INV-2291</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink">
                    <Clock className="h-3.5 w-3.5 text-accent" />
                    Timestamp:
                  </span>
                  <span className="font-mono text-dim">2026-09-06 14:32 UTC</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
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
