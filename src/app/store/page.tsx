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

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[480px] bg-gradient-to-b from-primary via-primary-dark to-slate-50 z-0" />
      
      {/* Store Header */}
      <header className="relative z-10 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-2xl flex items-center justify-center text-primary border-4 border-white/50">
              <Icons.Logo size={36} variant="icon" />
            </div>
            <div className="min-w-0">
               <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em] leading-none mb-1 shadow-sm">{t("store.unitNo")} {store?.id?.split('-')[1] || '001'}</p>
               <h1 className="text-2xl font-black text-white tracking-tight truncate drop-shadow-md">{store?.name || t("common.guest")}</h1>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg shadow-white/5 active:scale-90 transition-transform text-white"
          >
            <Icons.Lock size={22} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-lg p-5 rounded-[2.5rem] border border-white/20 shadow-lg shadow-primary-dark/20 text-white">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">{t("store.navOrders")}</p>
            <p className="text-3xl font-black mt-1 tracking-tighter">
              {incomingOrders.length + washingOrders.length + readyOrders.length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-5 rounded-[2.5rem] border border-white/20 shadow-lg shadow-primary-dark/20 text-white">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">{t("store.wallet.availableBalance")}</p>
            <p className="text-3xl font-black mt-1 tracking-tighter flex items-center justify-center gap-1">
              <span className="text-sm">฿</span>{Math.floor(balance).toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 animate-fade-in">
        <div className="bg-white/40 backdrop-blur-xl p-1.5 rounded-[1.8rem] flex shadow-lg shadow-primary-dark/10 border border-white/40">
          {(["incoming", "washing", "ready"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] rounded-[1.4rem] transition-all duration-500 ${
                activeTab === tab ? "bg-white text-primary shadow-lg shadow-primary/20 scale-[1.02]" : "text-white/70"
              }`}
            >
              {tab === "incoming" ? t("store.incomingFromRider") : tab === "washing" ? t("store.processing") : t("store.readyForRider")}
              {tab === "incoming" && incomingOrders.length > 0 && <span className="ml-1 opacity-50">({incomingOrders.length})</span>}
            </button>
          ))}
        </div>
      </div>

        {isLoading ? (
          <div className="space-y-4 px-5">
             {[1, 2, 3].map((i) => (
               <div key={i} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 flex items-center gap-4">
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
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <Icons.FileText size={32} />
                 </div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">
                    {t("store.noJobs")}
                 </p>
              </div>
            ) : (
              (activeTab === "incoming" ? incomingOrders : activeTab === "washing" ? washingOrders : readyOrders).map((order) => (
                <Card key={order.id} className="p-4 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group rounded-[2rem]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-primary/5 transition-colors">
                      {getServiceIcon(order.serviceId as any, { size: 24, className: "group-hover:text-primary transition-colors" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{order.id}</span>
                        <Badge variant={statusToBadgeVariant(order.status)} className="scale-[0.8] origin-right">
                          {t(`orders.status.${order.status}`)}
                        </Badge>
                      </div>
                      <h3 className="font-black text-slate-800 leading-tight text-sm truncate">
                        {String(t(`orders.services.${order.serviceId}`) || order.serviceName || t("rider.unknownStore"))}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 grayscale opacity-60">
                        <div className="w-5 h-5 rounded-full bg-slate-200" />
                        <span className="text-[10px] font-bold text-slate-500">{order.userName || t("common.guest")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest py-3 border-2"
                      onClick={() => router.push(`/store/orders/${order.id}`)}
                    >
                      {t("common.details")}
                    </Button>
                    {activeTab === "incoming" && (
                      <Button 
                        className="flex-[2] bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest py-3"
                        isLoading={isSubmitting}
                        onClick={() => handleUpdateStatus(order.id, "washing")}
                      >
                        {t("store.receiveFromDriver")}
                      </Button>
                    )}
                    {activeTab === "washing" && (
                      <Button 
                        className="flex-[2] bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest py-3"
                        isLoading={isSubmitting}
                        onClick={() => handleUpdateStatus(order.id, "ready_for_pickup")}
                      >
                        {t("common.confirm")}
                      </Button>
                    )}
                    {activeTab === "ready" && (
                      <Button 
                        className="flex-[2] bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest py-3"
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
    );
}
