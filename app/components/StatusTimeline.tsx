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
    <ol className="flex items-start">
      {STEPS.map((step, i) => {
        const isPast = i < current || (i === current && isFinal);
        const isCurrent = i === current && !isFinal;
        const lineLeft =
          i === 0
            ? "opacity-0"
            : isPast || isCurrent
              ? "bg-emerald-600"
              : "bg-stone-200";
        const lineRight =
          i === STEPS.length - 1
            ? "opacity-0"
            : isPast
              ? "bg-emerald-600"
              : "bg-stone-200";

        return (
          <li
            key={step.key}
            className="flex flex-1 flex-col items-center"
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${lineLeft}`} />
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                  isPast
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : isCurrent
                      ? "border-emerald-600 bg-white text-emerald-700 ring-4 ring-emerald-600/15"
                      : "border-stone-300 bg-white text-stone-400"
                }`}
              >
                {isPast ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </div>
              <div className={`h-0.5 flex-1 ${lineRight}`} />
            </div>
            <span
              className={`mt-2 text-center text-sm leading-tight ${
                isPast || isCurrent
                  ? "font-bold text-stone-800"
                  : "font-medium text-stone-400"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
