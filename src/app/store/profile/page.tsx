"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useStoreAuth } from "@/components/providers/StoreProvider";

import Modal from "@/components/ui/Modal";

export default function StoreProfilePage() {
  const router = useRouter();
  const { store, logout } = useStoreAuth();
  const { language, setLanguage, t } = useTranslation();
  const [workStatus, setWorkStatus] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
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
    setIsStatusModalOpen(false);
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
      <div className="absolute top-0 left-0 right-0 h-[380px] bg-gradient-to-b from-primary via-primary-dark to-slate-50 z-0" />

      {/* Profile Header */}
      <header className="relative z-10 px-6 pt-8 pb-12">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-6 top-6 active:scale-95 transition-transform z-10"
        >
          <IconCircle variant="white" size="sm">
            <Icons.Back size={16} />
          </IconCircle>
        </button>

        <div className="flex items-center gap-5 mt-12">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-[2rem] bg-white/10 backdrop-blur-xl border-2 border-white/30 flex items-center justify-center text-primary text-3xl font-bold overflow-hidden shadow-2xl relative">
            <div className="w-full h-full bg-white flex items-center justify-center text-primary font-black text-3xl">
              {store?.name?.[0] || "S"}
            </div>
            {workStatus && <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-lg animate-pulse" />}
          </div>
          <div className="text-white flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black truncate drop-shadow-md">
                {store?.name || t("common.guest")}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                <Icons.Guarantee size={10} className="text-emerald-400" />
                {t("store.profile.verifiedHero")}
              </span>
              <span className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider text-white/70">
                #{String(store?.id || '').slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 px-6 -mt-6 space-y-8 pb-24 animate-fade-in">
        {/* Status Section */}
        <section>
          <Card 
            className={`p-6 rounded-[2rem] border transition-all duration-500 shadow-xl ${workStatus ? 'bg-white border-emerald-100' : 'bg-slate-100 border-slate-200 shadow-none'}`}
          >
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${workStatus ? 'bg-emerald-50 text-emerald-500 shadow-emerald-100' : 'bg-slate-200 text-slate-400'}`}>
                      <Icons.Shield size={28} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t("store.profile.workStatus")}</p>
                      <p className={`text-base font-black uppercase ${workStatus ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {workStatus ? t("store.profile.receivingJobs") : t("store.profile.notReceiving")}
                      </p>
                  </div>
               </div>
               <button 
                  onClick={() => setIsStatusModalOpen(true)}
                  className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 ${workStatus ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-300'}`}
               >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-500 ${workStatus ? 'translate-x-7' : 'translate-x-0'}`} />
               </button>
             </div>
          </Card>
        </section>

        {/* Store Settings Menu */}
        <section>
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 px-2">{t("store.profile.settings")}</h2>
          <Card className="divide-y divide-slate-50 overflow-hidden shadow-2xl rounded-[2.5rem] bg-white border border-slate-100">
            <button
              onClick={() => setShowLanguageModal(true)}
              className="w-full flex items-center gap-5 px-6 py-6 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Globe size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.profile.language")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{language === "th" ? "ไทย (TH)" : "English (EN)"}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => router.push("/store/services")}
              className="w-full flex items-center gap-5 px-6 py-6 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Clipboard size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.laundryService")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t("store.manageTask")}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => router.push("/store/profile/active-hours")}
              className="w-full flex items-center gap-5 px-6 py-6 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Clock size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.profile.activeHours")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{prefs?.activeHours || t("common.notSet")}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => router.push("/store/profile/payout-method")}
              className="w-full flex items-center gap-5 px-6 py-6 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Payment size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("store.profile.payoutMethod")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                   {prefs?.payoutMethod ? `${prefs.payoutMethod.bank ? prefs.payoutMethod.bank.toUpperCase() : 'Account'} ***${String(prefs.payoutMethod.account || '').slice(-4)}` : t("common.notSet")}
                </p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>
          </Card>
        </section>

        {/* Support Section */}
        <section>
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 px-2">{t("support.sectionTitle") || "ช่วยเหลือ"}</h2>
          <Card className="overflow-hidden shadow-2xl rounded-[2.5rem] bg-white border border-slate-100">
            <button
              onClick={() => router.push("/store/support")}
              className="w-full flex items-center gap-5 px-6 py-6 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Chat size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("support.contactAdmin") || "ติดต่อแอดมิน"}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t("support.contactAdminDesc") || "แจ้งปัญหา / สอบถาม"}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>
          </Card>
        </section>

        {/* Logout Button */}
        <button
          onClick={() => logout("/store")}
          className="w-full flex items-center gap-5 px-6 py-6 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl hover:bg-rose-600 transition-all duration-500 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <Icons.LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-widest">{t("store.profile.logout")}</p>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{t("store.profile.verifiedHero")} #{String(store?.id || '').slice(-4)}</p>
          </div>
          <Icons.Back size={16} className="text-white/20 rotate-180" />
        </button>

        {/* App Info */}
        <div className="text-center pb-12 pt-4">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">RUBJOB v1.0.0</p>
          <p className="text-[10px] text-slate-300 mt-3 flex items-center justify-center gap-2 font-black uppercase tracking-widest">
            {t("common.madeInBangkok")} <Icons.Guarantee size={12} className="text-primary opacity-30" /> Bangkok
          </p>
        </div>
      </div>

      {/* Work Status Confirmation Modal */}
      <Modal 
        isOpen={isStatusModalOpen} 
        onClose={() => setIsStatusModalOpen(false)}
        title={workStatus ? t("store.profile.stopWorkTitle") || "หยุดรับงานชั่วคราว?" : t("store.profile.startWorkTitle") || "เริ่มรับงาน?"}
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl ${workStatus ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-emerald-50 text-emerald-500 shadow-emerald-100'}`}>
             <Icons.Shield size={36} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight leading-tight">
            {workStatus ? t("store.profile.stopWorkConfirm") || "ต้องการหยุดรับงานใช่หรือไม่?" : t("store.profile.startWorkConfirm") || "พร้อมเริ่มรับงานแล้วใช่หรือไม่?"}
          </h3>
          <p className="text-[11px] font-bold text-slate-400 mb-10 max-w-[260px] leading-relaxed uppercase tracking-wide">
            {workStatus 
              ? t("store.profile.stopWorkDesc") || "เมื่อหยุดรับงาน ร้านค้าของคุณจะไม่ปรากฏในการค้นหาจนกว่าจะเปิดสถานะอีกครั้ง" 
              : t("store.profile.startWorkDesc") || "เมื่อเริ่มรับงาน ลูกค้าจะสามารถเห็นและสั่งบริการจากร้านของคุณได้ทันที"}
          </p>
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="secondary" fullWidth className="rounded-2xl py-4 font-black uppercase text-[11px]" onClick={() => setIsStatusModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              fullWidth 
              className={`rounded-2xl py-4 font-black uppercase text-[11px] text-white shadow-xl ${workStatus ? "bg-rose-500 shadow-rose-200" : "bg-emerald-500 shadow-emerald-200"}`}
              onClick={handleToggleWorkStatus}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Language Modal (Standard Dropdown) */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowLanguageModal(false)} />
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-3xl p-10 pb-14 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-10 sm:hidden" />
            <h3 className="text-2xl font-black text-slate-900 mb-8 text-center uppercase tracking-tight">{t("profile.selectLanguage")}</h3>
            <div className="space-y-4">
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
                  className={`w-full p-6 rounded-2xl flex items-center justify-between transition-all duration-300 ${
                    language === lang.key 
                      ? "bg-primary/5 border-2 border-primary shadow-lg shadow-primary/5" 
                      : "bg-slate-50 border-2 border-transparent hover:bg-slate-100"
                  }`}
                >
                  <div className="text-left">
                    <p className={`text-base font-black ${language === lang.key ? "text-primary-dark" : "text-slate-800"}`}>{lang.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">{lang.sub}</p>
                  </div>
                  {language === lang.key && (
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white shadow-xl">
                      <Icons.Check size={16} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowLanguageModal(false)}
              className="w-full mt-10 py-5 bg-slate-100 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
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
