"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useStoreAuth } from "@/components/providers/StoreProvider";

// Define SettingItem component for reuse
function SettingItem({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm"
    >
      <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
              {icon}
          </div>
          <div className="text-left">
              <p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">{label}</p>
              <p className="text-sm font-bold text-slate-800">{value}</p>
          </div>
      </div>
      <Icons.ChevronRight size={16} className="text-slate-200 group-hover:text-primary transition-colors" />
    </button>
  );
}

export default function StoreProfilePage() {
  const router = useRouter();
  const { store, logout } = useStoreAuth();
  const { language, setLanguage, t } = useTranslation();
  const [workStatus, setWorkStatus] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [prefs, setPrefs] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!store?.id) return;
    async function fetchPrefs() {
      try {
        const res = await fetch(`/api/store/preferences?storeId=${store?.id}`);
        const data = await res.json() as any;
        if (data.preferences) {
          setPrefs(data.preferences);
          if (data.preferences.workStatus !== undefined) {
             setWorkStatus(data.preferences.workStatus);
          }
        }
      } catch (err) {
        console.error("Failed to fetch preferences", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPrefs();
  }, [store?.id]);

  const handleToggleWorkStatus = async () => {
    const nextStatus = !workStatus;
    setWorkStatus(nextStatus);
    if (!store?.id) return;
    try {
      await fetch("/api/store/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store.id, workStatus: nextStatus })
      });
    } catch (err) {
      console.error("Failed to update work status", err);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Profile Header */}
      <header className="relative z-10 px-5 pt-3 pb-12">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-5 top-4 active:scale-95 transition-transform z-10"
        >
          <IconCircle variant="white" size="sm">
            <Icons.Back size={16} />
          </IconCircle>
        </button>

        <div className="flex items-center gap-4 mt-10">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold overflow-hidden ring-4 ring-white/30 shadow-lg">
            <div className="w-full h-full bg-white flex items-center justify-center text-primary font-black text-2xl">
              {store?.name?.[0] || "S"}
            </div>
          </div>
          <div className="text-white flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold truncate">
                {store?.name || t("common.guest")}
              </h1>
              {workStatus && <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50" />}
            </div>
            <p className="text-[10px] text-white/70 font-black uppercase tracking-wider mt-1 flex items-center gap-1.5">
              <Icons.Logo variant="icon" size={10} className="grayscale brightness-[100] invert" />
              {t("store.profile.verifiedHero")} #{String(store?.id || '').slice(-4)}
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 px-5 -mt-4 space-y-6 pb-24 animate-fade-in">
        {/* Status Section */}
        <section>
          <Card className="p-4 overflow-hidden border-none shadow-xl">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <IconCircle variant={workStatus ? "green" : "slate"} size="md">
                      <Icons.Shield size={22} />
                  </IconCircle>
                  <div>
                      <p className="text-xs font-black text-slate-400 uppercase leading-none mb-1">{t("store.profile.workStatus")}</p>
                      <p className={`text-sm font-black uppercase ${workStatus ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {workStatus ? t("store.profile.receivingJobs") : t("store.profile.notReceiving")}
                      </p>
                  </div>
               </div>
               <button 
                  onClick={handleToggleWorkStatus}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workStatus ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-100'}`}
               >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${workStatus ? 'transform translate-x-6' : ''}`} />
               </button>
             </div>
          </Card>
        </section>

        {/* Store Settings Menu */}
        <section>
          <h2 className="text-xs font-black text-slate-900 uppercase mb-3 px-1">{t("store.profile.settings")}</h2>
          <Card className="divide-y divide-slate-50 overflow-hidden shadow-xl">
            <button
              onClick={() => setShowLanguageModal(true)}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Globe size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.profile.language")}</p>
                <p className="text-[11px] text-slate-400">{language === "th" ? "ไทย (TH)" : "English (EN)"}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={() => router.push("/store/services")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Clipboard size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.laundryService")}</p>
                <p className="text-[11px] text-slate-400">{t("store.manageTask")}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={() => router.push("/store/profile/active-hours")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Clock size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.profile.activeHours")}</p>
                <p className="text-[11px] text-slate-400">{prefs?.activeHours || t("common.notSet")}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={() => router.push("/store/profile/payout-method")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Payment size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.profile.payoutMethod")}</p>
                <p className="text-[11px] text-slate-400">
                   {prefs?.payoutMethod ? `${prefs.payoutMethod.bank ? prefs.payoutMethod.bank.toUpperCase() : 'Account'} ***${String(prefs.payoutMethod.account || '').slice(-4)}` : t("common.notSet")}
                </p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-colors" />
            </button>
          </Card>
        </section>

        {/* Support Section */}
        <section>
          <h2 className="text-xs font-black text-slate-900 uppercase mb-3 px-1">{t("support.sectionTitle") || "ช่วยเหลือ"}</h2>
          <Card className="divide-y divide-slate-50 overflow-hidden shadow-xl">
            <button
              onClick={() => router.push("/store/support")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Chat size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("support.contactAdmin") || "ติดต่อแอดมิน"}</p>
                <p className="text-[11px] text-slate-400">{t("support.contactAdminDesc") || "แจ้งปัญหา / สอบถาม"}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-colors" />
            </button>
          </Card>
        </section>

        {/* Logout Button */}
        <button
          onClick={() => logout("/store")}
          className="w-full flex items-center gap-4 px-4 py-5 bg-white rounded-2xl shadow-xl hover:bg-rose-50 transition-colors text-left group"
        >
          <IconCircle variant="ghost" size="md" className="group-hover:text-rose-600 transition-colors">
            <Icons.LogOut size={20} />
          </IconCircle>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-rose-600">{t("store.profile.logout")}</p>
            <p className="text-[11px] text-rose-300 uppercase font-black">{t("store.profile.verifiedHero")} #{String(store?.id || '').slice(-4)}</p>
          </div>
        </button>

        {/* App Info */}
        <div className="text-center pb-8 pt-4">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">RUBJOB {t("common.version")} 1.0.0</p>
          <p className="text-[10px] text-slate-300 mt-2 flex items-center justify-center gap-1.5 font-bold">
            {t("common.madeInBangkok")} <Icons.Guarantee size={12} className="text-primary-dark opacity-50" /> Bangkok
          </p>
        </div>
      </div>

      {/* Language Modal (Dropdown Style) */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowLanguageModal(false)} />
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-xl p-8 pb-12 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden" />
            <h3 className="text-xl font-black text-slate-900 mb-6 text-center">{t("store.profile.selectLanguage")}</h3>
            <div className="space-y-3">
              {[
                { key: "th", label: "ภาษาไทย", sub: "Thai (TH)" },
                { key: "en", label: "English", sub: "English (EN)" },
              ].map((lang) => (
                <button
                  key={lang.key}
                  onClick={() => {
                    setLanguage(lang.key as any);
                    setShowLanguageModal(false);
                  }}
                  className={`w-full p-5 rounded-xl flex items-center justify-between transition-all ${
                    language === lang.key 
                      ? "bg-primary/5 border-2 border-primary" 
                      : "bg-slate-50 border-2 border-transparent"
                  }`}
                >
                  <div className="text-left">
                    <p className={`text-sm font-black ${language === lang.key ? "text-primary-dark" : "text-slate-800"}`}>{lang.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{lang.sub}</p>
                  </div>
                  {language === lang.key && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
                      <Icons.Check size={14} strokeWidth={4} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowLanguageModal(false)}
              className="w-full mt-8 py-4 bg-slate-100 text-slate-500 rounded-xl text-[12px] font-black uppercase"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsLink({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <button className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:text-primary transition-colors">
                    {icon}
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercaseer">{label}</p>
                    <p className="text-sm font-bold text-slate-900">{value}</p>
                </div>
            </div>
            <Icons.Search size={16} className="text-slate-200 rotate-180" />
        </button>
    )
}
