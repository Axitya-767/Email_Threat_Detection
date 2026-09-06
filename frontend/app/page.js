'use client';

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import AuthStatusCard from "../components/AuthStatusCard";
import GraphView from "../components/GraphView";
import MapView from "../components/MapView";
import PrivacyToggle from "../components/PrivacyToggle";
import ReportButton from "../components/ReportButton";
import ScoreBreakdown from "../components/ScoreBreakdown";
import UploadPanel from "../components/UploadPanel";
import mock01 from "../data/mock_responses/mock_01_sbi_kyc.json";
import mock02 from "../data/mock_responses/mock_02_bec_wire_fraud.json";
import mock03 from "../data/mock_responses/mock_03_clean_internal_memo.json";
import mock04 from "../data/mock_responses/mock_04_itd_refund_spoof.json";
import mock05 from "../data/mock_responses/mock_05_vendor_invoice_diversion.json";
import mock06 from "../data/mock_responses/mock_06_it_helpdesk_harvest.json";
import mock07 from "../data/mock_responses/mock_07_marketing_newsletter.json";
import mock08 from "../data/mock_responses/mock_08_university_compromise.json";

const scenarios = [
  { name: "SBI KYC Scam", data: mock01 },
  { name: "BEC Wire Fraud", data: mock02 },
  { name: "Clean Internal Memo", data: mock03 },
  { name: "ITD Refund Spoof", data: mock04 },
  { name: "Vendor Invoice Diversion", data: mock05 },
  { name: "IT Helpdesk Harvest", data: mock06 },
  { name: "Marketing Newsletter", data: mock07 },
  { name: "University Compromise", data: mock08 },
];

function subscribe() {
  return () => {};
}

function getAuthSnapshot() {
  return sessionStorage.getItem("isAuthenticated") === "true";
}

function getServerAuthSnapshot() {
  return false;
}

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useSyncExternalStore(subscribe, getAuthSnapshot, getServerAuthSnapshot);
  const [data, setData] = useState(scenarios[0].data);
  const [masked, setMasked] = useState(false);

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
    <div className="min-h-screen p-6">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-base font-medium text-ink">
            Email Threat Intelligence & Forensic Platform
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <PrivacyToggle data={data} masked={masked} setMasked={setMasked} />
            <ReportButton data={data} masked={masked} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((scenario) => {
            const active = data.sha256 === scenario.data.sha256;
            return (
              <button
                key={scenario.data.sha256}
                type="button"
                onClick={() => setData(scenario.data)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  active
                    ? "border-accent bg-surface text-accent"
                    : "border-edge bg-surface text-dim"
                }`}
              >
                {scenario.name}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <UploadPanel data={data} masked={masked} setMasked={setMasked} />
        <ScoreBreakdown data={data} masked={masked} />
        <AuthStatusCard data={data} masked={masked} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MapView data={data} masked={masked} />
        <GraphView data={data} masked={masked} />
      </div>
    </div>
  );
}
