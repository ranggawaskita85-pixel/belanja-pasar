import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900",
  secondary:
    "border border-zinc-400 bg-white text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100",
  danger: "bg-red-700 text-white hover:bg-red-800 active:bg-red-900",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: keyof typeof variants;
  /** true = selebar kontainer (bawaan). false = selebar isinya. */
  block?: boolean;
};

export default function Button({
  children,
  loading,
  variant = "primary",
  block = true,
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
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        block ? "w-full" : ""
      } ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />}
      {children}
    </button>
  );
}
