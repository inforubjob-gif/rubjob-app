"use client";

import type { TextareaHTMLAttributes } from "react";

interface GlobalTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export default function GlobalTextarea({
  label,
  error,
  fullWidth = true,
  className = "",
  ...rest
}: GlobalTextareaProps) {
  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
          {label}
        </label>
      )}
      <textarea
        className={`
          bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold
          focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none
          resize-none
          ${fullWidth ? "w-full" : ""}
          ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : ""}
          ${className}
        `}
        {...rest}
      />
      {error && (
        <p className="text-xs text-rose-500 font-bold mt-1.5 ml-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
