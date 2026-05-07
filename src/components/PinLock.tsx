"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface PinLockProps {
  type: "rubber" | "store" | "customer";
  userId?: string;
  onVerified: () => void;
  children: React.ReactNode;
}

export default function PinLock({ type, userId, onVerified, children }: PinLockProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLocked, setIsLocked] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [step, setStep] = useState<"enter" | "setup" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const url = `/api/user/pin?type=${type}${userId ? `&userId=${userId}` : ""}`;
      const res = await fetch(url);
      
      if (res.status === 401) {
        // Not logged in, redirect to respective portal login
        if (type === "rubber") router.replace("/rubber/login");
        else if (type === "store") router.replace("/partner/login");
        else if (type === "customer") router.replace("/");
        return;
      }

      const data = await res.json() as any;
      setHasPin(data.hasPin);
      if (!data.hasPin) {
        setStep("setup");
      } else {
        setStep("enter");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberClick = (num: number) => {
    if (isProcessing) return;
    setError("");
    if (step === "confirm") {
      if (confirmPin.length < 6) setConfirmPin(prev => prev + num.toString());
    } else {
      if (pin.length < 6) setPin(prev => prev + num.toString());
    }
  };

  const handleDelete = () => {
    if (isProcessing) return;
    if (step === "confirm") {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    if (step === "enter" && pin.length === 6) {
      verifyPin();
    } else if (step === "setup" && pin.length === 6) {
      setStep("confirm");
    } else if (step === "confirm" && confirmPin.length === 6) {
      if (pin === confirmPin) {
        if (!isProcessing) setupPin();
      } else {
        setError(t(`${type}.wallet.pin.mismatch`));
        setConfirmPin("");
      }
    }
  }, [pin, confirmPin]);

  const verifyPin = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/user/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin, type, userId })
      });
      const data = await res.json() as any;
      if (data.success) {
        setIsLocked(false);
        onVerified();
      } else {
        setError(data.error || t(`${type}.wallet.pin.error`));
        setPin("");
      }
    } catch (err) {
      console.error(err);
      setError(t("common.error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const setupPin = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/user/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", pin, type, userId })
      });
      const data = await res.json() as any;
      if (data.success) {
        setIsLocked(false);
        onVerified();
      } else {
        setError(data.error || t("common.error"));
        // Reset confirmation if failure
        setStep("setup");
        setPin("");
        setConfirmPin("");
      }
    } catch (err) {
      console.error(err);
      setError(t("common.error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Try to focus on mount, but mobile browsers often block this
    const timer = setTimeout(() => {
      pinInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    // Force focus on mount to trigger keyboard
    if (!isLocked) return;
    const timer = setTimeout(() => {
      pinInputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, [isLocked, step]);

  if (isLoading && !pin && !confirmPin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div 
      className="fixed inset-0 bg-[#F8FAFC] z-[10000] flex flex-col touch-none overflow-hidden"
    >
      {/* Premium Background Decoration */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="px-5 pt-8 md:pt-14 pb-2 flex items-center relative z-[10002]">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.back();
          }}
          className="w-12 h-12 rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center text-slate-900 active:scale-95 transition-all pointer-events-auto"
        >
          <Icons.Back size={20} />
        </button>
      </header>

      <div 
        className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full px-6 py-2 relative z-10 min-h-0"
        onClick={() => pinInputRef.current?.focus()}
      >
        <div className="w-12 h-12 md:w-24 md:h-24 bg-white shadow-2xl shadow-primary/10 rounded-[1rem] md:rounded-[2.5rem] flex items-center justify-center mb-4 md:mb-10 border border-primary/10 relative shrink-0">
          <div className="absolute inset-0 bg-primary/5 rounded-[1rem] md:rounded-[2.5rem] animate-pulse" />
          <Icons.Shield size={24} className="text-primary relative z-10 md:hidden" fill={true} />
          <Icons.Shield size={44} className="text-primary relative z-10 hidden md:block" fill={true} />
        </div>
        
        <h1 className="text-lg md:text-2xl font-black text-slate-900 mb-1 text-center leading-tight">
          {step === "enter" ? t(`${type}.wallet.pin.enterTitle`) : 
           step === "setup" ? t(`${type}.wallet.pin.setupTitle`) : 
           t(`${type}.wallet.pin.confirmPin`)}
        </h1>
        <p className="text-[10px] md:text-[13px] font-bold text-slate-400 mb-6 md:mb-12 text-center leading-relaxed">
          {t(`${type}.wallet.pin.instruction`)}
        </p>

        {/* PIN Dots Area */}
        <div className="relative mb-6 md:mb-14">
          <div className="flex gap-4 md:gap-5 relative z-20">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 transition-all duration-300 ${
                  (step === "confirm" ? i < confirmPin.length : i < pin.length)
                    ? "bg-primary border-primary scale-110 shadow-xl shadow-primary/30" 
                    : "bg-white border-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="absolute -bottom-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {error && (
          <div className="mb-8 animate-shake">
            <p className="text-[11px] font-black text-white bg-rose-500 px-5 py-2.5 rounded-full shadow-lg shadow-rose-500/20 relative z-20 flex items-center gap-2">
              <Icons.AlertCircle size={14} />
              {error}
            </p>
          </div>
        )}

        {/* Interaction Area */}
        <div className="relative z-[60] flex flex-col items-center gap-4 mt-4">
          <button 
            onClick={() => pinInputRef.current?.focus()}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 group-active:scale-95 transition-all">
              <Icons.Lock size={18} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
              {t("common.tapToEnterPin") || "แตะเพื่อใส่รหัส"}
            </span>
          </button>

          {step === "confirm" && (
             <button 
               onClick={(e) => { 
                 e.stopPropagation();
                 setStep("setup"); 
                 setPin(""); 
                 setConfirmPin(""); 
               }}
               className="px-4 py-1.5 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 transition-colors"
             >
               {t("common.back")}
             </button>
          )}
        </div>

        {/* Hidden Input Layer */}
        <input
          ref={pinInputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={step === "confirm" ? confirmPin : pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
            if (step === "confirm") {
              setConfirmPin(val);
            } else {
              setPin(val);
            }
          }}
          autoFocus
          className="absolute inset-0 opacity-0 z-[50] cursor-default caret-transparent"
        />
      </div>

      {/* Decorative Brand Tag */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-20 pointer-events-none">
        <Icons.Logo size={14} variant="icon" />
      </div>
    </div>
  );
}
