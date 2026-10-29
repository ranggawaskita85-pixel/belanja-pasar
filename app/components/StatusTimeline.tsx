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
              ? "bg-green-700"
              : "bg-stone-200";
        const lineRight =
          i === STEPS.length - 1
            ? "opacity-0"
            : isPast
              ? "bg-green-700"
              : "bg-stone-200";

        return (
          <li
            key={step.key}
            className="flex flex-1 flex-col items-center"
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              <div className={`h-px flex-1 ${lineLeft}`} />
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition ${
                  isPast
                    ? "border-green-700 bg-green-700 text-white"
                    : isCurrent
                      ? "border-green-700 bg-white text-green-700 ring-4 ring-green-700/10"
                      : "border-stone-300 bg-white text-stone-400"
                }`}
              >
                {isPast ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </div>
              <div className={`h-px flex-1 ${lineRight}`} />
            </div>
            <span
              className={`mt-2 text-center text-[10px] leading-tight ${
                isPast || isCurrent
                  ? "font-medium text-stone-800"
                  : "text-stone-400"
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
