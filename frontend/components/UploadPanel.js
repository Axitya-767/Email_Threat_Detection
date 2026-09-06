'use client';

import { useRef, useState } from "react";

const INVESTIGATOR_PIN = "1234";
const FALLBACK_FILE = "SBI_Urgent_KYC_Update.msg";
const FALLBACK_NAME = "Ramesh Sharma";
const FALLBACK_EMAIL = "ramesh@sbi-support-desk.com";

function redactName(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => `${part[0] ?? ""}${"*".repeat(5)}`)
    .join(" ");
}

function redactEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return `${email[0] ?? ""}${"*".repeat(5)}`;
  return `${local[0] ?? ""}${"*".repeat(5)}@${domain}`;
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
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "eml" ? ".eml" : "MSG";
}

export default function UploadPanel({ data, masked, setMasked }) {
  const fileInputRef = useRef(null);
  const [localFile, setLocalFile] = useState(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const fileName =
    localFile?.name || data?.file?.name || data?.filename || FALLBACK_FILE;
  const senderName = data?.sender?.name || FALLBACK_NAME;
  const senderEmail = data?.sender?.email || FALLBACK_EMAIL;
  const sizeLabel = formatMb(data?.file_size_kb, localFile?.size);
  const shaLabel = shortenSha(data?.sha256);
  const canMask = data?.masked_view_available !== false;

  function applyMasked(next) {
    if (typeof setMasked === "function") setMasked(next);
  }

  function closePin() {
    setPinOpen(false);
    setPin("");
    setPinError("");
  }

  function onToggle() {
    if (!canMask) return;
    if (!masked) {
      applyMasked(true);
      return;
    }
    setPinOpen(true);
  }

  function onVerify(event) {
    event.preventDefault();
    if (pin.trim() !== INVESTIGATOR_PIN) {
      setPinError("Invalid investigator PIN");
      return;
    }
    applyMasked(false);
    closePin();
  }

  return (
    <div className="relative flex min-h-[220px] flex-col rounded-lg border border-edge bg-surface p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dim">
          Case file
        </span>
        <span className="rounded-full border border-edge bg-canvas px-2 py-0.5 text-[11px] text-dim">
          {extBadge(fileName)}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-ink">Ingested evidence</h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-canvas px-2.5 py-1 text-xs text-ink"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
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

      <div className="rounded-lg border border-dashed border-edge bg-canvas/50 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-ink">{fileName}</p>
        <p className="mt-0.5 truncate text-xs text-dim">
          {sizeLabel} · SHA–256 {shaLabel}
        </p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-dim">
          Sender
        </p>
        <p className={`truncate text-sm ${masked ? "text-dim" : "font-medium text-ink"}`}>
          {masked ? redactName(senderName) : senderName}
        </p>
        <p className={`truncate text-xs ${masked ? "text-dim" : "text-ink"}`}>
          {masked ? redactEmail(senderEmail) : senderEmail}
        </p>
        <p className="mt-1 text-[11px] text-dim">
          {masked
            ? "PII Masked for Investigator Protection"
            : "Full sender identity visible"}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-edge pt-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink">PII Masking</span>
          <span
            className={`rounded-full border border-edge bg-canvas px-2 py-0.5 text-[11px] ${
              masked ? "text-risk-green" : "text-risk-amber"
            }`}
          >
            {masked ? "Protected" : "Exposed"}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={masked}
          aria-label="PII Masking"
          disabled={!canMask}
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border disabled:cursor-not-allowed disabled:opacity-50 ${
            masked ? "border-accent bg-accent" : "border-edge bg-canvas"
          } ${canMask ? "cursor-pointer" : ""}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-surface transition-transform ${
              masked ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>

      {pinOpen ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-canvas/80 p-4">
          <form
            onSubmit={onVerify}
            className="w-full rounded-lg border border-edge bg-surface p-4"
          >
            <p className="text-sm text-ink">Investigator verification</p>
            <p className="mt-1 text-xs text-dim">
              Enter the 4-digit PIN to reveal raw PII.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value);
                setPinError("");
              }}
              className="mt-3 w-full rounded-lg border border-edge bg-canvas px-3 py-2 text-sm text-ink outline-none"
              placeholder="PIN"
              aria-label="Investigator PIN"
            />
            {pinError ? (
              <p className="mt-1 text-xs text-risk-red">{pinError}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePin}
                className="rounded-lg border border-edge bg-canvas px-3 py-1.5 text-xs text-dim"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg border border-accent bg-surface px-3 py-1.5 text-xs text-accent"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
