"use client";

import { type InputHTMLAttributes, type ReactNode, useState, useCallback } from "react";

type InputVariant = "default" | "large" | "search";

interface GlobalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  variant?: InputVariant;
  fullWidth?: boolean;
  asyncValidate?: (value: string) => Promise<string | undefined>;
}

const variantStyles: Record<InputVariant, string> = {
  default:
    "bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none",
  large:
    "bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-4 text-lg font-bold focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none",
  search:
    "bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-primary/20 transition-all outline-none",
};

export default function GlobalInput({
  label,
  error,
  icon,
  variant = "default",
  fullWidth = true,
  asyncValidate,
  className = "",
  onBlur,
  ...rest
}: GlobalInputProps) {
  const [asyncError, setAsyncError] = useState<string | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);

  const displayError = error || asyncError;

  const handleBlur = useCallback(
    async (e: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(e);
      if (asyncValidate) {
        setIsValidating(true);
        try {
          const result = await asyncValidate(e.target.value);
          setAsyncError(result);
        } catch {
          setAsyncError(undefined);
        } finally {
          setIsValidating(false);
        }
      }
    },
    [onBlur, asyncValidate]
  );

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={`
            ${variantStyles[variant]}
            ${icon ? "pl-12" : ""}
            ${fullWidth ? "w-full" : ""}
            ${displayError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}
            ${isValidating ? "opacity-70" : ""}
            ${className}
          `}
          onBlur={handleBlur}
          {...rest}
        />
      </div>
      {displayError && (
        <p className="text-xs text-rose-500 font-bold mt-1.5 ml-1 animate-fade-in">
          {displayError}
        </p>
      )}
    </div>
  );
}
