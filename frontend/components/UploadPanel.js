function formatFileSize(kb) {
  if (typeof kb !== "number" || Number.isNaN(kb)) return "—";
  if (kb >= 1024) {
    const mb = kb / 1024;
    return `${mb >= 10 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
  }
  return `${Math.round(kb)} KB`;
}

function fileKind(filename) {
  const ext = String(filename || "").split(".").pop()?.toLowerCase();
  if (ext === "msg" || ext === "eml") return ext.toUpperCase();
  return "FILE";
}

function maskName(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const first = part[0] || "•";
      return `${first}${"•".repeat(Math.max(part.length - 1, 3))}`;
    })
    .join(" ") || "••••";
}

function maskLabel(part) {
  return `${part[0] || "•"}••••`;
}

function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at < 0) return "••••@••••";
  const local = value.slice(0, at);
  const parts = value.slice(at + 1).split(".").filter(Boolean);
  if (parts.length === 0) return `${maskLabel(local)}@••••`;
  if (parts.length === 1) return `${maskLabel(local)}@${maskLabel(parts[0])}`;
  const tld = parts[parts.length - 1];
  const labels = parts.slice(0, -1).map(maskLabel);
  return `${maskLabel(local)}@${labels.join(".")}.${tld}`;
}

function shortHash(sha256) {
  const value = String(sha256 || "");
  if (value.length < 16) return value || "—";
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export default function UploadPanel({ data, masked }) {
  const filename = data?.filename || "Unknown file";
  const sizeLabel = formatFileSize(data?.file_size_kb);
  const kind = fileKind(filename);
  const senderName = data?.sender?.name || "Unknown sender";
  const senderEmail = data?.sender?.email || "unknown@unknown";
  const displayName = masked ? maskName(senderName) : senderName;
  const displayEmail = masked ? maskEmail(senderEmail) : senderEmail;

  return (
    <div className="flex min-h-[220px] flex-col rounded-lg border border-edge bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-dim">Case file</p>
          <h2 className="mt-1 text-sm font-medium text-ink">Ingested evidence</h2>
        </div>
        <span className="rounded-full border border-edge bg-canvas px-2 py-0.5 text-xs text-accent">
          {kind}
        </span>
      </div>

      <div className="rounded-lg border border-dashed border-edge bg-canvas px-3 py-3">
        <p className="truncate font-medium text-ink" title={filename}>
          {filename}
        </p>
        <p className="mt-1 text-xs text-dim">
          {sizeLabel}
          <span className="mx-1.5 text-edge">·</span>
          <span className="font-mono">SHA-256 {shortHash(data?.sha256)}</span>
        </p>
      </div>

      <dl className="mt-4 grid gap-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-dim">Sender</dt>
          <dd className="mt-1 text-sm text-ink">{displayName}</dd>
          <dd
            className={`mt-0.5 truncate font-mono text-xs ${masked ? "text-dim" : "text-accent"}`}
            title={masked ? undefined : senderEmail}
          >
            {displayEmail}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between pt-3 text-xs text-dim">
        <span>
          {masked ? "PII masked for sharing" : "Full sender identity visible"}
        </span>
        <span className="text-dim">.eml / .msg</span>
      </div>
    </div>
  );
}
