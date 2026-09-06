function subjectFrom(data) {
  return data?.metadata?.documentSubject || data?.sender?.name || "—";
}

function emailFrom(data) {
  return data?.metadata?.email || data?.sender?.email || "—";
}

function redactName(name) {
  if (!name || name === "—") return "*** ***";
  return name
    .trim()
    .split(/\s+/)
    .map(() => "***")
    .join(" ");
}

function redactEmail(email) {
  if (!email || email === "—" || !email.includes("@")) return "***@***.***";
  const [local, domain] = email.split("@");
  const tld = domain.includes(".") ? domain.slice(domain.lastIndexOf(".")) : ".***";
  return `${"*".repeat(Math.max(local.length, 3))}@${"*".repeat(Math.max(domain.length - tld.length, 3))}${tld}`;
}

export default function PrivacyToggle({ data, masked, setMasked }) {
  const maskingAvailable = data?.masked_view_available !== false;
  const name = subjectFrom(data);
  const email = emailFrom(data);

  return (
    <div className="inline-flex min-w-0 max-w-full flex-col gap-2 rounded-lg border border-edge bg-surface px-3 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={masked}
        aria-label="Mask Personal Information"
        disabled={!maskingAvailable}
        onClick={() => setMasked(!masked)}
        className={`inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          maskingAvailable ? "cursor-pointer" : ""
        }`}
      >
        <span className="text-sm text-ink">Mask Personal Information</span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border ${
            masked ? "border-accent bg-accent" : "border-edge bg-canvas"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-surface transition-transform ${
              masked ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </span>
      </button>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
        <dt className="text-dim">Subject</dt>
        <dd className={`truncate ${masked ? "tracking-wider text-dim" : "text-ink"}`}>
          {masked ? redactName(name) : name}
        </dd>
        <dt className="text-dim">Email</dt>
        <dd className={`truncate ${masked ? "tracking-wider text-dim" : "text-ink"}`}>
          {masked ? redactEmail(email) : email}
        </dd>
      </dl>
    </div>
  );
}
