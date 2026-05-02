"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant, statusLabel } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon, IconCircle } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";

// Operational state for Rider

export default function RiderDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"available" | "active">("available");
  const [isLoading, setIsLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [rider, setRider] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Lifted state
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  const [verificationStatus, setVerificationStatus] = useState<"active" | "pending" | "unregistered" | "rejected">("pending");

  useEffect(() => {
    // Check Local Session (Unified identity for riders)
    try {
      const localSession = localStorage.getItem("rubjob_rider_session");
      if (localSession) {
        const parsed = JSON.parse(localSession);
        setRider(parsed);
        fetchRiderData(parsed.id);
      } else {
        setIsLoading(false); 
        router.push("/rider/login");
      }
    } catch (err) {
      console.error("Session parse error:", err);
      localStorage.removeItem("rubjob_rider_session");
      setIsLoading(false);
      router.push("/rider/login");
    }
  }, [router]);

  async function fetchRiderData(riderId: string) {
    if (!riderId) return;
    setIsLoading(true);
    try {
      // Fetch Preferences (includes Work Status)
      const prefRes = await fetch(`/api/users/preferences?userId=${riderId}`);
      const prefData = await prefRes.json() as any;
      if (prefData.preferences?.workStatus !== undefined) {
        setWorkStatus(prefData.preferences.workStatus);
      }

      const res = await fetch(`/api/rider/orders?riderId=${riderId}`);
      const data = await res.json() as any;
      
      if (data.status === "unregistered") {
        setVerificationStatus("unregistered");
        setIsLoading(false);
        return;
      }

      setVerificationStatus(data.status);

      if (data.pictureUrl && data.pictureUrl !== rider?.pictureUrl) {
        setRider((prev: any) => ({ ...prev, pictureUrl: data.pictureUrl }));
        try {
          const session = JSON.parse(localStorage.getItem("rubjob_rider_session") || "{}");
          localStorage.setItem("rubjob_rider_session", JSON.stringify({ ...session, pictureUrl: data.pictureUrl }));
        } catch(e) {}
      }

      if (data.available) setAvailableJobs(data.available);
      if (data.active) setActiveJobs(data.active);

      // Fetch Balance
      const walRes = await fetch(`/api/rider/wallet?riderId=${riderId}`);
      const walData = await walRes.json() as any;
      if (walData.balance !== undefined) setBalance(walData.balance);
    } catch (err) {
      console.error("Failed to fetch rider dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleWorkStatus = async () => {
    setIsStatusModalOpen(false);
    const nextStatus = !workStatus;
    setWorkStatus(nextStatus);
    if (!rider?.id) return;
    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: rider.id, workStatus: nextStatus })
      });
    } catch (err) {
      console.error("Failed to update work status", err);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!rider?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/rider/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: jobId, riderId: rider.id }),
      });
      const data = await res.json() as any;
      if (res.ok && data.success) {
        setSelectedJob(null);
        // Navigate to the job details page for next steps
        router.push(`/rider/orders/${jobId}`);
      } else {
        alert(data.error || t("rider.acceptJobError"));
      }
    } catch (err) {
      alert(t("rider.networkError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/rider/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("rubjob_rider_session");
    router.push("/rider/login");
  };

  // 🔔 In-App Notification Polling (Free & Fast)
  useEffect(() => {
    if (!rider?.id || !workStatus) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rider/orders?riderId=${rider.id}`);
        const data = await res.json() as any;
        
        if (data.available && data.available.length > availableJobs.length) {
          // New Job Found!
          setAvailableJobs(data.available);
          
          // Play Notification Sound
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          audio.play().catch(() => console.log("Sound blocked by browser"));
          
          // Show browser notification if permitted
          if (Notification.permission === "granted") {
            new Notification("💸 มีงานใหม่เข้า!", {
              body: `มีงานใหม่รอคุณอยู่ รายได้ดี กดรับงานด่วน!`,
              icon: "/images/rubjob-logo.png"
            });
          }
        } else if (data.available) {
          setAvailableJobs(data.available);
        }
      } catch (e) {}
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [rider?.id, workStatus, availableJobs.length]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[380px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Dashboard Mascot Accent */}
      <div className="fixed -bottom-20 -right-20 w-80 opacity-[0.04] pointer-events-none select-none z-0 rotate-12 group hover:opacity-[0.08] transition-opacity">
        <img src="/images/มาสคอต-ขี่รถ.png" alt="" />
      </div>

      {/* Rider Header */}
      <header className="relative z-10 px-5 pt-3 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Icons.Logo variant="icon-white" size={56} />
            <div className="min-w-0">
              <p className="text-xs text-white font-black uppercase leading-tight mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                {t("rider.hero")}
              </p>
              <h1 className="text-3xl font-black text-white truncate drop-shadow-md leading-none">{rider?.name || t("common.guest")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md shadow-primary-dark/10 active:scale-90 transition-transform">
              <Icons.Bell size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Work Status Toggle (Dashboard Version) */}
        <Card className="mb-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-primary-dark/20 rounded-xl p-4 text-white">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <IconCircle variant={workStatus ? "green" : "slate"} size="md">
                      <Icons.Shield size={24} />
                  </IconCircle>
                  <div>
                      <p className="text-xs font-black text-white/50 uppercase leading-none mb-1">{t("rider.profile.workStatus")}</p>
                      <p className="text-sm font-black uppercase">
                        {workStatus ? t("rider.profile.receivingJobs") : t("rider.profile.notReceiving")}
                      </p>
                  </div>
              </div>
              <button 
                onClick={() => setIsStatusModalOpen(true)}
                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workStatus ? 'bg-white shadow-lg shadow-white/20' : 'bg-white/20'}`}
              >
                <div className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 ${workStatus ? 'bg-primary transform translate-x-6' : 'bg-white'}`} />
              </button>
           </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <p className="text-xs font-black text-white/50 uppercase">{t("rider.tasksToday")}</p>
            <p className="text-2xl font-black mt-1 text-white">{activeJobs.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <p className="text-xs font-black text-white/50 uppercase">{t("rider.earnings")}</p>
            <p className="text-3xl font-black mt-1 text-white">
              ฿{Math.ceil(balance).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Dashboard Mascot Accent moved here or handled via background */}
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 animate-fade-in">
        {/* Tabs */}
        <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner border border-slate-200/50">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "available" ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("rider.availablePickups")}
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "active" ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("rider.activeDeliveries")}
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
                 <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-white border border-white/30 shadow-2xl mb-8 relative">
                    <Icons.Logo variant="icon" size={48} />
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase">{t("rider.intro.heroTitle")}</h2>
                 <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                   {t("rider.intro.heroDesc").split("\n").map((line, i) => (
                     <span key={i}>{line}{i === 0 && <br/>}</span>
                   ))}
                 </p>
                 <Button 
                   onClick={() => router.push("/rider/setup")}
                   className="mt-8 bg-slate-900 text-white px-8 py-5 rounded-xl font-black uppercase shadow-xl active:scale-95 transition-all"
                 >
                   {t("rider.intro.applyBtn")}
                 </Button>
               </>
             ) : (
               <>
                 <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-white border border-white/30 shadow-2xl mb-8 relative">
                    <Icons.Shield size={48} />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center border-4 border-slate-50 text-white animate-pulse">
                       <Icons.Clock size={18} strokeWidth={4} />
                    </div>
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase">
                   {verificationStatus === "pending" ? t("rider.status.pending") : t("rider.status.rejected")}
                 </h2>
                 <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                   {verificationStatus === "pending" 
                     ? t("rider.status.pendingDesc") 
                     : t("rider.status.rejectedDesc")}
                 </p>
                 <div className="flex flex-col gap-3 w-full max-w-[200px] mt-8">
                   {verificationStatus === "rejected" && (
                     <Button 
                       onClick={() => router.push("/rider/documents")}
                       className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase shadow-xl"
                     >
                       {t("rider.status.editDocs")}
                     </Button>
                   )}
                   <Button 
                     variant="secondary"
                     className="w-full bg-white border border-slate-200 text-slate-900 py-4 rounded-xl font-black text-[10px] uppercase"
                     onClick={() => window.location.reload()}
                   >
                     {t("common.refresh")}
                   </Button>
                 </div>
               </>
             )}
          </div>
        ) : (
          <>
            {activeTab === "available" ? (
              <AvailableDeliveries 
                t={t} 
                router={router} 
                jobs={availableJobs} 
                onAccept={handleAcceptJob} 
                onViewDetails={(job) => setSelectedJob(job)}
              />
            ) : (
              <ActiveDeliveries 
                t={t} 
                router={router} 
                activeJobs={activeJobs}
              />
            )}
          </>
        )}

        {/* PWA & LINE Connectivity Alert (Moved to Bottom) */}
        <div className="mt-4 space-y-4">
          {!rider?.lineUserId && (
            <Card className="bg-gradient-to-r from-green-600 to-emerald-500 border-none text-white p-5 shadow-xl shadow-green-900/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Icons.Bell className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-base uppercase leading-tight">เชื่อมต่อ LINE รับงาน</h3>
                  <p className="text-xs text-white/80 font-bold mt-1 leading-relaxed">รับแจ้งเตือนทันทีที่มีงานเข้า ไม่ต้องเปิดหน้าจอค้างไว้ครับ</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-4 bg-white text-emerald-600 font-black uppercase text-[10px] py-2 px-6 rounded-lg"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/auth/link-line?accountId=${rider.id}`);
                        const data = await res.json() as any;
                        const token = data.token;
                        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
                        window.location.href = `https://liff.line.me/${liffId}/auth/link-line?type=rider&id=${rider.id}&token=${token}`;
                      } catch (e) {
                        alert("เกิดข้อผิดพลาดในการสร้างลิงก์เชื่อมต่อ");
                      }
                    }}
                  >
                    เชื่อมต่อตอนนี้
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/5 text-white p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                <Icons.Logo variant="icon" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase leading-tight">ติดตั้งแอปบนหน้าจอ</h3>
                <p className="text-[10px] text-white/60 font-bold mt-1 leading-relaxed">กดที่ปุ่ม 'แชร์' ด้านล่าง แล้วเลือก 'เพิ่มลงในหน้าจอโฮม' เพื่อการใช้งานที่สะดวกเหมือนแอปจริงครับ</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modern Job Detail Modal */}
      <Modal 
        isOpen={!!selectedJob} 
        onClose={() => setSelectedJob(null)}
        title={t("common.details")}
      >
        {selectedJob && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Virtual Route Connection */}
             <div className="relative h-24 bg-slate-50 rounded-xl border-2 border-slate-100/50 flex items-center justify-between px-10 overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                <div className="relative z-10 flex flex-col items-center">
                   <div className="w-10 h-10 bg-black rounded-xl border-4 border-white shadow-xl flex items-center justify-center text-white">
                      <Icons.Logo size={20} variant="icon" />
                   </div>
                   <p className="text-xs font-black mt-2 uppercaseer opacity-50">{t("common.store")}</p>
                </div>

                <div className="flex-1 px-4 relative">
                   <div className="h-1 bg-slate-200 rounded-full w-full">
                      <div className="h-full bg-primary w-2/3 rounded-full shadow-[0_0_8px_rgba(255,159,28,0.5)] animate-shimmer" />
                   </div>
                   <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2">
                      <Icons.Bike size={18} className="text-primary transform scale-x-[-1] animate-bounce-slow" />
                   </div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                   <div className="w-10 h-10 bg-primary rounded-xl border-4 border-white shadow-xl flex items-center justify-center text-white">
                      <Icons.MapPin size={20} strokeWidth={3} />
                   </div>
                   <p className="text-xs font-black mt-2 uppercaseer opacity-50">{t("common.user")}</p>
                </div>
             </div>

             <div className="space-y-4">
               <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <Icons.User size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-900 uppercase">{selectedJob.userName || selectedJob.customer || t("common.guest")}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase">{selectedJob.id}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-xl font-black text-slate-900 leading-none">฿{selectedJob.riderEarn}</p>
                     <p className="text-xs text-slate-400 font-bold uppercase mt-1">{t("rider.earnAmountLabel")}</p>
                   </div>
               </div>

               <div className="space-y-4 pt-2">
                  <div className="flex gap-4">
                    <Icons.Navigation size={18} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rider.pickup")}</p>
                       <p className="text-xs font-bold text-slate-700 leading-relaxed">{selectedJob.storeName || selectedJob.store || t("rider.unknownStore")}</p>
                    </div>
                  </div>
                 <div className="flex gap-4">
                    <Icons.MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rider.delivery")}</p>
                       <p className="text-xs font-black text-slate-900 leading-relaxed">{selectedJob.customerName || selectedJob.customer || t("rider.unknownCustomer")}</p>
                       <p className="text-xs text-slate-400 font-bold mt-1">{selectedJob.address || t("rider.orderDetail.noAddress")}</p>
                    </div>
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-slate-100">
                <Button 
                   variant="secondary" 
                   fullWidth 
                   className="rounded-xl py-5 font-black uppercase text-xs" 
                   onClick={() => setSelectedJob(null)}
                >
                   {t("common.close")}
                </Button>
                <Button 
                   fullWidth 
                   className="bg-primary hover:bg-primary-dark text-white shadow-xl shadow-primary/20 rounded-xl py-5 font-black uppercase text-xs active:scale-95 transition-all"
                   onClick={() => handleAcceptJob(selectedJob.id)}
                >
                   {t("rider.acceptJob")}
                </Button>
             </div>
          </div>
        )}
      </Modal>

      {/* Status Confirmation Modal */}
      <Modal 
        isOpen={isStatusModalOpen} 
        onClose={() => setIsStatusModalOpen(false)}
        title={workStatus ? t("rider.profile.stopWorkTitle") || "หยุดรับงานชั่วคราว?" : t("rider.profile.startWorkTitle") || "เริ่มรับงาน?"}
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${workStatus ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
             <Icons.Shield size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2 uppercase">
            {workStatus ? t("rider.profile.stopWorkConfirm") || "ต้องการหยุดรับงานใช่หรือไม่?" : t("rider.profile.startWorkConfirm") || "พร้อมเริ่มรับงานแล้วใช่หรือไม่?"}
          </h3>
          <p className="text-xs font-bold text-slate-400 mb-8 max-w-[240px]">
            {workStatus 
              ? t("rider.profile.stopWorkDesc") || "เมื่อหยุดรับงาน คุณจะไม่เห็นงานใหม่ในพื้นที่จนกว่าจะเปิดสถานะอีกครั้ง" 
              : t("rider.profile.startWorkDesc") || "เมื่อเริ่มรับงาน คุณจะได้รับการแจ้งเตือนงานใหม่ในพื้นที่ทันที"}
          </p>
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="secondary" fullWidth onClick={() => setIsStatusModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              fullWidth 
              className={workStatus ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-100" : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100"}
              onClick={handleToggleWorkStatus}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AvailableDeliveries({ t, router, jobs, onAccept, onViewDetails }: { t: any, router: any, jobs: any[], onAccept: (id: string) => void, onViewDetails: (job: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-black text-slate-400 uppercase">{t("rider.newRequests")}</h2>
        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{jobs.length} {t("rider.nearby")}</span>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
           <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 transition-all hover:scale-105 border border-slate-100 grayscale opacity-40">
              <Icons.Logo variant="icon" size={40} />
           </div>
           <p className="text-xs font-black text-slate-300 uppercase">{t("rider.noJobsNearby")}</p>
        </div>
      ) : (
        jobs.map((job) => (
          <Card key={job.id} className="p-4 border-2 border-transparent hover:border-primary/20 transition-all">
            <div className="flex items-start gap-4">
              <IconCircle variant="orange" size="md">
                {getServiceIcon(job.serviceId as any, { size: 28 })}
              </IconCircle>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-lg uppercase ${job.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {job.status === 'pending' ? t("rider.flow.pickupLeg") : t("rider.flow.deliveryLeg")}
                  </span>
                  <span className="text-xs font-black text-slate-400 uppercase">{job.id}</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 leading-tight">
                  {job.status === 'pending' ? t("rider.flow.customerToStore") : t("rider.flow.storeToCustomer")}
                </h3>
                 <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                   <span className="flex items-center gap-1"><Icons.MapPin size={12} className="text-primary" /> {job.distanceKm || "0.5"} {t("rider.nearby")}</span>
                   <span className="flex items-center gap-1"><Icons.ArrowRight size={12} className="text-primary" /> {t("rider.earnAmount")} ฿{job.riderEarn}</span>
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => onViewDetails(job)}>
                {t("common.details")}
              </Button>
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 active:scale-95 transition-transform"
                onClick={() => onAccept(job.id)}
              >
                {t("rider.acceptJob")}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ActiveDeliveries({ t, router, activeJobs }: { t: any, router: any, activeJobs: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-slate-400 uppercase">{t("rider.activeJobs")}</h2>
      </div>

      {activeJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
           <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 transition-all hover:scale-105 border border-slate-100 grayscale opacity-40">
              <Icons.Logo variant="icon" size={40} />
           </div>
           <p className="text-[10px] font-black text-slate-300 uppercase">{t("rider.noActiveJobs")}</p>
        </div>
      ) : (
        activeJobs.map((job) => (
          <Card key={job.id} className="p-4 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <IconCircle variant="black" size="md">
                {getServiceIcon(job.serviceId as any, { size: 24 })}
              </IconCircle>
              <div className="flex-1 border-r border-slate-100 mr-2 pr-2">
                <p className="text-xs font-black text-slate-400 uppercaseer">{job.id}</p>
                <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{job.storeName}</h3>
              </div>
              <div className="text-right min-w-[80px]">
                <Badge variant={statusToBadgeVariant(job.status as any)}>
                  {t(`orders.status.${job.status}`)}
                </Badge>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercaseer">
                  {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <Button 
              fullWidth 
              className="mt-4 bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 active:scale-95 transition-all" 
              size="sm"
              onClick={() => router.push(`/rider/orders/${job.id}`)}
            >
              {t("rider.manageTask")}
            </Button>
          </Card>
        ))
      )}
    </div>
  );
}
