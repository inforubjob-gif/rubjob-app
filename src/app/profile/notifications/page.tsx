"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    orderStatus: true,
    promotions: false,
    linePush: true,
    email: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">{t("profile.notificationsPage.title")}</h1>
      </header>

      <main className="p-5 space-y-6">
        <section className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("profile.notificationsPage.orderUpdates")}</p>
          <Card className="divide-y divide-slate-100">
            <NotificationToggle 
              label={t("profile.notificationsPage.orderStatus")} 
              desc={t("profile.notificationsPage.orderStatusDesc")} 
              isActive={settings.orderStatus} 
              onToggle={() => toggle("orderStatus")} 
            />
            <NotificationToggle 
              label={t("profile.notificationsPage.linePush")} 
              desc={t("profile.notificationsPage.linePushDesc")} 
              isActive={settings.linePush} 
              onToggle={() => toggle("linePush")} 
            />
          </Card>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("profile.notificationsPage.marketing")}</p>
          <Card className="divide-y divide-slate-100">
            <NotificationToggle 
              label={t("profile.notificationsPage.promotions")} 
              desc={t("profile.notificationsPage.promotionsDesc")} 
              isActive={settings.promotions} 
              onToggle={() => toggle("promotions")} 
            />
            <NotificationToggle 
              label={t("profile.notificationsPage.email")} 
              desc={t("profile.notificationsPage.emailDesc")} 
              isActive={settings.email} 
              onToggle={() => toggle("email")} 
            />
          </Card>
        </section>
      </main>
    </div>
  );
}

function NotificationToggle({ label, desc, isActive, onToggle }: { label: string, desc: string, isActive: boolean, onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-primary' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}
