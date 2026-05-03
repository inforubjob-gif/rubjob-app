"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon, IconCircle } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useStoreAuth } from "@/components/providers/StoreProvider";
import CountdownTimer from "@/components/ui/CountdownTimer";
import Skeleton from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";

// Operational state for Store

export default function StoreDashboard() {
  const { t } = useTranslation();
  const { store, logout } = useStoreAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"incoming" | "washing" | "ready">("incoming");
  const [isLoading, setIsLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Lifted state
  const [incomingOrders, setIncomingOrders] = useState<any[]>([]);
  const [washingOrders, setWashingOrders] = useState<any[]>([]);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  const fetchStoreData = async () => {
    const storeId = store?.id;
    if (!storeId) return;
    try {
      const res = await fetch(`/api/store/orders?storeId=${storeId}`);
      const data = await res.json() as any;
      if (data.orders) {
        const allOrders = data.orders;
        setIncomingOrders(allOrders.filter((o: any) => o.status === "delivering_to_store" || o.status === "picking_up" || o.status === "pending"));
        setWashingOrders(allOrders.filter((o: any) => o.status === "washing"));
        setReadyOrders(allOrders.filter((o: any) => o.status === "ready_for_pickup"));

        // Also fetch balance
        const walRes = await fetch(`/api/store/wallet?storeId=${storeId}`);
        const walData = await walRes.json() as any;
        if (walData.balance !== undefined) setBalance(walData.balance);

        const prefRes = await fetch(`/api/store/preferences?storeId=${storeId}`);
        const prefData = await prefRes.json() as any;
        if (prefData.preferences?.workStatus !== undefined) {
          setWorkStatus(prefData.preferences.workStatus);
        }
      }
    } catch (err) {
      console.error("Failed to fetch store dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (store) {
      fetchStoreData();
    } else {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [store]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsSubmitting(true);
    try {
      await fetch(`/api/store/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchStoreData();
    } catch (err) {
      console.error("Update status failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden pb-24">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[420px] bg-gradient-to-b from-primary via-primary-dark to-slate-50 z-0" />
      
      {/* Dashboard Mascot Accent */}
      <div className="fixed -bottom-20 -right-20 w-80 opacity-[0.04] pointer-events-none select-none z-0 rotate-12 group hover:opacity-[0.08] transition-opacity">
        <img src="/images/มาสคอต-ตากผ้า.png" alt="" />
      </div>

      {/* Store Header (Rider Style) */}
      <header className="relative z-10 px-6 pt-8 pb-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-white/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden">
                <Icons.Logo variant="icon-white" size={40} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="text-[10px] text-white/60 font-black uppercase tracking-widest leading-none">
                  {t("store.unitNo")} {store?.id?.split('-')[1] || '001'}
                </p>
              </div>
              <h1 className="text-2xl font-black text-white truncate drop-shadow-md leading-tight">
                {store?.name || t("common.guest")}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={logout}
                className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl active:scale-90 transition-all text-white group hover:bg-rose-500/20"
              >
                <Icons.LogOut size={22} className="group-hover:rotate-12 transition-transform" />
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
                      <p className="text-xs font-black text-white/50 uppercase leading-none mb-1">{t("store.profile.workStatus")}</p>
                      <p className="text-sm font-black uppercase">
                        {workStatus ? t("store.profile.receivingJobs") : t("store.profile.notReceiving")}
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

        {/* Stats Grid (Rider Style) */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 text-white relative overflow-hidden group">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">{t("store.navOrders")}</p>
            <div className="flex items-baseline justify-center gap-1">
              <p className="text-3xl font-black">{incomingOrders.length + washingOrders.length + readyOrders.length}</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 text-white relative overflow-hidden group">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">{t("store.wallet.availableBalance")}</p>
            <div className="flex items-baseline justify-center gap-1">
              <p className="text-3xl font-black">฿{Math.floor(balance).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 px-6 space-y-8 animate-fade-in">
        
        {/* Tab System (Rider Style) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-6 bg-primary rounded-full" />
               {activeTab === "incoming" ? t("store.incomingFromRider") : activeTab === "washing" ? t("store.processing") : t("store.readyForRider")}
            </h2>
            { (activeTab === "incoming" ? incomingOrders : activeTab === "washing" ? washingOrders : readyOrders).length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full">
                {(activeTab === "incoming" ? incomingOrders : activeTab === "washing" ? washingOrders : readyOrders).length} {t("orders.itemCount")}
              </span>
            )}
          </div>

          <div className="bg-slate-200/50 p-1.5 rounded-[1.5rem] flex shadow-inner border border-slate-200/50">
            {(["incoming", "washing", "ready"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl transition-all duration-300 ${
                    activeTab === tab ? "bg-white text-primary shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                {tab === "incoming" ? "รอรับ" : tab === "washing" ? "กำลังซัก" : "รอส่ง"}
              </button>
            ))}
          </div>

          {/* List Content */}
          {isLoading ? (
            <div className="space-y-4">
               {[1, 2, 3].map((i) => (
                 <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                   <Skeleton variant="circle" className="w-14 h-14" />
                   <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="w-24 h-4" />
                      <Skeleton variant="text" className="w-full h-3" />
                   </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(activeTab === "incoming" ? incomingOrders : activeTab === "washing" ? washingOrders : readyOrders).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
                      <Icons.FileText size={40} />
                   </div>
                   <div className="space-y-1">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{t("store.noJobs")}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("orders.noOrdersSub").replace('{tab}', '')}</p>
                   </div>
                </div>
              ) : (
                (activeTab === "incoming" ? incomingOrders : activeTab === "washing" ? washingOrders : readyOrders).map((order) => (
                  <Card key={order.id} className="p-5 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group rounded-[2rem] bg-white">
                    <div className="flex items-start gap-4">
                      <IconCircle variant="orange" size="md" className="group-hover:rotate-12 transition-transform duration-500">
                        {getServiceIcon(order.serviceId as any, { size: 28 })}
                      </IconCircle>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">ID: {order.id.slice(0,8)}</span>
                          <Badge variant={statusToBadgeVariant(order.status)} className="scale-90 origin-right shadow-sm">
                            {t(`orders.status.${order.status}`)}
                          </Badge>
                        </div>
                        <h3 className="font-black text-slate-800 leading-tight text-lg mb-2">
                          {t(`orders.services.${order.serviceId}`) || order.serviceName}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <Icons.User size={14} />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{order.userName || t("common.guest")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-5 border-t border-slate-50">
                      <Button 
                        variant="outline" 
                        className="flex-1 rounded-2xl text-[10px] font-black uppercase py-4 border-2"
                        onClick={() => router.push(`/store/orders/${order.id}`)}
                      >
                        {t("common.details")}
                      </Button>
                      {activeTab === "incoming" && (
                        <Button 
                          className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase py-4 shadow-lg shadow-blue-100"
                          isLoading={isSubmitting}
                          onClick={() => handleUpdateStatus(order.id, "washing")}
                        >
                          <Icons.Check size={16} />
                          {t("store.receiveFromDriver")}
                        </Button>
                      )}
                      {activeTab === "washing" && (
                        <Button 
                          className="flex-[2] bg-primary hover:bg-primary-dark text-white rounded-2xl text-[10px] font-black uppercase py-4 shadow-lg shadow-primary/20"
                          isLoading={isSubmitting}
                          onClick={() => handleUpdateStatus(order.id, "ready_for_pickup")}
                        >
                          <Icons.Check size={16} />
                          {t("common.confirm")}
                        </Button>
                      )}
                      {activeTab === "ready" && (
                        <Button 
                          className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase py-4 shadow-lg shadow-emerald-100"
                          isLoading={isSubmitting}
                          onClick={() => handleUpdateStatus(order.id, "completed")}
                        >
                          <Icons.Truck size={16} />
                          {t("store.handoverToDriver")}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Info Cards (Bottom) */}
        <div className="grid grid-cols-1 gap-4 pt-4">
          {!store?.lineUserId && (
            <Card className="bg-gradient-to-br from-emerald-600 to-teal-500 border-none text-white p-6 rounded-[2.5rem] shadow-xl shadow-emerald-900/20 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-start gap-5 relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-md border border-white/20">
                  <Icons.Bell className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg uppercase leading-tight mb-1">แจ้งเตือนผ่าน LINE</h3>
                  <p className="text-[11px] text-white/80 font-bold leading-relaxed mb-4">รับออเดอร์ใหม่ทันทีแบบเรียลไทม์</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-white text-emerald-600 font-black uppercase text-[10px] py-2.5 px-8 rounded-xl shadow-lg active:scale-95 transition-all"
                    onClick={async () => {
                      try {
                        if (!store) return;
                        const res = await fetch(`/api/auth/link-line?accountId=${store.id}`);
                        const data = await res.json() as any;
                        const token = data.token;
                        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
                        window.location.href = `https://liff.line.me/${liffId}/auth/link-line?type=store&id=${store.id}&token=${token}`;
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

          <Card className="bg-slate-900 text-white p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 shadow-xl shadow-primary/5">
                <Icons.Logo variant="icon" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase leading-tight">แอปจัดการร้านค้า</h3>
                <p className="text-[10px] text-white/50 font-bold mt-1 leading-relaxed">เพิ่มหน้าจอโฮมเพื่อการใช้งานที่รวดเร็ว</p>
              </div>
              <Icons.ChevronRight size={20} className="text-white/20 group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </div>
      </main>

      {/* Status Confirmation Modal */}
      {store && (
        <Modal 
          isOpen={isStatusModalOpen} 
          onClose={() => setIsStatusModalOpen(false)}
          title={workStatus ? t("store.profile.stopWorkTitle") || "หยุดรับงานชั่วคราว?" : t("store.profile.startWorkTitle") || "เริ่มรับงาน?"}
        >
          <div className="flex flex-col items-center text-center p-2">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${workStatus ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-emerald-50 text-emerald-500 shadow-emerald-100'}`}>
               <Icons.Shield size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">
              {workStatus ? t("store.profile.stopWorkConfirm") || "ต้องการหยุดรับงานใช่หรือไม่?" : t("store.profile.startWorkConfirm") || "พร้อมเริ่มรับงานแล้วใช่หรือไม่?"}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 mb-8 max-w-[260px] leading-relaxed uppercase">
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
                className={`rounded-2xl py-4 font-black uppercase text-[11px] text-white shadow-lg ${workStatus ? "bg-rose-500 shadow-rose-200" : "bg-emerald-500 shadow-emerald-200"}`}
                onClick={handleToggleWorkStatus}
              >
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
