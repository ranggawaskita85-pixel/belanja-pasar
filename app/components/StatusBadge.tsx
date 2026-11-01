const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Belum Dikirim",
    className: "border-zinc-500 bg-zinc-100 text-zinc-800",
  },
  sent: {
    label: "Menunggu Harga",
    className: "border-sky-600 bg-sky-50 text-sky-900",
  },
  priced: {
    label: "Menunggu Persetujuan",
    className: "border-amber-500 bg-amber-50 text-amber-950",
  },
  approved: {
    label: "Disetujui",
    className: "border-indigo-600 bg-indigo-50 text-indigo-900",
  },
  paid: {
    label: "Sudah Transfer",
    className: "border-emerald-600 bg-emerald-50 text-emerald-900",
  },
  completed: {
    label: "Selesai",
    className: "border-emerald-800 bg-emerald-700 text-white",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status.toLowerCase()] ?? statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center rounded-sm border-l-4 px-2 py-1 text-xs font-bold uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}
