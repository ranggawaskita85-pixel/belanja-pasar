const statusConfig: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-stone-100 text-stone-600",
    dot: "bg-stone-400",
  },
  sent: {
    label: "Terkirim",
    className: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  priced: {
    label: "Menunggu Persetujuan",
    className: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Disetujui",
    className: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
  paid: {
    label: "Sudah Transfer",
    className: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Selesai",
    className: "bg-green-800 text-white",
    dot: "bg-green-300",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status.toLowerCase()] ?? statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${config.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
