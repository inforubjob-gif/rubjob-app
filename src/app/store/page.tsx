"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";
import CountdownTimer from "@/components/ui/CountdownTimer";

// Operational state for Store

export default function StoreDashboard() {
  const { t } = useTranslation();
  const { profile } = useLiff();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"incoming" | "processing">("incoming");
  const [isLoading, setIsLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState(true);

  // Lifted state
  const [incomingOrders, setIncomingOrders] = useState<any[]>([]);
  const [processingOrders, setProcessingOrders] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStoreData() {
      const storeId = profile?.assignedStoreId;
      try {
        const res = await fetch(`/api/store/orders?storeId=${storeId}`);
        const data = await res.json() as any;
        if (data.orders) {
          const allOrders = data.orders;
          setIncomingOrders(allOrders.filter((o: any) => o.status === "delivering_to_store" || o.status === "picking_up"));
          setProcessingOrders(allOrders.filter((o: any) => o.status === "washing" || o.status === "pending"));
        }
      } catch (err) {
        console.error("Failed to fetch store dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile) {
      fetchStoreData();
    } else {
      // Small delay for dev mode if profile is missing
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const handleReceiveOrder = (orderId: string) => {
    // Navigate to the order detail page for confirmation and processing
    router.push(`/store/orders/${orderId}`);
  };

  const handleHandover = (orderId: string) => {
    // Navigate to the order detail page for the two-step handover (Call Rider -> Handover)
    router.push(`/store/orders/${orderId}`);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer (Vibrant Orange Theme) */}
      <div className="absolute top-0 left-0 right-0 h-[480px] bg-gradient-to-b from-primary via-primary-dark to-slate-50 z-0" />
      
      {/* Store Header */}
      <header className="relative z-10 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-2xl flex items-center justify-center text-primary border-4 border-white/50">
              <Icons.Logo size={36} variant="icon" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em] leading-none mb-1 shadow-sm">STORE UNIT #049</p>
              <h1 className="text-2xl font-black text-white tracking-tight truncate drop-shadow-md">{profile?.displayName || t("common.guest")}</h1>
            </div>
          </div>
          <button className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg shadow-white/5 active:scale-90 transition-transform text-white">
            <Icons.Bell size={22} />
          </button>
        </div>

        {/* Work Status Toggle */}
        <Card className="mb-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-primary-dark/20 rounded-[2rem] p-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${workStatus ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/60'}`}>
                      <Icons.Shield size={20} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">{t("store.profile.workStatus")}</p>
                      <p className="text-sm font-black text-white uppercase tracking-tight">
                        {workStatus ? t("store.profile.receivingJobs") : t("store.profile.notReceiving")}
                      </p>
                  </div>
              </div>
              <button 
                onClick={() => setWorkStatus(!workStatus)}
                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workStatus ? 'bg-white shadow-lg shadow-white/20' : 'bg-white/20'}`}
              >
                <div className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 ${workStatus ? 'bg-primary transform translate-x-6' : 'bg-white'}`} />
              </button>
           </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-lg p-5 rounded-[2.5rem] border border-white/20 shadow-lg shadow-primary-dark/20">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">{t("store.tasksToday")}</p>
            <p className="text-3xl font-black mt-1 text-white tracking-tighter">
              {incomingOrders.length + processingOrders.length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg p-5 rounded-[2.5rem] border border-white/20 shadow-lg shadow-primary-dark/20">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">{t("store.earnings")}</p>
            <p className="text-3xl font-black mt-1 text-white tracking-tighter">
              ฿{processingOrders.reduce((sum, o: any) => sum + (o.laundryFee || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 animate-fade-in shadow-primary/20">
        <div className="bg-white/40 backdrop-blur-xl p-1.5 rounded-[1.8rem] flex shadow-lg shadow-primary-dark/10 border border-white/40">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-[0.1em] rounded-[1.4rem] transition-all duration-500 ${
              activeTab === "incoming" ? "bg-white text-primary shadow-lg shadow-primary/20 scale-[1.02]" : "text-white/70"
            }`}
          >
            {t("store.incomingFromRider")}
          </button>
          <button
            onClick={() => setActiveTab("processing")}
            className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-[0.1em] rounded-[1.4rem] transition-all duration-500 ${
              activeTab === "processing" ? "bg-white text-primary shadow-lg shadow-primary/20 scale-[1.02]" : "text-white/70"
            }`}
          >
            {t("store.processing")}
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 pt-8 space-y-6 pb-24 animate-fade-in">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">Initializing Terminal...</p>
          </div>
        ) : (
          <>
            {activeTab === "incoming" ? (
              <IncomingOrders t={t} router={router} orders={incomingOrders} onReceive={handleReceiveOrder} />
            ) : (
              <ProcessingOrders t={t} router={router} orders={processingOrders} onHandover={handleHandover} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function IncomingOrders({ t, router, orders, onReceive }: { t: any, router: any, orders: any[], onReceive: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Rider Delivering to Store
        </h2>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100">
           <div className="text-4xl mb-3">📦</div>
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t("store.noJobs") || "No incoming orders"}</p>
        </div>
      ) : (
        orders.map((job) => (
          <Card key={job.id} className="p-4 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-primary/5 transition-colors">
                 {getServiceIcon(job.serviceId as any, { size: 30, className: "group-hover:text-primary transition-colors" })}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{job.id}</span>
                  <Badge variant="info" className="scale-75 origin-right px-3 py-1 bg-blue-50 text-blue-600 font-black">
                    {t(`orders.status.${job.status}`)}
                  </Badge>
                </div>
                <h3 className="font-extrabold text-slate-800 mb-1.5 leading-tight text-base">
                  {t(`orders.services.${job.serviceId}`)}
                </h3>
                <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                   <Icons.User size={14} className="text-primary" /> {job.userName}
                </div>
              </div>
            </div>
            <Button 
              fullWidth 
              className="mt-4 bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 py-4 font-black uppercase tracking-widest text-xs rounded-2xl active:scale-95 transition-all" 
              size="sm"
              onClick={() => onReceive(job.id)}
            >
              <Icons.Check size={16} className="mr-2" strokeWidth={4} /> {t("store.receiveFromDriver")}
            </Button>
          </Card>
        ))
      )}
    </div>
  );
}

function ProcessingOrders({ t, router, orders, onHandover }: { t: any, router: any, orders: any[], onHandover: (id: string) => void }) {
  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Active Internal Processing
        </h2>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100">
           <div className="text-4xl mb-3">🧼</div>
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t("store.noJobs") || "No orders being processed"}</p>
        </div>
      ) : (
        orders.map((job) => (
          <Card key={job.id} className={`p-5 border-2 ${job.isExpress ? 'border-red-200 bg-red-50 shadow-red-100' : 'border-slate-100'} shadow-sm rounded-[2.5rem] transition-all hover:shadow-xl`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${job.totalPrice > 100 ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'} rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/5`}>
                {getServiceIcon(job.serviceId as any, { size: 32 })}
              </div>
              <div className="flex-1 border-r border-slate-200 mr-2 pr-2">
                <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[10px] font-black text-slate-500/80 uppercase tracking-widest">{job.id}</p>
                    {job.totalPrice > 200 && <Badge variant="danger" className="scale-[0.85] origin-left bg-red-700 text-white font-black italic px-2 tracking-tighter shadow-sm">PRIORITY</Badge>}
                </div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                   {t(`orders.services.${job.serviceId}`)}
                </h3>
              </div>
              <div className="text-right">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</div>
                 <div className="text-xs font-bold text-slate-600">
                    {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
               <Button variant="outline" className="rounded-2xl border-2 font-black text-[10px] py-3.5" onClick={() => router.push(`/store/orders/${job.id}`)}>
                 {t("common.details")}
               </Button>
               <Button 
                className="bg-primary text-white hover:bg-primary-dark rounded-2xl shadow-xl shadow-primary/20 font-black text-[10px] py-3.5 tracking-widest uppercase active:scale-95 transition-all" 
                size="sm"
                onClick={() => onHandover(job.id)}
              >
                 {t("store.handoverToDriver")}
               </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
