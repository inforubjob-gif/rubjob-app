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
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">{label}</p>
              <p className="text-sm font-bold text-slate-800 tracking-tight">{value}</p>
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
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <header className="bg-primary text-white px-5 pt-12 pb-10 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 rounded-full -ml-16 -mt-16 blur-2xl" />
        <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center p-1 border-2 border-orange-100/50">
                <div className="w-full h-full rounded-2xl bg-orange-50 flex items-center justify-center text-primary overflow-hidden font-black text-xl">
                    {store?.name?.[0] || "S"}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-primary rounded-full shadow-sm" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold tracking-tight truncate">
                {store?.name || t("common.guest")}
              </h1>
              <p className="text-[10px] text-white/80 font-black uppercase tracking-[0.2em]">{t("store.profile.verifiedHero")} {store?.id}</p>
            </div>
        </div>
      </header>

      <div className="flex-1 px-5 pt-6 space-y-7 pb-24 animate-fade-in">
        {/* Toggle Status */}
        <Card className="p-5 border-none shadow-sm shadow-primary/5 rounded-2xl bg-white border border-primary/10">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-sm shadow-emerald-500/10">
                    <Icons.Shield size={22} />
                </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t("store.profile.workStatus")}</h3>
            <p className="text-[10px] text-emerald-500 font-bold uppercase">{workStatus ? t("store.profile.receivingJobs") : t("store.profile.notReceiving")}</p>
          </div>
        </div>
        <button 
          onClick={handleToggleWorkStatus}
          className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workStatus ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-200'}`}
        >
          <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${workStatus ? 'transform translate-x-6' : ''}`} />
        </button>
      </div>
    </Card>

        <section>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] mb-4 pl-1">{t("store.profile.settings")}</p>
          <div className="space-y-3">
             <SettingItem 
                icon={<Icons.Globe size={20} />} 
                label={t("store.profile.language")} 
                value={language === "th" ? "ไทย (TH)" : language === "en" ? "English (EN)" : "Chinese (ZH)"}
                onClick={() => setShowLanguageModal(true)}
             />
              <SettingItem 
                 icon={<Icons.Clipboard size={20} />} 
                 label={t("store.laundryService")} 
                 value={t("store.manageTask")} 
                 onClick={() => router.push("/store/services")}
              />
              <SettingItem 
                 icon={<Icons.Clock size={20} />} 
                 label={t("store.profile.activeHours")} 
                 value={prefs?.activeHours || t("common.notSet")} 
                 onClick={() => router.push("/store/profile/active-hours")}
              />
             <SettingItem 
                icon={<Icons.Payment size={20} />} 
                label={t("store.profile.payoutMethod")} 
                value={prefs?.payoutMethod ? `${prefs.payoutMethod.bank ? prefs.payoutMethod.bank.toUpperCase() : 'Account'} ***${String(prefs.payoutMethod.account || '').slice(-4)}` : t("common.notSet")} 
                onClick={() => router.push("/store/profile/payout-method")}
             />
          </div>
        </section>

         {/* Support */}
         <section>
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] mb-4 pl-1">{t("support.sectionTitle") || "ช่วยเหลือ"}</p>
           <div className="space-y-3">
              <SettingItem 
                 icon={<Icons.Chat size={20} />} 
                 label={t("support.contactAdmin") || "ติดต่อแอดมิน"} 
                 value={t("support.contactAdminDesc") || "แจ้งปัญหา / สอบถาม"}
                 onClick={() => router.push("/store/support")}
              />
           </div>
         </section>

        <section>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] mb-4 pl-1">{t("store.profile.account")}</p>
          <button 
            onClick={() => logout("/store")}
            className="w-full p-5 bg-white rounded-2xl border border-slate-100 flex items-center gap-4 active:scale-95 transition-all shadow-sm"
          >
             <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <Icons.LogOut size={20} />
             </div>
             <span className="text-sm font-black text-red-500 uppercase tracking-tight">{t("store.profile.logout")}</span>
          </button>
        </section>
       </div>

        {/* Language Modal (Dropdown Style) */}
        {showLanguageModal && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-fade-in">
            <div className="absolute inset-0 bg-primary-dark/40 backdrop-blur-md" onClick={() => setShowLanguageModal(false)} />
            <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-2xl p-8 pb-12 relative z-10 animate-slide-up shadow-2xl">
              <div className="w-12 h-1.5 bg-orange-100 rounded-full mx-auto mb-8 sm:hidden" />
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
                   className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all ${
                     language === lang.key 
                       ? "bg-primary/5 border-2 border-primary" 
                       : "bg-slate-50 border-2 border-transparent"
                   }`}
                 >
                   <div className="text-left">
                     <p className={`text-sm font-black ${language === lang.key ? "text-primary-dark" : "text-slate-800"}`}>{lang.label}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lang.sub}</p>
                   </div>
                   {language === lang.key && (
                     <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-slate-900 shadow-lg">
                       <Icons.Check size={14} strokeWidth={4} className="text-white" />
                     </div>
                   )}
                 </button>
               ))}
             </div>
             <button 
               onClick={() => setShowLanguageModal(false)}
               className="w-full mt-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[12px] font-black uppercase tracking-widest"
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
                    <p className="text-sm font-bold text-slate-900">{value}</p>
                </div>
            </div>
            <Icons.Search size={16} className="text-slate-200 rotate-180" />
        </button>
    )
}
