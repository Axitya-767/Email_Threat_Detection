'use client';

import { useRef, useState } from "react";

function obfuscateEmail(email) {
  if (!email || !email.includes("@")) return "••••@••••";
  const [local, domain] = email.split("@");
  const firstChar = local[0] || "u";
  return `${firstChar}***@${domain}`;
}

function shortenSha(sha) {
  if (!sha || sha.length < 14) return sha || "4b7e2c91...7a2b5d";
  return `${sha.slice(0, 8)}...${sha.slice(-6)}`;
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
  return ext === "eml" ? ".EML" : "MSG";
}

export default function UploadPanel({ data, masked }) {
  const fileInputRef = useRef(null);
  const [localFile, setLocalFile] = useState(null);

  const fileName = localFile?.name || data?.filename || "SBI_Urgent_KYC_Update.msg";
  const senderName = data?.sender?.name || "Ramesh Sharma";
  const senderEmail = data?.sender?.email || "ramesh@sbi-support-desk.com";
  const sizeLabel = formatMb(data?.file_size_kb, localFile?.size);
  const shaLabel = shortenSha(data?.sha256);

  return (
    <div className="flex min-h-[220px] flex-col rounded-lg border border-edge bg-surface p-4">
      {/* Case Header */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
          Case File
        </span>
        <span className="rounded border border-edge bg-canvas px-2 py-0.5 font-mono text-[10px] font-semibold text-accent">
          {extBadge(fileName)}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-ink">Ingested Evidence</h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-canvas px-2.5 py-1 text-xs text-ink hover:border-accent hover:text-accent transition-colors"
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
            aria-hidden="true"
          >
            <path d="M12 16V4" />
            <path d="m8 8 4-4 4 4" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Upload File
        </button>
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

      {/* Ingested File Box */}
      <div className="rounded-md border border-dashed border-edge bg-canvas/60 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-ink" title={fileName}>
          {fileName}
        </p>
        <p className="mt-0.5 truncate font-mono text-xs text-dim">
          {sizeLabel} <span className="text-edge">·</span> SHA–256 {shaLabel}
        </p>
      </div>

      {/* Sender Details Conditioned on Masked State */}
      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-dim">
          Sender
        </p>
        {masked ? (
          <div className="space-y-1">
            <p className="text-sm font-mono tracking-widest text-dim select-none">
              ████████
            </p>
            <p className="font-mono text-xs text-dim select-none">
              {obfuscateEmail(senderEmail)}
            </p>
            <p className="pt-0.5 text-[11px] text-accent flex items-center gap-1">
              <span>🔒</span>
              <span>PII Masked for Investigator Protection</span>
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-ink">
              {senderName}
            </p>
            <p className="font-mono text-xs text-accent">
              {senderEmail}
            </p>
            <p className="pt-0.5 text-[11px] text-dim">
              Full sender identity visible
            </p>
          </div>
        )}
      </div>

      {/* Clean Footer Metadata */}
      <div className="mt-auto flex items-center justify-between border-t border-edge/60 pt-3 text-[11px] text-dim">
        <span>Forensic envelope intact</span>
        <span className="font-mono">RFC-822 / MAPI</span>
      </div>
    </div>
  );
}
