"use client";

import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface GlobalSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  fullWidth?: boolean;
}

export default function GlobalSelect({
  label,
  options,
  fullWidth = true,
  className = "",
  ...rest
}: GlobalSelectProps) {
  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
          {label}
        </label>
      )}
      <select
        className={`
          bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold
          focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none
          appearance-none
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
