export default function UploadPanel({ data, masked }) {
  return (
    <div className="flex min-h-[220px] flex-col rounded-lg border border-edge bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-dim">UploadPanel</span>
        <span className="rounded-full border border-edge bg-canvas px-2 py-0.5 text-xs text-dim">
          Person 1
        </span>
      </div>
    </div>
  );
}
