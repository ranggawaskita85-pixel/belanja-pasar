import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  accent: "bg-amber-400 text-stone-900 shadow-sm hover:bg-amber-300",
  secondary:
    "border-2 border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: keyof typeof variants;
};

export default function Button({
  children,
  loading,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      disabled={disabled || loading}
      className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />}
      {children}
    </button>
  );
}
