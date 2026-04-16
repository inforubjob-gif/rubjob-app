"use client";

import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import Link from "next/link";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 px-6 text-center">
      <div className="text-[120px] font-black text-slate-100 leading-none mb-4 select-none">404</div>
      
      <div className="relative -mt-20">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-xl shadow-primary/5">
          <Icons.MapPin size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">{t("common.notFoundTitle")}</h1>
        <p className="text-sm text-slate-500 font-bold max-w-[280px] leading-relaxed mb-10 mx-auto">
          {t("common.notFoundDesc").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 && <br/>}</span>
          ))}
        </p>

        <Link href="/">
          <Button 
            className="px-10 bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest"
          >
            {t("common.goHome")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
