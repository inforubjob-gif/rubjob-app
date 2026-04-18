"use client";

import { useState, useEffect } from "react";
import { Icons } from "./Icons";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const typeConfig = {
    success: { icon: <Icons.Check size={18} />, bg: "bg-emerald-500", text: "text-white" },
    error: { icon: <Icons.Lock size={18} />, bg: "bg-danger", text: "text-white" },
    info: { icon: <Icons.Package size={18} />, bg: "bg-primary", text: "text-white" },
  };

  const config = typeConfig[type];

  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl ${config.bg} ${config.text}`}>
      <div className="shrink-0">{config.icon}</div>
      <p className="text-xs font-black uppercase whitespace-nowrap">{message}</p>
    </div>
  );
}
