"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons, IconCircle } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";

import Modal from "@/components/ui/Modal";

export default function RubberProfilePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const { showToast } = useToast();
  const [workStatus, setWorkStatus] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [prefs, setPrefs] = useState<any>({});
  const [rubberData, setRubberData] = useState<any>(null);
  const [rubberSession, setRubberSession] = useState<any>(null);

  useEffect(() => {
    try {
      const localSession = localStorage.getItem("rubjob_rubber_session");
      if (localSession) {
        const parsed = JSON.parse(localSession);
        setRubberSession(parsed);
        fetchRubberData(parsed.id);
        fetchPrefs(parsed.id);
      } else {
        router.push("/rubber/login");
      }
    } catch (err) {
      console.error("Session parse error:", err);
      router.push("/rubber/login");
    }
  }, [router]);

  async function fetchRubberData() {
    try {
      const res = await fetch(`/api/rubber/me`);
      const data = await res.json() as any;
      if (data.rubber) {
        setRubberData(data.rubber);
      }
    } catch (err) {
      console.error("Failed to fetch rubber data", err);
    }
  }

  async function fetchPrefs(rubberId: string) {
    try {
      const res = await fetch(`/api/users/preferences?userId=${rubberId}`);
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

  const handleToggleWorkStatus = async () => {
    setIsStatusModalOpen(false);
    const nextStatus = !workStatus;
    setWorkStatus(nextStatus);
    if (!rubberSession?.id) return;
    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: rubberSession.id, workStatus: nextStatus })
      });
    } catch (err) {
      console.error("Failed to update work status", err);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[380px] bg-gradient-to-b from-primary via-primary-dark to-slate-50 z-0" />

      {/* Profile Header */}
      <header className="relative z-10 px-5 pt-4 pb-10">
        {/* Back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="active:scale-95 transition-transform"
          >
            <IconCircle variant="white" size="sm">
              <Icons.Back size={16} />
            </IconCircle>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative group shrink-0 w-16 h-16">
            <div className="w-full h-full rounded-[1.5rem] overflow-hidden bg-white/10 backdrop-blur-xl border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
              <img 
                src={!rubberSession?.pictureUrl ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${rubberSession?.id || 'Rubjob'}` : (rubberSession.pictureUrl.startsWith('data:') || rubberSession.pictureUrl.startsWith('http')) ? rubberSession.pictureUrl : `/api/admin/documents/${rubberSession.pictureUrl}`} 
                alt="Avatar" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
              />
            </div>
            {workStatus && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-[2.5px] border-white shadow-lg animate-pulse z-10" />}
          </div>
          <div className="text-white flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-black truncate drop-shadow-md">
                {rubberSession?.name || t("common.guest")}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-white/10">
                <Icons.Guarantee size={10} className="text-emerald-400" />
                RUBBER
              </span>
              <span className="px-2.5 py-1 bg-black/20 backdrop-blur-md rounded-md text-[9px] font-black uppercase tracking-wider text-white/70">
                #{String(rubberSession?.id || '').slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 px-5 -mt-4 space-y-6 pb-24 animate-fade-in">
        {/* Status Section */}
        <section>
          <Card 
            className={`p-4 rounded-2xl border transition-all duration-500 shadow-md ${workStatus ? 'bg-white border-emerald-100' : 'bg-slate-100 border-slate-200 shadow-none'}`}
          >
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm ${workStatus ? 'bg-emerald-50 text-emerald-500 shadow-emerald-100' : 'bg-slate-200 text-slate-400'}`}>
                      <Icons.Shield size={18} />
                  </div>
                  <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{t("rubber.profile.workStatus")}</p>
                      <p className={`text-sm font-black uppercase leading-none ${workStatus ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {workStatus ? t("rubber.profile.receivingJobs") : t("rubber.profile.notReceiving")}
                      </p>
                  </div>
               </div>
               <button 
                  onClick={() => setIsStatusModalOpen(true)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all duration-500 ${workStatus ? 'bg-emerald-500 shadow-md shadow-emerald-200' : 'bg-slate-300'}`}
               >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-500 ${workStatus ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
             </div>
          </Card>
        </section>

        {/* Rubber Settings Menu */}
        <section>
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 px-2">{t("rubber.profile.settings")}</h2>
          <Card className="divide-y divide-slate-50 shadow-xl rounded-[2rem] bg-white border border-slate-100 overflow-hidden">
            <button
              onClick={() => setShowLanguageModal(true)}
              className="w-full flex items-center gap-5 px-6 py-3 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Globe size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("rubber.profile.language")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{language === "th" ? "ไทย (TH)" : "English (EN)"}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => router.push("/rubber/profile/service-area")}
              className="w-full flex items-center gap-5 px-6 py-3 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.MapPin size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("rubber.profile.serviceArea")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{prefs?.serviceAreaCoords ? `${Number(prefs.serviceAreaCoords.lat).toFixed(4)}, ${Number(prefs.serviceAreaCoords.lng).toFixed(4)}` : t("common.notSet")}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => router.push("/rubber/profile/vehicle-type")}
              className="w-full flex items-center gap-5 px-6 py-3 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Bike size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("rubber.profile.vehicleType") || t("rubber.vehicleType")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{prefs?.vehicleType ? ({motorcycle: 'มอเตอร์ไซค์', car: 'รถยนต์', van: 'รถตู้/กระบะ'} as Record<string,string>)[prefs.vehicleType] || prefs.vehicleType : (rubberData?.vehicleType || t("common.notSet"))}</p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => router.push("/rubber/profile/payout-method")}
              className="w-full flex items-center gap-5 px-6 py-3 hover:bg-slate-50 transition-colors text-left group"
            >
              <IconCircle variant="ghost" size="md">
                <Icons.Payment size={20} />
              </IconCircle>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t("rubber.profile.payoutMethod")}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  {prefs?.payoutMethod ? `${prefs.payoutMethod.bank ? prefs.payoutMethod.bank.toUpperCase() : 'Account'} ***${prefs.payoutMethod.account?.slice(-4) || ''}` : (rubberData?.bankName ? `${rubberData.bankName.toUpperCase()} ***${rubberData.accountNumber?.slice(-4) || ''}` : t("common.notSet"))}
                </p>
              </div>
              <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </button>
          </Card>
        </section>

        {/* LINE Connection Status */}
        <section>
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 px-2">LINE Connectivity</h2>
          <Card 
            className={`p-5 rounded-[2rem] border transition-all duration-500 shadow-xl ${rubberData?.lineUserId ? 'bg-white border-green-100' : 'bg-slate-100 border-slate-200 shadow-none'}`}
          >
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${rubberData?.lineUserId ? 'bg-green-50 text-green-500 shadow-green-100' : 'bg-slate-200 text-slate-400'}`}>
                      <Icons.Line size={28} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        {rubberData?.lineUserId ? "Connected Account" : "Not Connected"}
                      </p>
                      <p className={`text-base font-black uppercase ${rubberData?.lineUserId ? 'text-green-600' : 'text-slate-500'}`}>
                        {rubberData?.lineUserId ? (rubberData.lineDisplayName || "Connected") : "LINE NOT LINKED"}
                      </p>
                  </div>
               </div>
               {!rubberData?.lineUserId ? (
                 <button 
                    onClick={async () => {
                      try {
                        if (!rubberSession?.id) return;
                        const res = await fetch(`/api/auth/link-line?type=rubber`);
                        const data = await res.json() as any;
                        if (!res.ok || !data.token) throw new Error("Failed to get linking token");
                        const liffId = process.env.NEXT_PUBLIC_LIFF_ID_RUBBER || process.env.NEXT_PUBLIC_LIFF_ID;
                        window.location.href = `https://liff.line.me/${liffId}/link-line?type=rubber&id=${data.accountId}&token=${data.token}`;
                      } catch (e) {
                        console.error("LINE link error:", e);
                        showToast(t("rubber.profile.line.connectError"), "error");
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all bg-primary text-white shadow-lg shadow-primary/20`}
                 >
                    Connect
                 </button>
               ) : (
                 <button 
                    onClick={async () => {
                      if (!confirm("คุณต้องการยกเลิกการเชื่อมต่อ LINE ใช่หรือไม่?")) return;
                      try {
                        if (!rubberSession?.id) return;
                        // Call an API to remove lineUserId. 
                        // Let's use the preferences API or create a quick inline fetch to remove it.
                        await fetch(`/api/rubber/me`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ rubberId: rubberSession.id, action: 'unlink_line' })
                        });
                        showToast(t("rubber.profile.line.disconnectSuccess"), "success");
                        window.location.reload();
                      } catch (e) {
                        console.error("LINE unlink error:", e);
                        showToast(t("rubber.profile.line.disconnectError"), "error");
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all bg-red-500 text-white shadow-lg shadow-red-500/20`}
                 >
                    Disconnect
                 </button>
               )}
             </div>
          </Card>
        </section>

        {/* Support Section */}
        <section>
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 px-2">{t("support.sectionTitle") || "ช่วยเหลือ"}</h2>
          <Card className="overflow-x-hidden shadow-2xl rounded-[2.5rem] bg-white border border-slate-100">
            <button
              onClick={() => router.push("/rubber/support")}
              className="w-full flex items-center gap-5 px-6 py-3 hover:bg-slate-50 transition-colors text-left group"
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
          onClick={async () => {
            try {
              await fetch("/api/rubber/logout", { method: "POST" });
            } catch (e) {}
            localStorage.removeItem("rubjob_rubber_session");
            router.push("/rubber/login");
          }}
          className="w-full flex items-center gap-5 px-6 py-4 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl hover:bg-rose-600 transition-all duration-500 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <Icons.LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-widest">{t("rubber.profile.logout")}</p>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">RUBBER #{String(rubberSession?.id || '').slice(-4)}</p>
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
        title={workStatus ? t("rubber.profile.stopWorkTitle") || "หยุดรับงานชั่วคราว?" : t("rubber.profile.startWorkTitle") || "เริ่มรับงาน?"}
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl ${workStatus ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-emerald-50 text-emerald-500 shadow-emerald-100'}`}>
             <Icons.Shield size={36} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight leading-tight">
            {workStatus ? t("rubber.profile.stopWorkConfirm") || "ต้องการหยุดรับงานใช่หรือไม่?" : t("rubber.profile.startWorkConfirm") || "พร้อมเริ่มรับงานแล้วใช่หรือไม่?"}
          </h3>
          <p className="text-[11px] font-bold text-slate-400 mb-10 max-w-[260px] leading-relaxed uppercase tracking-wide">
            {workStatus 
              ? t("rubber.profile.stopWorkDesc") || "เมื่อหยุดรับงาน คุณจะไม่เห็นออเดอร์ใหม่ๆ จนกว่าจะเปิดสถานะอีกครั้ง" 
              : t("rubber.profile.startWorkDesc") || "เมื่อเริ่มรับงาน คุณจะเริ่มได้รับแจ้งเตือนออเดอร์ใหม่ทันที"}
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
