"use client";

import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function LanguagePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">{t("profile.language")}</h1>
      </header>

      <main className="p-5 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase mb-3">
          {t("profile.selectLanguage")}
        </p>
        <Card className="divide-y divide-slate-100 overflow-hidden">
          <LanguageOption 
            label="English" 
            flag="🇺🇸" 
            isSelected={language === "en"} 
            onSelect={() => setLanguage("en")} 
          />
          <LanguageOption 
            label="ภาษาไทย (Thai)" 
            flag="🇹🇭" 
            isSelected={language === "th"} 
            onSelect={() => setLanguage("th")} 
          />
        </Card>

        <section className="pt-4 text-center">
            <p className="text-xs text-slate-400">
               {t("common.comingSoon")}
            </p>
        </section>
      </main>
    </div>
  );
}

function LanguageOption({ label, flag, isSelected, onSelect }: { label: string, flag: string, isSelected: boolean, onSelect: () => void }) {
  return (
    <button 
      onClick={onSelect}
      className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl">{flag}</span>
        <span className={`text-sm font-bold ${isSelected ? 'text-primary-dark' : 'text-slate-700'}`}>{label}</span>
      </div>
      {isSelected && (
        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
      )}
    </button>
  );
}
