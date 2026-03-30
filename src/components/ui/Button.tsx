import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark active:scale-[0.97] shadow-sm",
  secondary:
    "bg-primary-light text-primary-dark hover:bg-amber-100 active:scale-[0.97]",
  ghost: "bg-transparent text-foreground hover:bg-surface-alt active:scale-[0.97]",
  outline:
    "bg-transparent border border-border text-foreground hover:bg-surface-alt active:scale-[0.97]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3.5 text-base rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-150 select-none
        disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
