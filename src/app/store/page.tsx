"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useStoreAuth } from "@/components/providers/StoreProvider";
import CountdownTimer from "@/components/ui/CountdownTimer";
import Skeleton from "@/components/ui/Skeleton";

// Operational state for Store

export default function StoreDashboard() {
  const { t } = useTranslation();
  const { store, logout } = useStoreAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"incoming" | "washing" | "ready">("incoming");
  const [isLoading, setIsLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const walData = await walRes.json();
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
      <div className="absolute top-0 left-0 right-0 h-[480px] bg-gradient-to-b from-primary via-primary-dark to-slate-50 z-0" />
      
      {/* Dashboard Mascot Accent */}
      <div className="fixed -bottom-10 -right-10 w-64 opacity-[0.04] pointer-events-none select-none z-0 rotate-6 hidden sm:block">
        <img src="/images/มาสคอต-ตากผ้า.png" alt="" />
      </div>

      {/* Store Header */}
      <header className="relative z-10 px-5 pt-3 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Icons.Logo variant="icon-white" size={56} />
            <div className="min-w-0">
               <p className="text-xs text-white/70 font-black uppercase leading-none mb-1 shadow-sm">{t("store.unitNo")} {store?.id?.split('-')[1] || '001'}</p>
               <h1 className="text-3xl font-black text-white truncate drop-shadow-md">{store?.name || t("common.guest")}</h1>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg shadow-white/5 active:scale-90 transition-transform text-white"
          >
            <Icons.Lock size={22} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-lg p-5 rounded-xl border border-white/20 shadow-lg shadow-primary-dark/20 text-white">
            <p className="text-xs font-black text-white/50 uppercase">{t("store.navOrders")}</p>
              <p className="text-4xl font-black mt-1er">
              {incomingOrders.length + washingOrders.length + readyOrders.length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-5 rounded-xl border border-white/20 shadow-lg shadow-primary-dark/20 text-white">
            <p className="text-xs font-black text-white/50 uppercase">{t("store.wallet.availableBalance")}</p>
            <p className="text-4xl font-black mt-1er flex items-center justify-center gap-1">
              <span className="text-sm">฿</span>{Math.floor(balance).toLocaleString()}
            </p>
          </div>
        </div>

        {/* PWA & LINE Connectivity Alert */}
        <div className="mt-8 space-y-4">
          {!store?.lineUserId && (
            <Card className="bg-gradient-to-r from-green-600 to-emerald-500 border-none text-white p-5 shadow-xl shadow-green-900/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Icons.Bell className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-base uppercase leading-tight">รับแจ้งออเดอร์ทาง LINE</h3>
                  <p className="text-xs text-white/80 font-bold mt-1 leading-relaxed">รับแจ้งเตือนทันทีที่มีลูกค้าสั่งของ หรือไรเดอร์กำลังเอาผ้ามาส่งครับ</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-4 bg-white text-emerald-600 font-black uppercase text-[10px] py-2 px-6 rounded-lg shadow-lg active:scale-95 transition-all"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/auth/link-line?accountId=${store.id}`);
                        const { token } = await res.json();
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

          <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/10 text-white p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                <Icons.Logo variant="icon" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm uppercase leading-tight">เพิ่มแอปตัวจัดการร้านค้าลงหน้าจอ</h3>
                <p className="text-[10px] text-white/50 font-bold mt-1 leading-relaxed">กดที่ปุ่ม 'แชร์' บนเบราว์เซอร์ แล้วเลือก 'เพิ่มลงในหน้าจอโฮม' เพื่อการใช้งานที่รวดเร็วครับ</p>
              </div>
            </div>
          </Card>
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 animate-fade-in">
        {/* Toggle Status */}
        <Card className="p-5 border-none shadow-sm shadow-primary/5 rounded-xl bg-white border border-primary/10">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-sm shadow-emerald-500/10">
                    <Icons.Shield size={22} />
                </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">{t("store.profile.workStatus")}</h3>
            <p className="text-xs text-emerald-500 font-bold uppercase">{workStatus ? t("store.profile.receivingJobs") : t("store.profile.notReceiving")}</p>
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

        <div className="bg-white/60 backdrop-blur-xl p-1.5 rounded-2xl flex shadow-xl shadow-primary-dark/5 border border-white/60">
          {(["incoming", "washing", "ready"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1 py-3.5 text-xs leading-tight font-black uppercase rounded-[1.2rem] transition-all duration-500 ${
                  activeTab === tab ? "bg-white text-primary shadow-xl shadow-primary/20 scale-[1.05]" : "text-primary-dark/40"
                }`}
              >
              <span>{tab === "incoming" ? t("store.incomingFromRider") : tab === "washing" ? t("store.processing") : t("store.readyForRider")}</span>
              {tab === "incoming" && incomingOrders.length > 0 && <span className="opacity-50">({incomingOrders.length})</span>}
            </button>
          ))}
        </div>

        {/* Orders Listing */}
        {isLoading ? (
          <div className="space-y-4 px-5">
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
        ) : (
          <div className="space-y-4">
            {(activeTab === "incoming" ? incomingOrders : activeTab === "washing" ? washingOrders : readyOrders).length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <Icons.FileText size={32} />
                 </div>
                 <p className="text-xs font-black text-slate-400 uppercase leading-tight">
                    {t("store.noJobs")}
                 </p>
              </div>
            ) : (
              (activeTab === "incoming" ? incomingOrders : activeTab === "washing" ? washingOrders : readyOrders).map((order) => (
                <Card key={order.id} className="p-4 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-primary/5 transition-colors">
                      {getServiceIcon(order.serviceId as any, { size: 24, className: "group-hover:text-primary transition-colors" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-slate-400 uppercase">{order.id}</span>
                        <Badge variant={statusToBadgeVariant(order.status)} className="scale-[0.8] origin-right">
                          {t(`orders.status.${order.status}`)}
                        </Badge>
                      </div>
                      <h3 className="font-black text-slate-800 leading-tight text-base truncate">
                        {String(t(`orders.services.${order.serviceId}`) || order.serviceName || t("rider.unknownStore"))}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 grayscale opacity-60">
                        <div className="w-5 h-5 rounded-full bg-slate-200" />
                        <span className="text-xs font-bold text-slate-500">{order.userName || t("common.guest")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl text-xs font-black uppercase py-3 border-2"
                      onClick={() => router.push(`/store/orders/${order.id}`)}
                    >
                      {t("common.details")}
                    </Button>
                    {activeTab === "incoming" && (
                      <Button 
                        className="flex-[2] bg-blue-600 text-white rounded-xl text-xs font-black uppercase py-3"
                        isLoading={isSubmitting}
                        onClick={() => handleUpdateStatus(order.id, "washing")}
                      >
                        {t("store.receiveFromDriver")}
                      </Button>
                    )}
                    {activeTab === "washing" && (
                      <Button 
                        className="flex-[2] bg-primary text-white rounded-xl text-xs font-black uppercase py-3"
                        isLoading={isSubmitting}
                        onClick={() => handleUpdateStatus(order.id, "ready_for_pickup")}
                      >
                        {t("common.confirm")}
                      </Button>
                    )}
                    {activeTab === "ready" && (
                      <Button 
                        className="flex-[2] bg-emerald-600 text-white rounded-xl text-xs font-black uppercase py-3"
                        isLoading={isSubmitting}
                        onClick={() => handleUpdateStatus(order.id, "completed")}
                      >
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
    </div>
  );
}
