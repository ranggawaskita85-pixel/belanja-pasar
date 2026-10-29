import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-green-800 text-white hover:bg-green-900",
  secondary:
    "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
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
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
      )}
      {children}
    </button>
  );
}
