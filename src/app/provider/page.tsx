"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";

const SKILL_LABELS: Record<string, string> = {
  gecko_catcher: "จับตุ๊กแก 🦎",
  fortune_telling: "ดูดวง 🔮",
  life_management: "จัดการชีวิต 📋",
  companion_friend: "เพื่อนยามเหงา 💬",
  home_cleaning: "ทำความสะอาดบ้าน 🧹",
  personal_assistant: "ผู้ช่วยส่วนตัว 🤝",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function ProviderDashboard() {
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

  useEffect(() => {
    const localSession = localStorage.getItem("rubjob_provider_session");
    if (localSession) {
      const parsed = JSON.parse(localSession);
      setProvider(parsed);
      fetchProviderData(parsed.id);
    } else {
      setIsLoading(false);
      router.push("/provider/login");
    }
  }, [router]);

  async function fetchProviderData(providerId: string) {
    if (!providerId) return;
    setIsLoading(true);
    try {
      // Fetch preferences (work status)
      const prefRes = await fetch(`/api/users/preferences?userId=${providerId}`);
      const prefData = await prefRes.json();
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

      // Fetch wallet balance
      const walRes = await fetch(`/api/provider/wallet?providerId=${providerId}`);
      const walData = await walRes.json();
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
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedJob(null);
        // Refresh
        fetchProviderData(provider.id);
        setActiveTab("active");
      } else {
        alert(data.error || "ไม่สามารถรับงานได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
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
      const data = await res.json();
      if (res.ok && data.success) {
        fetchProviderData(provider.id);
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await fetch("/api/provider/logout", { method: "POST" }); } catch (e) {}
    localStorage.removeItem("rubjob_provider_session");
    router.push("/provider/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Gradient — Violet theme for Provider */}
      <div className="absolute top-0 left-0 right-0 h-[380px] bg-gradient-to-b from-violet-600 via-violet-500 to-slate-50 z-0" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-3 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Icons.Logo variant="icon-white" size={56} />
            <div className="min-w-0">
              <p className="text-xs text-white font-black uppercase leading-tight mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                ผู้ให้บริการ — Provider
              </p>
              <h1 className="text-3xl font-black text-white truncate drop-shadow-md leading-none">
                {provider?.name || "ผู้ให้บริการ"}
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

        {/* Work Status Toggle */}
        <Card className="mb-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-violet-900/20 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${workStatus ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/60'}`}>
                <Icons.Shield size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-white/50 uppercase leading-none mb-1">สถานะรับงาน</p>
                <p className="text-sm font-black uppercase">
                  {workStatus ? "กำลังรับงาน" : "พักเบรค"}
                </p>
              </div>
            </div>
            <button 
              onClick={handleToggleWorkStatus}
              className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workStatus ? 'bg-white shadow-lg shadow-white/20' : 'bg-white/20'}`}
            >
              <div className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 ${workStatus ? 'bg-violet-500 transform translate-x-6' : 'bg-white'}`} />
            </button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <p className="text-xs font-black text-white/50 uppercase">งานวันนี้</p>
            <p className="text-2xl font-black mt-1 text-white">{activeJobs.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <p className="text-xs font-black text-white/50 uppercase">รายได้สะสม</p>
            <p className="text-3xl font-black mt-1 text-white">
              ฿{balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Skills Badge */}
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

      {/* Tabs */}
      <div className="relative z-10 px-5 space-y-7 pt-2 animate-fade-in">
        <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner border border-slate-200/50">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "available" ? "bg-white text-violet-600 shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            งานที่ว่างอยู่
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "active" ? "bg-white text-violet-600 shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            งานของฉัน
          </button>
        </div>
      </div>

      {/* Content */}
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
                <div className="w-24 h-24 bg-violet-100 rounded-xl flex items-center justify-center border border-violet-200 shadow-xl mb-8">
                  <Icons.Logo variant="icon" size={48} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase">ลงทะเบียนผู้ให้บริการ</h2>
                <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                  สมัครเป็นผู้ให้บริการกับ RUBJOB<br/>เลือกทักษะและตั้งราคาบริการของคุณเอง
                </p>
                <Button 
                  onClick={() => router.push("/provider/setup")}
                  className="mt-8 bg-slate-900 text-white px-8 py-5 rounded-xl font-black uppercase shadow-xl active:scale-95 transition-all"
                >
                  สมัครเป็นผู้ให้บริการ
                </Button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-violet-100 rounded-xl flex items-center justify-center border border-violet-200 shadow-xl mb-8 relative">
                  <Icons.Shield size={48} className="text-violet-500" />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center border-4 border-slate-50 text-white animate-pulse">
                    <Icons.Clock size={18} strokeWidth={4} />
                  </div>
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  {verificationStatus === "pending" ? "รอการอนุมัติ" : "ไม่ผ่านการอนุมัติ"}
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                  {verificationStatus === "pending" 
                    ? "ทีมงานกำลังตรวจสอบข้อมูลของคุณ กรุณารอสักครู่ครับ" 
                    : "กรุณาติดต่อแอดมินเพื่อขอข้อมูลเพิ่มเติม"}
                </p>
                <Button 
                  variant="secondary"
                  className="mt-8 w-full max-w-[200px] bg-white border border-slate-200 text-slate-900 py-4 rounded-xl font-black text-[10px] uppercase"
                  onClick={() => window.location.reload()}
                >
                  รีเฟรช
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {activeTab === "available" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-black text-slate-400 uppercase">งานใหม่</h2>
                  <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{availableJobs.length} งาน</span>
                </div>

                {availableJobs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100 grayscale opacity-40">
                      <Icons.Logo variant="icon" size={40} />
                    </div>
                    <p className="text-xs font-black text-slate-300 uppercase">ยังไม่มีงานใหม่</p>
                  </div>
                ) : (
                  availableJobs.map((job) => (
                    <Card key={job.id} className="p-4 border-2 border-transparent hover:border-violet-200 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center text-violet-500 text-2xl shrink-0">
                          {SKILL_LABELS[job.serviceId]?.slice(-2) || "🔧"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-lg uppercase ${STATUS_COLORS[job.status] || "bg-slate-100 text-slate-500"}`}>
                              {SKILL_LABELS[job.serviceId] || job.serviceId}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 mb-1 leading-tight">
                            {job.customerName || "ลูกค้า"}
                          </h3>
                          <p className="text-xs text-slate-400 font-bold">
                            ฿{job.totalPrice?.toLocaleString()} · {job.id}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedJob(job)}>
                          รายละเอียด
                        </Button>
                        <Button
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 active:scale-95 transition-transform"
                          onClick={() => handleAcceptJob(job.id)}
                        >
                          รับงาน
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-black text-slate-400 uppercase">งานที่กำลังทำ</h2>
                </div>

                {activeJobs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100 grayscale opacity-40">
                      <Icons.Logo variant="icon" size={40} />
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase">ยังไม่มีงานที่กำลังดำเนินการ</p>
                  </div>
                ) : (
                  activeJobs.map((job) => (
                    <Card key={job.id} className="p-4 border-l-4 border-violet-500 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center text-xl shrink-0">
                          {SKILL_LABELS[job.serviceId]?.slice(-2) || "🔧"}
                        </div>
                        <div className="flex-1 border-r border-slate-100 mr-2 pr-2">
                          <p className="text-xs font-black text-slate-400">{job.id}</p>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{job.customerName}</h3>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${STATUS_COLORS[job.status]}`}>
                            {job.status === "accepted" ? "รับงานแล้ว" : "กำลังดำเนินการ"}
                          </span>
                          <p className="text-xs font-bold text-slate-900 mt-1">฿{job.totalPrice?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {job.status === "accepted" && (
                          <Button 
                            fullWidth 
                            className="bg-violet-600 text-white hover:bg-violet-700 shadow-xl shadow-violet-200 active:scale-95 transition-all col-span-2" 
                            size="sm"
                            onClick={() => handleAction(job.id, "start")}
                          >
                            เริ่มดำเนินการ
                          </Button>
                        )}
                        {job.status === "in_progress" && (
                          <Button 
                            fullWidth 
                            className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all col-span-2" 
                            size="sm"
                            onClick={() => handleAction(job.id, "complete")}
                          >
                            ✅ เสร็จสิ้นงาน
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-lg">
        <div className="flex items-center justify-around py-3 max-w-md mx-auto">
          <button onClick={() => router.push("/provider")} className="flex flex-col items-center gap-1 text-violet-600">
            <Icons.Home size={20} />
            <span className="text-[10px] font-black uppercase">งาน</span>
          </button>
          <button onClick={() => router.push("/provider/wallet")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-600 transition-colors">
            <Icons.CreditCard size={20} />
            <span className="text-[10px] font-black uppercase">รายได้</span>
          </button>
          <button onClick={() => router.push("/provider/profile")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-600 transition-colors">
            <Icons.User size={20} />
            <span className="text-[10px] font-black uppercase">โปรไฟล์</span>
          </button>
        </div>
      </nav>

      {/* Job Detail Modal */}
      <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title="รายละเอียดงาน">
        {selectedJob && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-violet-50 rounded-xl p-6 border border-violet-100 text-center">
              <p className="text-3xl mb-2">{SKILL_LABELS[selectedJob.serviceId]?.slice(-2) || "🔧"}</p>
              <h3 className="text-lg font-black text-slate-900">{SKILL_LABELS[selectedJob.serviceId] || selectedJob.serviceId}</h3>
              <p className="text-2xl font-black text-violet-600 mt-2">฿{selectedJob.totalPrice?.toLocaleString()}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <Icons.User size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{selectedJob.customerName || "ลูกค้า"}</p>
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
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-200 rounded-xl py-5 font-black uppercase text-xs active:scale-95 transition-all"
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
