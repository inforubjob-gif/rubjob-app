"use client";

import React, { useEffect } from "react";
import { Icons } from "./Icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="bg-white w-full max-w-lg rounded-t-xl sm:rounded-xl p-8 pb-12 relative z-10 animate-slide-up shadow-2xl flex flex-col items-center">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden" />
        
        {title && (
          <h3 className="text-xl font-black text-slate-900 mb-6 text-center">{title}</h3>
        )}

        {children}

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors sm:flex hidden"
        >
          <Icons.Close size={20} />
        </button>
      </div>
    </div>
  );
}
