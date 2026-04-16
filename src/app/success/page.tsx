"use client";

import Link from "next/link";
import { Icons } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function SuccessPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 px-6 text-center animate-fade-in">
      <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-10 shadow-xl shadow-emerald-500/10 animate-bounce">
        <Icons.Check size={48} strokeWidth={3} />
      </div>
      
      <div className="space-y-3 mb-12">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
          {t("success.title")}
        </h1>
        <p className="text-slate-500 font-bold text-lg">
          {t("success.thanks")}
        </p>
        <p className="text-sm text-slate-400 max-w-[280px] mx-auto leading-relaxed">
          {t("success.desc")}
        </p>
      </div>

      <div className="w-full max-w-[240px]">
        <Link href="/">
          <Button 
            fullWidth 
            className="bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30"
          >
            {t("common.goHome")}
          </Button>
        </Link>
      </div>

      <div className="mt-16 opacity-30">
        <Icons.Logo size={32} />
      </div>
    </div>
  );
}
