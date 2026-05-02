"use client";

import { useEffect, useState, useRef } from "react";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface PinLockProps {
  type: "rider" | "store" | "customer";
  userId?: string;
  onVerified: () => void;
  children: React.ReactNode;
}

export default function PinLock({ type, userId, onVerified, children }: PinLockProps) {
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

  if (isLoading && !pin && !confirmPin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLocked) {
    return <>{children}</>;
  }

  useEffect(() => {
    // Force focus on mount to trigger keyboard
    const timer = setTimeout(() => {
      pinInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-slate-50 z-[10000] flex flex-col overflow-hidden touch-none"
      onClick={() => pinInputRef.current?.focus()}
    >
      {/* Top Header with Back Button - High Z-index to be clickable */}
      <header className="px-5 pt-12 pb-4 flex items-center relative z-[1000]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.back();
          }}
          className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 active:scale-95 transition-transform"
        >
          <Icons.Back size={18} />
        </button>
      </header>

      {/* Moved items up with pt-4 and justify-start to avoid keyboard overlap */}
      <div className="flex-1 flex flex-col items-center justify-start max-w-sm mx-auto w-full pt-4 pb-20 relative z-10">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-primary/5">
          <Icons.Lock size={40} />
        </div>
        
        <h1 className="text-xl font-black text-slate-900 mb-2">
          {step === "enter" ? t(`${type}.wallet.pin.enterTitle`) : 
           step === "setup" ? t(`${type}.wallet.pin.setupTitle`) : 
           t(`${type}.wallet.pin.confirmPin`)}
        </h1>
        <p className="text-xs font-bold text-slate-400 mb-10 text-center px-4">
          {t(`${type}.wallet.pin.instruction`)}
        </p>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-12">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                (step === "confirm" ? i < confirmPin.length : i < pin.length)
                  ? "bg-primary border-primary scale-110 shadow-lg shadow-primary/30" 
                  : "bg-white border-slate-200"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-[11px] font-black text-rose-500 mb-8 animate-shake bg-rose-50 px-4 py-2 rounded-full border border-rose-100">
            {error}
          </p>
        )}

        {/* Hidden Input - covering area but below header */}
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
          className="absolute inset-0 w-full h-full opacity-0 z-[100] cursor-default"
          id="pin-input"
        />

        {step === "confirm" && (
           <button 
             onClick={(e) => { 
               e.stopPropagation();
               setStep("setup"); 
               setPin(""); 
               setConfirmPin(""); 
             }}
             className="mt-8 text-xs font-black text-primary uppercase cursor-pointer relative z-[200]"
           >
             {t("common.back")}
           </button>
        )}
      </div>
    </div>
  );
}
