"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function ProviderDashboard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"available" | "active">("available");
  const [isLoading, setIsLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<"active" | "pending" | "unregistered" | "rejected">("pending");

  const SKILL_LABELS = useMemo<Record<string, string>>(() => ({
    gecko_catcher: t("provider.gig.categories.gecko_catcher"),
    fortune_telling: t("provider.gig.categories.fortune_telling"),
    life_management: t("provider.gig.categories.life_management"),
    companion_friend: t("provider.gig.categories.companion_friend"),
    home_cleaning: t("provider.gig.categories.home_cleaning"),
    personal_assistant: t("provider.gig.categories.personal_assistant"),
    graphic_design: t("provider.gig.categories.graphic_design"),
    tutor: t("provider.gig.categories.tutor"),
    developer: t("provider.gig.categories.developer"),
  }), [t]);

  useEffect(() => {
    const localSession = localStorage.getItem("rubjob_provider_session");
    if (localSession) {
      const parsed = JSON.parse(localSession);
      setProvider(parsed);
      fetchProviderData(parsed.id);
    } else {
      setIsLoading(false);
      router.push("/partner/login");
    }
  }, [router]);

  async function fetchProviderData(providerId: string) {
    if (!providerId) return;
    setIsLoading(true);
    try {
      const prefRes = await fetch(`/api/users/preferences?userId=${providerId}`);
      const prefData = await prefRes.json() as any;
      if (prefData.preferences?.workStatus !== undefined) {
        setWorkStatus(prefData.preferences.workStatus);
      }

      const res = await fetch(`/api/provider/orders?providerId=${providerId}`);
      const data = await res.json() as any;

      if (data.status === "unregistered") {
        setVerificationStatus("unregistered");
        setIsLoading(false);
        return;
      }

      setVerificationStatus(data.status);
      if (data.available) setAvailableJobs(data.available);
      if (data.active) setActiveJobs(data.active);

      const walRes = await fetch(`/api/provider/wallet?providerId=${providerId}`);
      const walData = await walRes.json() as any;
      if (walData.balance !== undefined) setBalance(walData.balance);
    } catch (err) {
      console.error("Failed to fetch provider data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleWorkStatus = async () => {
    const nextStatus = !workStatus;
    setWorkStatus(nextStatus);
    if (!provider?.id) return;
    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: provider.id, workStatus: nextStatus })
      });
    } catch (err) {
      console.error("Failed to update work status", err);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!provider?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/provider/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: jobId, action: "accept" }),
      });
      const data = await res.json() as any;
      if (res.ok && data.success) {
        setSelectedJob(null);
        fetchProviderData(provider.id);
        setActiveTab("active");
      } else {
        showToast(data.error || t("provider.dashboard.acceptError"), "error");
      }
    } catch (err) {
      showToast(t("provider.dashboard.connectionError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (jobId: string, action: "start" | "complete") => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/provider/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: jobId, action }),
      });
      const data = await res.json() as any;
      if (res.ok && data.success) {
        fetchProviderData(provider.id);
      } else {
        showToast(data.error || t("provider.dashboard.genericError"), "error");
      }
    } catch (err) {
      showToast(t("provider.dashboard.connectionError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await fetch("/api/provider/logout", { method: "POST" }); } catch (e) {}
    localStorage.removeItem("rubjob_provider_session");
    router.push("/partner/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[380px] bg-gradient-to-b from-primary via-primary-dark to-slate-50 z-0" />

      <header className="relative z-10 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Icons.Logo variant="icon-white" size={56} />
            <div className="min-w-0">
              <p className="text-xs text-white font-black uppercase leading-tight mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                {t("provider.dashboard.title")}
              </p>
              <h1 className="text-3xl font-black text-white truncate drop-shadow-md leading-none">
                {provider?.name || t("provider.dashboard.providerFallback")}
              </h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md active:scale-90 transition-transform"
          >
            <Icons.ArrowRight size={20} className="text-white rotate-180" />
          </button>
        </div>

        <Card className="mb-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-primary-dark/20 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${workStatus ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/60'}`}>
                <Icons.Shield size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-white/50 uppercase leading-none mb-1">{t("provider.profile.workStatus")}</p>
                <p className="text-sm font-black uppercase">
                  {workStatus ? t("provider.dashboard.receivingJobs") : t("provider.dashboard.onBreak")}
                </p>
              </div>
            </div>
            <button 
              onClick={handleToggleWorkStatus}
              className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workStatus ? 'bg-white shadow-lg shadow-white/20' : 'bg-white/20'}`}
            >
              <div className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 ${workStatus ? 'bg-primary transform translate-x-6' : 'bg-white'}`} />
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <p className="text-xs font-black text-white/50 uppercase">{t("provider.nav.jobs")}</p>
            <p className="text-2xl font-black mt-1 text-white">{activeJobs.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <p className="text-xs font-black text-white/50 uppercase">{t("provider.nav.earnings")}</p>
            <p className="text-3xl font-black mt-1 text-white">
              ฿{balance.toLocaleString()}
            </p>
          </div>
        </div>

        {provider?.skills && provider.skills.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {provider.skills.map((skill: string) => (
              <span key={skill} className="text-[10px] font-black uppercase bg-white/20 text-white px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                {SKILL_LABELS[skill] || skill}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 animate-fade-in">
        <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner border border-slate-200/50">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "available" ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("provider.dashboard.statusPending")}
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "active" ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("provider.nav.jobs")}
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 space-y-7 pb-24 animate-fade-in">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 flex items-center gap-4">
                <Skeleton variant="circle" className="w-14 h-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-24 h-4" />
                  <Skeleton variant="text" className="w-full h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : verificationStatus !== "active" ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-fade-in relative z-10 min-h-[50vh]">
            {verificationStatus === "unregistered" ? (
              <>
                <div className="w-24 h-24 bg-orange-100 rounded-xl flex items-center justify-center border border-orange-200 shadow-xl mb-8">
                  <Icons.Logo variant="icon" size={48} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase">{t("register.partner.title")}</h2>
                <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                  {t("register.partner.subtitle")}
                </p>
                <Button 
                  onClick={() => router.push("/partner-service/setup")}
                  className="mt-8 bg-slate-900 text-white px-8 py-5 rounded-xl font-black uppercase shadow-xl active:scale-95 transition-all"
                >
                  {t("register.partner.title")}
                </Button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-orange-100 rounded-xl flex items-center justify-center border border-orange-200 shadow-xl mb-8 relative">
                  <Icons.Shield size={48} className="text-primary" />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center border-4 border-slate-50 text-white animate-pulse">
                    <Icons.Clock size={18} strokeWidth={4} />
                  </div>
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  {verificationStatus === "pending" ? t("provider.dashboard.pendingApproval") : t("provider.dashboard.rejected")}
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                  {verificationStatus === "pending" 
                    ? t("provider.dashboard.pendingApprovalDesc") 
                    : t("provider.dashboard.rejectedDesc")}
                </p>
                <Button 
                  variant="secondary"
                  className="mt-8 w-full max-w-[200px] bg-white border border-slate-200 text-slate-900 py-4 rounded-xl font-black text-[10px] uppercase"
                  onClick={() => window.location.reload()}
                >
                  {t("common.refresh")}
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {activeTab === "available" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-black text-slate-400 uppercase">{t("provider.dashboard.statusPending")}</h2>
                  <span className="text-xs font-bold bg-orange-100 text-primary px-2 py-0.5 rounded-full">{availableJobs.length} {t("provider.nav.jobs")}</span>
                </div>

                {availableJobs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100 grayscale opacity-40">
                      <Icons.Logo variant="icon" size={40} />
                    </div>
                    <p className="text-xs font-black text-slate-300 uppercase">{t("provider.dashboard.statusPending")}</p>
                  </div>
                ) : (
                  availableJobs.map((job) => (
                    <Card key={job.id} className="p-4 border-2 border-transparent hover:border-orange-200 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-primary text-2xl shrink-0">
                          {SKILL_LABELS[job.serviceId]?.slice(-2) || "🔧"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-lg uppercase ${STATUS_COLORS[job.status] || "bg-slate-100 text-slate-500"}`}>
                              {SKILL_LABELS[job.serviceId] || job.serviceId}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 mb-1 leading-tight">
                            {job.customerName || t("provider.dashboard.customerFallback")}
                          </h3>
                          <p className="text-xs text-slate-400 font-bold">
                            ฿{job.totalPrice?.toLocaleString()} · {job.id}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedJob(job)}>
                          {t("provider.dashboard.jobDetail")}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary-dark shadow-lg shadow-primary-dark/20 active:scale-95 transition-transform"
                          onClick={() => handleAcceptJob(job.id)}
                        >
                          {t("common.confirm")}
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-black text-slate-400 uppercase">{t("provider.nav.jobs")}</h2>
                </div>

                {activeJobs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100 grayscale opacity-40">
                      <Icons.Logo variant="icon" size={40} />
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase">{t("provider.dashboard.genericError")}</p>
                  </div>
                ) : (
                  activeJobs.map((job) => (
                    <Card key={job.id} className="p-4 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 text-primary rounded-xl flex items-center justify-center text-xl shrink-0">
                          {SKILL_LABELS[job.serviceId]?.slice(-2) || "🔧"}
                        </div>
                        <div className="flex-1 border-r border-slate-100 mr-2 pr-2">
                          <p className="text-xs font-black text-slate-400">{job.id}</p>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{job.customerName}</h3>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${job.status === 'pending' ? 'bg-amber-100 text-amber-600' : STATUS_COLORS[job.status]}`}>
                            {job.status === "pending" ? t("provider.dashboard.statusPending") : job.status === "accepted" ? t("provider.dashboard.statusAccepted") : t("provider.dashboard.statusInProgress")}
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">฿{job.totalPrice?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {job.status === "pending" && (
                          <Button 
                            fullWidth 
                            className="bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 active:scale-95 transition-all col-span-2" 
                            size="sm"
                            onClick={() => handleAcceptJob(job.id)}
                          >
                            {t("common.confirm")}
                          </Button>
                        )}
                        {job.status === "accepted" && (
                          <Button 
                            fullWidth 
                            className="bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 active:scale-95 transition-all col-span-2" 
                            size="sm"
                            onClick={() => handleAction(job.id, "start")}
                          >
                            {t("provider.dashboard.statusInProgress")}
                          </Button>
                        )}
                        {job.status === "in_progress" && (
                          <Button 
                            fullWidth 
                            className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all col-span-2" 
                            size="sm"
                            onClick={() => handleAction(job.id, "complete")}
                          >
                            {t("common.finish")}
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title={t("provider.dashboard.jobDetail")}>
        {selectedJob && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 text-center">
              <p className="text-3xl mb-2">{SKILL_LABELS[selectedJob.serviceId]?.slice(-2) || "🔧"}</p>
              <h3 className="text-lg font-black text-slate-900">{SKILL_LABELS[selectedJob.serviceId] || selectedJob.serviceId}</h3>
              <p className="text-2xl font-black text-primary mt-2">฿{selectedJob.totalPrice?.toLocaleString()}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <Icons.User size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{selectedJob.customerName || t("provider.dashboard.customerFallback")}</p>
                  <p className="text-xs text-slate-400 font-bold">{selectedJob.id}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <Button variant="secondary" fullWidth className="rounded-xl py-5 font-black uppercase text-xs" onClick={() => setSelectedJob(null)}>
                ปิด
              </Button>
              <Button
                fullWidth
                className="bg-primary hover:bg-primary-dark text-white shadow-xl shadow-primary/20 rounded-xl py-5 font-black uppercase text-xs active:scale-95 transition-all"
                onClick={() => handleAcceptJob(selectedJob.id)}
              >
                รับงาน
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
