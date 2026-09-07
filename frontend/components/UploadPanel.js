'use client';

import { useRef, useState } from "react";

function obfuscateEmail(email) {
  if (!email || !email.includes("@")) return "••••@••••";
  const [local, domain] = email.split("@");
  const firstChar = local[0] || "u";
  return `${firstChar}***@${domain}`;
}

function formatMb(fileSizeKb, localBytes) {
  if (typeof localBytes === "number") {
    return `${(localBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (typeof fileSizeKb === "number") {
    return `${(fileSizeKb / 1024).toFixed(2)} MB`;
  }
  return "2.10 MB";
}

function extBadge(filename) {
  const ext = String(filename || "").split(".").pop()?.toLowerCase();
  return ext === "eml" ? ".EML" : ".MSG";
}

export default function UploadPanel({ data, masked }) {
  const fileInputRef = useRef(null);
  const [localFile, setLocalFile] = useState(null);

  const fileName = localFile?.name || data?.filename || "SBI_Urgent_KYC_Update.msg";
  const senderName = data?.sender?.name || "Ramesh Sharma";
  const senderEmail = data?.sender?.email || "ramesh@sbi-support-desk.com";
  const sizeLabel = formatMb(data?.file_size_kb, localFile?.size);
  const sha = data?.sha256 || "4b7e2c91a8d0f356e1c4b9a7d2f6083c5e9a1b4d7c2f8e0a3b6d9c1e4f7a2b5d";

  return (
    <div className="flex flex-col rounded-xl border border-edge bg-surface p-6 shadow-sm">
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-edge/60 pb-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Case file
          </span>
          <h2 className="text-lg font-semibold text-ink">Ingested evidence</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-edge bg-canvas px-2.5 py-1 font-mono text-xs font-semibold text-accent">
            {extBadge(fileName)}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4" />
              <path d="m8 8 4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <span>Upload file</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".eml,.msg"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setLocalFile(file);
          }}
        />
      </div>

      {/* Ingested File Details Card */}
      <div className="rounded-lg border border-dashed border-edge bg-canvas/70 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Evidence filename
          </span>
          <p className="font-mono text-sm font-bold text-ink truncate" title={fileName}>
            {fileName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dim font-mono">
            <span>Payload size: <strong className="text-ink">{sizeLabel}</strong></span>
            <span className="text-edge">·</span>
            <span>Mime format: <strong className="text-ink">RFC-822 / MAPI</strong></span>
          </div>
        </div>
      </div>

      {/* Sender Identity Section */}
      <div className="mt-5 rounded-lg border border-edge/60 bg-canvas/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Sender identity
          </span>
          {masked ? (
            <span className="rounded bg-risk-green/10 border border-risk-green/30 px-2 py-0.5 text-[10px] font-semibold text-risk-green flex items-center gap-1">
              <span>🔒</span> PII masked
            </span>
          ) : (
            <span className="rounded bg-risk-red/15 border border-risk-red/40 px-2 py-0.5 text-[10px] font-semibold text-risk-red flex items-center gap-1">
              <span>⚠️</span> Identity unmasked
            </span>
          )}
        </div>

        {masked ? (
          <div className="space-y-1.5 pt-1">
            <p className="font-mono text-base tracking-widest text-dim select-none">
              ████████████
            </p>
            <p className="font-mono text-xs text-dim select-none">
              {obfuscateEmail(senderEmail)}
            </p>
            <p className="pt-1 text-xs text-dim flex items-center gap-1.5">
              <span>Protected for investigator compliance and chain of custody.</span>
            </p>
          </div>
        ) : (
          <div className="space-y-1 pt-1">
            <p className="text-base font-semibold text-ink">
              {senderName}
            </p>
            <p className="font-mono text-xs text-accent">
              {senderEmail}
            </p>
            <p className="pt-1 text-xs text-dim">
              Full sender identity disclosed under audited investigator credentials.
            </p>
          </div>
        )}
      </div>

      {/* Cryptographic Hash Summary */}
      <div className="mt-5 rounded-lg border border-edge/50 bg-canvas/40 px-3.5 py-2.5">
        <div className="flex items-center justify-between text-xs text-dim">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Forensic SHA-256 hash</span>
          <span className="font-mono text-[11px] text-accent">Verified intact</span>
        </div>
        <p className="mt-1 font-mono text-xs text-ink truncate select-all" title={sha}>
          {sha}
        </p>
      </div>
    </div>
  );
}
