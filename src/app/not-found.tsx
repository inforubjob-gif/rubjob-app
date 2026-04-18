"use client";

import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import Link from "next/link";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-gradient-to-b from-white to-orange-50/30 px-6 text-center overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="relative z-10 w-full max-w-lg mx-auto">
        <div className="mb-2 relative">
          <img 
            src="/images/มาสคอต-404.png" 
            alt="Confused Mascot 404" 
            className="w-full max-w-[320px] mx-auto animate-float drop-shadow-2xl"
          />
          <div className="absolute -top-10 -right-4 w-20 h-20 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center text-4xl shadow-xl border border-white/40 animate-bounce">
            ❓
          </div>
        </div>

        <div className="space-y-2 mb-10">
          <h1 className="text-4xl font-black text-slate-900 leading-tight">
            Oops! <span className="text-primaryer">404</span>
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase bg-white py-1 px-4 rounded-full inline-block border border-slate-100 shadow-sm">
            {t("common.notFoundTitle")}
          </p>
          <p className="text-sm text-slate-500 font-bold max-w-[280px] leading-relaxed mx-auto pt-4">
            {t("common.notFoundDesc").split("\n").map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </p>
        </div>

        <Link href="/">
          <Button 
            className="px-12 bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase shadow-2xl shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-3 mx-auto"
          >
            <span>{t("common.goHome")}</span>
            <Icons.ArrowRight size={20} />
          </Button>
        </Link>
      </div>

      <div className="absolute bottom-10 left-0 right-0 text-center opacity-20">
        <Icons.Logo variant="color" size={120} className="mx-auto grayscale" />
      </div>
    </div>
  );
}
