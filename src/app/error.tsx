"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 px-6 text-center">
      <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10 animate-bounce">
        <Icons.Lock size={48} strokeWidth={2.5} />
      </div>
      
      <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">{t("common.errorTitle")}</h1>
      <p className="text-sm text-slate-500 font-bold max-w-[280px] leading-relaxed mb-10">
        {t("common.errorDesc")}
      </p>

      <div className="w-full max-w-[200px] space-y-3">
        <Button 
          fullWidth 
          onClick={() => reset()}
          className="bg-primary text-white py-4 rounded-xl font-black uppercase"
        >
          {t("common.tryAgain")}
        </Button>
        <button 
          onClick={() => window.location.href = "/"}
          className="w-full py-3 text-slate-400 text-xs font-black uppercase"
        >
          {t("common.goHome")}
        </button>
      </div>
    </div>
  );
}
