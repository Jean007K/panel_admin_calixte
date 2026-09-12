function tone(status: string): string {
  switch (status) {
    case "active":
      return "var(--success)";
    case "suspended":
    case "disabled":
    case "closed":
    case "cancelled":
      return "var(--danger)";
    case "locked":
    case "pending":
    case "processing":
    case "manufacturing":
    case "shipping":
    case "activation":
    case "frozen":
      return "var(--warning)";
    default:
      return "var(--text-muted)";
  }
}

export function StatusChip({ status, label }: { status: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-[var(--text)]">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: tone(status) }}
        aria-hidden
      />
      {label ?? status}
    </span>
  );
}
