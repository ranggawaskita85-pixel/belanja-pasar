import {
  FileEdit,
  Send,
  Tag,
  ThumbsUp,
  Wallet,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; className: string; Icon: LucideIcon }
> = {
  draft: {
    label: "Belum Dikirim",
    className: "bg-stone-100 text-stone-700 ring-stone-300",
    Icon: FileEdit,
  },
  sent: {
    label: "Menunggu Harga",
    className: "bg-sky-100 text-sky-800 ring-sky-300",
    Icon: Send,
  },
  priced: {
    label: "Menunggu Persetujuan",
    className: "bg-amber-100 text-amber-900 ring-amber-300",
    Icon: Tag,
  },
  approved: {
    label: "Disetujui",
    className: "bg-indigo-100 text-indigo-800 ring-indigo-300",
    Icon: ThumbsUp,
  },
  paid: {
    label: "Sudah Transfer",
    className: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    Icon: Wallet,
  },
  completed: {
    label: "Selesai",
    className: "bg-green-700 text-white ring-green-800",
    Icon: CheckCircle2,
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status.toLowerCase()] ?? statusConfig.draft;
  const { Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${config.className}`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      {config.label}
    </span>
  );
}
