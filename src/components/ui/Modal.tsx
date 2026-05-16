"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icons } from "./Icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="bg-white w-full max-w-lg rounded-t-[1.75rem] sm:rounded-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8 relative z-10 animate-slide-up shadow-2xl flex flex-col max-h-[85dvh] overflow-y-auto">
        {/* Drag handle for mobile */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
        
        {title && (
          <h3 className="text-lg font-black text-slate-900 mb-4 text-center">{title}</h3>
        )}

        {children}

        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all sm:flex hidden"
        >
          <Icons.Close size={18} />
        </button>
      </div>
    </div>,
    document.body
  );
}
