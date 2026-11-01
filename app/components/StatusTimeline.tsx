import { Check } from "lucide-react";

const STEPS = [
  { key: "draft", label: "Daftar" },
  { key: "harga", label: "Harga" },
  { key: "bayar", label: "Bayar" },
  { key: "selesai", label: "Selesai" },
];

const statusToStep: Record<string, number> = {
  draft: 0,
  sent: 0,
  priced: 1,
  approved: 2,
  paid: 2,
  completed: 3,
};

export default function StatusTimeline({ status }: { status: string }) {
  const current = statusToStep[status.toLowerCase()] ?? 0;
  const isFinal = status.toLowerCase() === "completed";

  return (
    <ol className="grid grid-cols-4 gap-1.5">
      {STEPS.map((step, i) => {
        const isPast = i < current || (i === current && isFinal);
        const isCurrent = i === current && !isFinal;

        return (
          <li key={step.key} aria-current={isCurrent ? "step" : undefined}>
            <div
              className={`h-2 rounded-sm ${
                isPast
                  ? "bg-emerald-700"
                  : isCurrent
                    ? "bg-emerald-500"
                    : "bg-zinc-300"
              }`}
            />
            <div
              className={`mt-1.5 flex items-center gap-1 text-xs uppercase tracking-wide ${
                isPast
                  ? "font-semibold text-emerald-800"
                  : isCurrent
                    ? "font-bold text-zinc-900"
                    : "font-medium text-zinc-400"
              }`}
            >
              {isPast && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {step.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
