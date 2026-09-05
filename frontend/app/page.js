'use client';

import { useState } from "react";
import AuthStatusCard from "../components/AuthStatusCard";
import GraphView from "../components/GraphView";
import MapView from "../components/MapView";
import PrivacyToggle from "../components/PrivacyToggle";
import ReportButton from "../components/ReportButton";
import ScoreBreakdown from "../components/ScoreBreakdown";
import UploadPanel from "../components/UploadPanel";

export default function Home() {
  const [data] = useState(null);
  const [masked, setMasked] = useState(false);

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-base font-medium text-ink">
          Email Threat Intelligence & Forensic Platform
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <PrivacyToggle data={data} masked={masked} setMasked={setMasked} />
          <ReportButton data={data} masked={masked} />
        </div>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <UploadPanel data={data} masked={masked} />
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
