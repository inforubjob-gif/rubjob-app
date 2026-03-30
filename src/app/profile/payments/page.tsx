"use client";

import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";

import { useState, useEffect } from "react";
import { useLiff } from "@/components/providers/LiffProvider";

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useLiff();
  const [prefs, setPrefs] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.userId) return;
    setIsLoading(true);
    fetch(`/api/users/preferences?userId=${profile.userId}`)
      .then(res => res.json())
      .then((data: any) => {
         if (data.preferences) setPrefs(data.preferences);
      })
      .finally(() => setIsLoading(false));
  }, [profile?.userId]);

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">{t("profile.paymentsPage.title")}</h1>
      </header>

      <main className="p-5 space-y-6">
        <section>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t("profile.paymentsPage.savedCards")}</p>
          {isLoading ? (
             <div className="p-5 flex justify-center text-slate-300">...</div>
          ) : prefs?.savedCards?.length > 0 ? (
            prefs.savedCards.map((card: any, idx: number) => (
              <Card key={idx} className="p-5 bg-gradient-to-br from-indigo-500 via-primary to-orange-400 text-white relative overflow-hidden shadow-2xl shadow-primary/20 mb-4">
                 <div className="relative z-10">
                   <div className="flex justify-between items-start mb-8">
                     <span className="text-lg font-bold italic tracking-wider">{card.brand || "CARD"}</span>
                     <span className="text-xs opacity-60">{t("profile.paymentsPage.creditCard")}</span>
                   </div>
                   <p className="text-lg font-mono tracking-[0.2em] mb-4">•••• •••• •••• {card.last4 || "0000"}</p>
                   <div className="flex justify-between items-end">
                     <span className="text-[10px] uppercase opacity-60">{t("profile.paymentsPage.cardHolder")}</span>
                     <span className="text-sm font-bold">{profile?.displayName || t("common.guest")}</span>
                   </div>
                 </div>
                 <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
              </Card>
            ))
          ) : (
             <div className="p-5 text-center border-2 border-dashed border-slate-200 rounded-2xl">
               <p className="text-sm font-bold text-slate-400">{t("profile.paymentsPage.noSavedCards") || "No saved cards"}</p>
             </div>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("profile.paymentsPage.otherOptions")}</p>
          <Card className="p-4 flex items-center justify-between" hoverable>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🏦</div>
              <div>
                <p className="text-sm font-bold">{t("profile.paymentsPage.bankTransfer")}</p>
                <p className="text-[10px] text-slate-500">{t("profile.paymentsPage.promptPayQR")}</p>
              </div>
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-primary" />
          </Card>
          <button className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold hover:border-primary hover:text-primary transition-colors">
            {t("profile.paymentsPage.addNew")}
          </button>
        </section>
      </main>
    </div>
  );
}
