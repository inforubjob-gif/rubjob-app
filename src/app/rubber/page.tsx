"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useScrollCollapse } from "@/hooks/useScrollCollapse";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon, IconCircle } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function RubberDashboard() {
  // Helper: Convert VAPID key from base64 to Uint8Array
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const { t } = useTranslation();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"available" | "active">("available");
  const [isLoading, setIsLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [rubber, setRubber] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "warning" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error",
  });

  // Lifted state
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [verificationStatus, setVerificationStatus] = useState<"active" | "pending" | "unregistered" | "rejected">("pending");

  useEffect(() => {
    // Check Local Session (Unified identity for rubbers)
    try {
      const localSession = localStorage.getItem("rubjob_rubber_session");
      if (localSession) {
        const parsed = JSON.parse(localSession);
        setRubber(parsed);
        fetchRubberData(parsed.id);
        fetchUnreadCount();
      } else {
        setIsLoading(false); 
        router.push("/rubber/login");
      }
    } catch (err) {
      console.error("Session parse error:", err);
      localStorage.removeItem("rubjob_rubber_session");
      setIsLoading(false);
      router.push("/rubber/login");
    }
  }, [router]);

  // Poll notification count every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🔔 Web Push Subscription — auto-subscribe when rubber is logged in
  useEffect(() => {
    if (!rubber?.id) return;
    
    async function subscribeToPush() {
      try {
        // Check if service worker and push are supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // Create new subscription
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidKey) return;
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        // Send subscription to backend
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: rubber.id,
            userType: 'rubber',
            subscription: subscription.toJSON(),
          }),
        });
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    }

    subscribeToPush();
  }, [rubber?.id]);

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notifications?limit=1&unreadOnly=true");
      const data = await res.json() as any;
      setUnreadNotifCount(data.unreadCount || 0);
    } catch (e) {}
  }

  async function fetchRubberData(rubberId: string) {
    if (!rubberId) return;
    setIsLoading(true);
    try {
      // Fetch Preferences (includes Work Status)
      const prefRes = await fetch(`/api/users/preferences?userId=${rubberId}`);
      const prefData = await prefRes.json() as any;
      if (prefData.preferences?.workStatus !== undefined) {
        setWorkStatus(prefData.preferences.workStatus);
      }

      const res = await fetch(`/api/rubber/orders?rubberId=${rubberId}`);
      const data = await res.json() as any;
      
      if (data.status === "unregistered") {
        setVerificationStatus("unregistered");
        setIsLoading(false);
        return;
      }

      setVerificationStatus(data.status);

      if (data.pictureUrl && data.pictureUrl !== rubber?.pictureUrl) {
        setRubber((prev: any) => ({ ...prev, pictureUrl: data.pictureUrl }));
        try {
          const session = JSON.parse(localStorage.getItem("rubjob_rubber_session") || "{}");
          localStorage.setItem("rubjob_rubber_session", JSON.stringify({ ...session, pictureUrl: data.pictureUrl }));
        } catch(e) {}
      }

      if (data.available) setAvailableJobs(data.available);
      if (data.active) setActiveJobs(data.active);

      // Fetch Balance & Today's Earnings
      const walRes = await fetch(`/api/rubber/wallet?rubberId=${rubberId}`);
      const walData = await walRes.json() as any;
      if (walData.balance !== undefined) setBalance(walData.balance);
      if (walData.todayEarnings !== undefined) setTodayEarnings(walData.todayEarnings);
    } catch (err) {
      console.error("Failed to fetch rubber dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleWorkStatus = async () => {
    setIsStatusModalOpen(false);
    const nextStatus = !workStatus;
    setWorkStatus(nextStatus);
    if (!rubber?.id) return;
    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: rubber.id, workStatus: nextStatus })
      });
    } catch (err) {
      console.error("Failed to update work status", err);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!rubber?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/rubber/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: jobId, rubberId: rubber.id }),
      });
      const data = await res.json() as any;
      if (res.ok && data.success) {
        setSelectedJob(null);
        // Navigate to the job details page for next steps
        router.push(`/rubber/orders/${jobId}`);
      } else {
        setAlertConfig({
          isOpen: true,
          title: t("common.error"),
          message: data.error || t("rubber.acceptJobError"),
          type: "error",
        });
      }
    } catch (err) {
      setAlertConfig({
        isOpen: true,
        title: t("common.error"),
        message: t("rubber.networkError"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/rubber/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("rubjob_rubber_session");
    router.push("/rubber/login");
  };

  // 🔔 In-App Notification Polling (Free & Fast)
  useEffect(() => {
    if (!rubber?.id || !workStatus) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rubber/orders?rubberId=${rubber.id}`);
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
  }, [rubber?.id, workStatus, availableJobs.length]);

  // 📱 PWA Installation Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    // Check if running inside LINE LIFF or any in-app browser
    const ua = navigator.userAgent;
    const isLIFF = ua.includes('LIFF') || ua.includes('Line/') || ua.includes('LINE/');
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (deferredPrompt) {
      // Chrome/Edge on Android — native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
      return;
    }

    if (isLIFF) {
      // Inside LINE — open in external browser
      const rubberUrl = `https://rubber.rubjob-all.com`;
      try {
        const liff = (window as any).liff;
        if (liff?.openWindow) {
          liff.openWindow({ url: rubberUrl, external: true });
          return;
        }
      } catch {}
      // Fallback: window.open
      window.open(rubberUrl, '_blank');
      return;
    }

    // Not in LIFF, no deferredPrompt — show manual instructions
    if (isIOS) {
      setAlertConfig({
        isOpen: true,
        title: "ติดตั้งแอปบน iPhone",
        message: "กดปุ่ม 'แชร์' (ไอคอนสี่เหลี่ยมมีลูกศร) ด้านล่างของ Safari แล้วเลือก 'เพิ่มลงในหน้าจอโฮม'",
        type: "warning"
      });
    } else if (isAndroid) {
      setAlertConfig({
        isOpen: true,
        title: "ติดตั้งแอปบน Android",
        message: "กดเมนู ⋮ มุมขวาบนของ Chrome แล้วเลือก 'เพิ่มลงในหน้าจอหลัก' หรือ 'ติดตั้งแอป'",
        type: "warning"
      });
    } else {
      setAlertConfig({
        isOpen: true,
        title: "ติดตั้งแอป",
        message: "เปิดเว็บไซต์นี้ใน Safari หรือ Chrome แล้วเลือก 'เพิ่มลงในหน้าจอโฮม' จากเมนูเบราว์เซอร์ครับ",
        type: "warning"
      });
    }
  };

  const isCollapsed = useScrollCollapse(50);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Dashboard Mascot Accent */}
      <div className="fixed -bottom-10 -right-10 w-48 opacity-[0.04] pointer-events-none select-none z-0 rotate-12 group hover:opacity-[0.08] transition-opacity">
        <img src="/images/มาสคอต-ขี่รถ.png" alt="" />
      </div>

      {/* Rubber Header */}
      <header className={`relative z-50 px-5 sticky top-0 header-transition ${
        isCollapsed ? "pt-2 pb-2 bg-primary shadow-md" : "pt-4 pb-4 bg-transparent"
      }`}>
        <div className={`flex items-center justify-between header-transition ${isCollapsed ? "mb-0" : "mb-6"}`}>
          <div className="flex items-center gap-3">
            <Icons.Logo variant="icon-white" size={isCollapsed ? 28 : 48} />
            <div className="min-w-0">
              <p className={`text-white font-black uppercase leading-tight flex items-center gap-1.5 header-element-collapse ${
                isCollapsed ? "text-[8px] mb-0 header-element-hidden" : "text-[10px] mb-1"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                {t("rubber.hero")}
              </p>
              <h1 className={`font-black text-white truncate drop-shadow-md leading-none header-transition ${
                isCollapsed ? "text-sm" : "text-xl"
              }`}>{rubber?.name || t("common.guest")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push("/rubber/notifications")}
              className={`relative rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md shadow-primary-dark/10 active:scale-90 transition-transform header-transition ${
                isCollapsed ? "w-7 h-7" : "w-9 h-9"
              }`}
            >
              <Icons.Bell size={isCollapsed ? 14 : 18} className="text-white" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-rose-500/40 animate-pulse">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Work Status Toggle — hides on scroll */}
        <div className={`header-element-collapse ${isCollapsed ? "header-element-hidden" : ""}`}>
          <Card className="mb-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg shadow-primary-dark/20 rounded-xl p-3 text-white">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${workStatus ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
                        <Icons.Shield size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-white/50 uppercase leading-none mb-0.5">{t("rubber.profile.workStatus")}</p>
                        <p className="text-sm font-black uppercase leading-none">
                          {workStatus ? t("rubber.profile.receivingJobs") : t("rubber.profile.notReceiving")}
                        </p>
                    </div>
                </div>
                <button 
                  onClick={() => setIsStatusModalOpen(true)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 ${workStatus ? 'bg-white shadow-md shadow-white/20' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 rounded-full shadow-sm transition-all duration-300 ${workStatus ? 'bg-primary transform translate-x-5' : 'bg-white'}`} />
                </button>
             </div>
          </Card>
        </div>

        {/* Stats Grid — hides on scroll */}
        <div className={`grid grid-cols-2 gap-4 text-center header-element-collapse ${isCollapsed ? "header-element-hidden" : ""}`}>
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white shadow-sm">
            <p className="text-xs font-black text-slate-500 uppercase">{t("rubber.tasksToday")}</p>
            <p className="text-2xl font-black mt-1 text-slate-800">{activeJobs.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-white shadow-sm">
            <p className="text-xs font-black text-slate-500 uppercase">รายได้วันนี้</p>
            <p className="text-3xl font-black mt-1 text-slate-800">
              ฿{Math.ceil(todayEarnings).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Dashboard Mascot Accent moved here or handled via background */}
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 animate-page-enter">
        {/* Tabs */}
        <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner border border-slate-200/50">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "available" ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("rubber.availablePickups")}
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === "active" ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t("rubber.activeDeliveries")}
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 space-y-7 pb-24 animate-page-enter">
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
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-page-enter relative z-10 min-h-[50vh]">
             {verificationStatus === "unregistered" ? (
               <>
                 <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-white border border-white/30 shadow-2xl mb-8 relative">
                    <Icons.Logo variant="icon" size={48} />
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase">{t("rubber.intro.heroTitle")}</h2>
                 <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                   {t("rubber.intro.heroDesc").split("\n").map((line, i) => (
                     <span key={i}>{line}{i === 0 && <br/>}</span>
                   ))}
                 </p>
                 <Button 
                   onClick={() => router.push("/rubber/setup")}
                   className="mt-8 bg-slate-900 text-white px-8 py-5 rounded-xl font-black uppercase shadow-xl active:scale-95 transition-all"
                 >
                   {t("rubber.intro.applyBtn")}
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
                   {verificationStatus === "pending" ? t("rubber.status.pending") : t("rubber.status.rejected")}
                 </h2>
                 <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed max-w-[280px]">
                   {verificationStatus === "pending" 
                     ? t("rubber.status.pendingDesc") 
                     : t("rubber.status.rejectedDesc")}
                 </p>
                 <div className="flex flex-col gap-3 w-full max-w-[200px] mt-8">
                   {verificationStatus === "rejected" && (
                     <Button 
                       onClick={() => router.push("/rubber/documents")}
                       className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase shadow-xl"
                     >
                       {t("rubber.status.editDocs")}
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
        ) : !workStatus ? (
          /* ☕ Break Mode — prominent full-screen message */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-page-enter min-h-[45vh]">
            {/* Large break icon */}
            <div className="relative mb-8">
              <div className="w-28 h-28 bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-slate-200 shadow-inner">
                <Icons.Clock size={56} className="text-slate-300" />
              </div>
              {/* Pulsing "paused" indicator */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <div className="w-3 h-1.5 bg-white rounded-sm" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-900 uppercase leading-tight">
              คุณกำลังพักเบรคอยู่
            </h2>
            <p className="text-sm text-slate-400 font-bold mt-3 leading-relaxed max-w-[260px]">
              คุณจะไม่ได้รับงานใหม่จนกว่าจะเปิดสถานะรับงานอีกครั้ง พักผ่อนให้เต็มที่ครับ
            </p>

            {/* Visual pulse ring */}
            <div className="mt-8 relative flex items-center justify-center">
              <div className="absolute w-16 h-16 rounded-full bg-orange-500/10 animate-ping" />
              <div className="absolute w-12 h-12 rounded-full bg-orange-500/20 animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center relative z-10">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
              </div>
            </div>

            {/* Resume button */}
            <Button
              onClick={() => setIsStatusModalOpen(true)}
              className="mt-10 bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-5 rounded-xl font-black uppercase shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-sm"
            >
              <Icons.Shield size={18} className="mr-2 inline" />
              เปิดรับงานอีกครั้ง
            </Button>
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
          {!rubber?.lineUserId && (
            <Card className="bg-gradient-to-r from-green-600 to-emerald-500 border-none text-white p-5 shadow-xl shadow-green-900/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Icons.Line size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-base uppercase leading-tight">เชื่อมต่อ LINE รับงาน</h3>
                  <p className="text-xs text-white/80 font-bold mt-1 leading-relaxed">รับแจ้งเตือนทันทีที่มีงานเข้า ไม่ต้องเปิดหน้าจอค้างไว้ครับ</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-4 bg-white text-emerald-600 font-black uppercase text-[10px] py-2 px-6 rounded-lg active:scale-95 transition-all"
                    onClick={async () => {
                      try {
                        if (!rubber?.id) return;
                        const res = await fetch(`/api/auth/link-line?type=rubber`);
                        const data = await res.json() as any;
                        if (!res.ok || !data.token) throw new Error("Failed to get linking token");
                        const liffId = process.env.NEXT_PUBLIC_LIFF_ID_RUBBER || process.env.NEXT_PUBLIC_LIFF_ID;
                        window.location.href = `https://liff.line.me/${liffId}/link-line?type=rubber&id=${data.accountId}&token=${data.token}`;
                      } catch (e) {
                        console.error("LINE link error:", e);
                        setAlertConfig({
                          isOpen: true,
                          title: t("common.error"),
                          message: "ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง",
                          type: "error",
                        });
                      }
                    }}
                  >
                    เชื่อมต่อตอนนี้
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card 
            className="bg-slate-900/50 backdrop-blur-xl border border-white/5 text-white p-5 active:bg-slate-900/70 transition-colors cursor-pointer"
            onClick={handleInstallClick}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                <Icons.Logo variant="icon" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase leading-tight">ติดตั้งแอปบนหน้าจอ</h3>
                  <span className="text-[8px] bg-primary px-2 py-0.5 rounded-full animate-pulse">แนะนำ</span>
                </div>
                <p className="text-[10px] text-white/60 font-bold mt-1 leading-relaxed">
                  กดที่นี่เพื่อเปิดในเบราว์เซอร์และเพิ่มไอคอนแอปลงหน้าจอมือถือ ใช้งานสะดวกเหมือนแอปจริง
                </p>
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
             <div className="relative h-24 bg-slate-50 rounded-xl border-2 border-slate-100/50 flex items-center justify-between px-10 overflow-x-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                {/* Left Side (Pickup) */}
                <div className="relative z-10 flex flex-col items-center">
                   <div className={`w-10 h-10 rounded-xl border-4 border-white shadow-xl flex items-center justify-center text-white ${(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') ? 'bg-primary' : 'bg-black'}`}>
                      {(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') ? <Icons.User size={20} /> : <Icons.Logo size={20} variant="icon" />}
                   </div>
                   <p className="text-xs font-black mt-2 uppercaseer opacity-50">
                     {(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') ? t("common.user") : t("common.store")}
                   </p>
                </div>

                <div className="flex-1 px-4 relative">
                   <div className="h-1 bg-slate-200 rounded-full w-full">
                      <div className="h-full bg-primary w-2/3 rounded-full shadow-[0_0_8px_rgba(255,159,28,0.5)] animate-shimmer" />
                   </div>
                   <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2">
                      <Icons.Bike size={18} className="text-primary transform scale-x-[-1] animate-bounce-slow" />
                   </div>
                </div>

                {/* Right Side (Delivery) */}
                <div className="relative z-10 flex flex-col items-center">
                   <div className={`w-10 h-10 rounded-xl border-4 border-white shadow-xl flex items-center justify-center text-white ${(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') ? 'bg-black' : 'bg-primary'}`}>
                      {(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') ? <Icons.Logo size={20} variant="icon" /> : <Icons.MapPin size={20} strokeWidth={3} />}
                   </div>
                   <p className="text-xs font-black mt-2 uppercaseer opacity-50">
                     {(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') ? t("common.store") : t("common.user")}
                   </p>
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
                     <p className="text-xl font-black text-slate-900 leading-none">฿{Number(selectedJob.rubberEarn || 0).toFixed(2)}</p>
                     <p className="text-xs text-slate-400 font-bold uppercase mt-1">{t("rubber.earnAmountLabel")}</p>
                   </div>
               </div>

               <div className="space-y-4 pt-2">
                  <div className="flex gap-4">
                    <Icons.Navigation size={18} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rubber.pickup")}</p>
                       <p className="text-xs font-bold text-slate-700 leading-relaxed">
                         {(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') 
                           ? (selectedJob.customerName || selectedJob.customer || t("rubber.unknownCustomer"))
                           : (selectedJob.storeName || selectedJob.store || t("rubber.unknownStore"))}
                       </p>
                       {(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') && (
                         <p className="text-xs text-slate-400 font-bold mt-1">{typeof selectedJob.address === 'string' ? selectedJob.address : (selectedJob.address?.details || selectedJob.address?.label || t("rubber.orderDetail.noAddress"))}</p>
                       )}
                    </div>
                  </div>
                 <div className="flex gap-4">
                    <Icons.MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rubber.delivery")}</p>
                       <p className="text-xs font-black text-slate-900 leading-relaxed">
                         {(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver')
                           ? (selectedJob.storeName || selectedJob.store || t("rubber.unknownStore"))
                           : (selectedJob.customerName || selectedJob.customer || t("rubber.unknownCustomer"))}
                       </p>
                       {!(selectedJob.status === 'pending' || selectedJob.status === 'searching_driver') && (
                         <p className="text-xs text-slate-400 font-bold mt-1">{typeof selectedJob.address === 'string' ? selectedJob.address : (selectedJob.address?.details || selectedJob.address?.label || t("rubber.orderDetail.noAddress"))}</p>
                       )}
                    </div>
                 </div>
               </div>
             </div>

             {/* Customer Note */}
             {selectedJob.customerNote && (
               <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <Icons.FileText size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">{t("rubber.orderDetail.customerNote") || "โน้ตจากลูกค้า"}</p>
                     <p className="text-xs font-bold text-amber-800">{selectedJob.customerNote}</p>
                  </div>
               </div>
             )}

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
                   {t("rubber.acceptJob")}
                </Button>
             </div>
          </div>
        )}
      </Modal>

      {/* Status Confirmation Modal */}
      <Modal 
        isOpen={isStatusModalOpen} 
        onClose={() => setIsStatusModalOpen(false)}
        title={workStatus ? t("rubber.profile.stopWorkTitle") || "หยุดรับงานชั่วคราว?" : t("rubber.profile.startWorkTitle") || "เริ่มรับงาน?"}
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${workStatus ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
             <Icons.Shield size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2 uppercase">
            {workStatus ? t("rubber.profile.stopWorkConfirm") || "ต้องการหยุดรับงานใช่หรือไม่?" : t("rubber.profile.startWorkConfirm") || "พร้อมเริ่มรับงานแล้วใช่หรือไม่?"}
          </h3>
          <p className="text-xs font-bold text-slate-400 mb-8 max-w-[240px]">
            {workStatus 
              ? t("rubber.profile.stopWorkDesc") || "เมื่อหยุดรับงาน คุณจะไม่เห็นงานใหม่ในพื้นที่จนกว่าจะเปิดสถานะอีกครั้ง" 
              : t("rubber.profile.startWorkDesc") || "เมื่อเริ่มรับงาน คุณจะได้รับการแจ้งเตือนงานใหม่ในพื้นที่ทันที"}
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

      <ConfirmModal 
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}

function AvailableDeliveries({ t, router, jobs, onAccept, onViewDetails }: { t: any, router: any, jobs: any[], onAccept: (id: string) => void, onViewDetails: (job: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-black text-slate-400 uppercase">{t("rubber.newRequests")}</h2>
        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{jobs.length} {t("rubber.nearby")}</span>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
           <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 transition-all hover:scale-105 border border-slate-100 grayscale opacity-40">
              <Icons.Logo variant="icon" size={40} />
           </div>
           <p className="text-xs font-black text-slate-300 uppercase">{t("rubber.noJobsNearby")}</p>
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
                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-lg uppercase ${(job.status === 'pending' || job.status === 'searching_driver') ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {(job.status === 'pending' || job.status === 'searching_driver') ? t("rubber.flow.pickupLeg") : t("rubber.flow.deliveryLeg")}
                  </span>
                  <span className="text-xs font-black text-slate-400 uppercase">{job.id}</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 leading-tight">
                  {(job.status === 'pending' || job.status === 'searching_driver') ? t("rubber.flow.customerToStore") : t("rubber.flow.storeToCustomer")}
                </h3>
                 <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                   <span className="flex items-center gap-1"><Icons.MapPin size={12} className="text-primary" /> {Number(job.distanceKm || 0.5).toFixed(1)} {t("rubber.nearby")}</span>
                   <span className="flex items-center gap-1"><Icons.ArrowRight size={12} className="text-primary" /> {t("rubber.earnAmount")} ฿{Number(job.rubberEarn || 0).toFixed(2)}</span>
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
                {t("rubber.acceptJob")}
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
        <h2 className="text-sm font-black text-slate-400 uppercase">{t("rubber.activeJobs")}</h2>
      </div>

      {activeJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
           <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-4 transition-all hover:scale-105 border border-slate-100 grayscale opacity-40">
              <Icons.Logo variant="icon" size={40} />
           </div>
           <p className="text-[10px] font-black text-slate-300 uppercase">{t("rubber.noActiveJobs")}</p>
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
              onClick={() => router.push(`/rubber/orders/${job.id}`)}
            >
              {t("rubber.manageTask")}
            </Button>
          </Card>
        ))
      )}
    </div>
  );
}
