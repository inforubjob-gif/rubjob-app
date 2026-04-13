"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";
import { useLiff } from "@/components/providers/LiffProvider";

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useLiff();
  const [settings, setSettings] = useState({
    orderStatus: true,
    promotions: false,
    linePush: true,
    email: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch settings from API
  useEffect(() => {
    if (!profile?.userId) return;
    async function fetchSettings() {
      try {
        const res = await fetch(`/api/user/settings?userId=${profile?.userId}`);
        const data = await res.json() as any;
        if (data.settings?.notifications) {
          setSettings(prev => ({ ...prev, ...data.settings.notifications }));
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [profile?.userId]);

  const toggle = async (key: keyof typeof settings) => {
    const newValue = !settings[key];
    const updatedSettings = { ...settings, [key]: newValue };
    
    // Optimistic Update
    setSettings(updatedSettings);

    if (!profile?.userId) return;

    try {
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.userId,
          settings: {
            notifications: updatedSettings
          }
        }),
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
      // Revert on failure
      setSettings(prev => ({ ...prev, [key]: !newValue }));
      alert("Failed to save settings");
    }
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
