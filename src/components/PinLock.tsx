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

// Session-level PIN cache: skip re-entry within 15 minutes (like banking apps)
const PIN_SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

function getPinSessionKey(type: string) {
  return `rubjob_pin_verified_${type}`;
}

function isPinSessionValid(type: string): boolean {
  try {
    const raw = sessionStorage.getItem(getPinSessionKey(type));
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < PIN_SESSION_TIMEOUT_MS;
  } catch {
    return false;
  }
}

function savePinSession(type: string) {
  try {
    sessionStorage.setItem(getPinSessionKey(type), Date.now().toString());
  } catch {}
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
    // Check session cache first — skip PIN if recently verified
    if (isPinSessionValid(type)) {
      setIsLocked(false);
      setIsLoading(false);
      onVerified();
      return;
    }
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
        savePinSession(type);
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
        savePinSession(type);
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

  const currentValue = step === "confirm" ? confirmPin : pin;

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col pb-20">
      {/* Subtle brand gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      {/* Top Section: Header + Logo + Dots */}
      <div className="relative flex flex-col items-center pt-10 pb-4 px-6">
        {/* Back Button */}
        <div className="w-full flex items-start mb-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.back();
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 active:bg-slate-100 transition-all"
          >
            <Icons.Back size={22} />
          </button>
        </div>

        {/* App Logo */}
        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg shadow-primary/10 border border-primary/10 flex items-center justify-center mb-5 p-3">
          <img 
            src="/images/rubjob-complete_logo-color.png" 
            alt="Rubjob" 
            className="w-full h-full object-contain" 
          />
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-slate-900 mb-1 text-center">
          {step === "enter" ? t(`${type}.wallet.pin.enterTitle`) : 
           step === "setup" ? t(`${type}.wallet.pin.setupTitle`) : 
           t(`${type}.wallet.pin.confirmPin`)}
        </h1>
        <p className="text-xs font-medium text-slate-400 mb-8 text-center max-w-[260px] leading-relaxed">
          {t(`${type}.wallet.pin.instruction`)}
        </p>

        {/* PIN Dots — Brand CI color */}
        <div className="flex gap-5 mb-3">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < currentValue.length
                  ? "bg-primary border-primary scale-110 shadow-md shadow-primary/30" 
                  : "bg-transparent border-primary/30"
              }`}
            />
          ))}
        </div>

        {/* Step Label */}
        <p className="text-[11px] font-bold text-primary/60">
          {step === "enter" ? t(`${type}.wallet.pin.enterTitle`) : 
           step === "setup" ? t(`${type}.wallet.pin.setupTitle`) : 
           t(`${type}.wallet.pin.confirmPin`)}
        </p>

        {/* Error */}
        {error && (
          <div className="mt-3 animate-shake">
            <p className="text-xs font-bold text-white bg-rose-500 px-4 py-2 rounded-full shadow-lg shadow-rose-500/20 flex items-center gap-1.5">
              <Icons.AlertCircle size={14} />
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Spacer pushes numpad to bottom */}
      <div className="flex-1" />

      {/* Numpad — large banking-style with brand CI */}
      <div className="w-full bg-[#FAFAFA] border-t border-slate-100">
        <div className="max-w-md mx-auto grid grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="h-[72px] flex items-center justify-center text-[28px] font-bold text-slate-700 active:bg-primary/10 active:text-primary transition-colors border-b border-r border-slate-100/80 select-none"
            >
              {num}
            </button>
          ))}
          {/* Bottom row: back/empty, 0, delete */}
          <button
            onClick={() => {
              if (step === "confirm") {
                setStep("setup");
                setPin("");
                setConfirmPin("");
              }
            }}
            className="h-[72px] flex items-center justify-center text-slate-400 active:bg-primary/10 transition-colors border-b border-r border-slate-100/80 select-none"
          >
            {step === "confirm" && <Icons.Back size={24} />}
          </button>
          <button
            onClick={() => handleNumberClick(0)}
            className="h-[72px] flex items-center justify-center text-[28px] font-bold text-slate-700 active:bg-primary/10 active:text-primary transition-colors border-b border-r border-slate-100/80 select-none"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-[72px] flex items-center justify-center text-slate-400 active:bg-rose-50 active:text-rose-500 transition-colors border-b border-slate-100/80 select-none"
          >
            <Icons.Backspace size={28} />
          </button>
        </div>
        {/* Safe area padding for phones with home indicator */}
        <div className="h-[env(safe-area-inset-bottom,0px)] bg-[#FAFAFA]" />
        <div className="h-4 bg-[#FAFAFA]" /> {/* Extra padding for BottomNav */}
      </div>
    </div>
  );
}
