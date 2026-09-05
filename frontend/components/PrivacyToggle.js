export default function PrivacyToggle({ data, masked, setMasked }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-2">
      <span className="text-sm text-accent">PrivacyToggle</span>
      <span className="rounded-full border border-edge bg-canvas px-2 py-0.5 text-xs text-dim">
        Person 3
      </span>
    </div>
  );
}
