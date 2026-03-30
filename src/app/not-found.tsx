"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh] px-5 text-center">
      <div className="w-64 h-64 mb-8 animate-bounce-slow">
        <img 
          src="/images/icon/icon-404-page-not-found.png" 
          alt="404 Not Found" 
          className="w-full h-full object-contain"
        />
      </div>
      <h1 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
        {t("common.notFoundTitle")}
      </h1>
      <p className="text-sm text-slate-500 font-medium mb-10 max-w-[280px] leading-relaxed whitespace-pre-line">
        {t("common.notFoundDesc")}
      </p>
      <Link href="/">
        <Button className="px-10 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs">
          {t("common.goHome")}
        </Button>
      </Link>
    </div>
  );
}
