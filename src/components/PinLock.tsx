"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface PinLockProps {
  type: "rider" | "store";
  onVerified: () => void;
  children: React.ReactNode;
}

export default function PinLock({ type, onVerified, children }: PinLockProps) {
  const { t } = useTranslation();
  const [isLocked, setIsLocked] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [step, setStep] = useState<"enter" | "setup" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const res = await fetch(`/api/user/pin?type=${type}`);
      const data = await res.json();
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
    setError("");
    if (step === "confirm") {
      if (confirmPin.length < 6) setConfirmPin(prev => prev + num.toString());
    } else {
      if (pin.length < 6) setPin(prev => prev + num.toString());
    }
  };

  const handleDelete = () => {
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
        setupPin();
      } else {
        setError(t(`${type}.wallet.pin.mismatch`));
        setConfirmPin("");
      }
    }
  }, [pin, confirmPin]);

  const verifyPin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin, type })
      });
      const data = await res.json();
      if (data.success) {
        setIsLocked(false);
        onVerified();
      } else {
        setError(t(`${type}.wallet.pin.error`));
        setPin("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupPin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", pin, type })
      });
      const data = await res.json();
      if (data.success) {
        // We can use a custom toast here if available, but alert is fine for now as per plan
        setIsLocked(false);
        onVerified();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-dvh animate-fade-in p-6 z-[9999]">
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full pt-10">
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
          <p className="text-xs font-bold text-rose-500 mb-8 animate-shake">
            {error}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="aspect-square rounded-2xl bg-white text-2xl font-black text-slate-700 shadow-sm border border-slate-100 active:bg-slate-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumberClick(0)}
            className="aspect-square rounded-2xl bg-white text-2xl font-black text-slate-700 shadow-sm border border-slate-100 active:bg-slate-50 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="aspect-square rounded-2xl text-slate-400 active:text-rose-500 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            <Icons.Close size={28} />
          </button>
        </div>
        
        {step === "confirm" && (
           <button 
             onClick={() => { setStep("setup"); setPin(""); setConfirmPin(""); }}
             className="mt-8 text-xs font-black text-primary uppercase tracking-widest cursor-pointer"
           >
             {t("common.back")}
           </button>
        )}
      </div>
    </div>
  );
}
