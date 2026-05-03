"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import Skeleton from "@/components/ui/Skeleton";

export default function RiderOrdersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const localSession = localStorage.getItem("rubjob_rider_session");
      if (localSession) {
        const parsed = JSON.parse(localSession);
        fetchOrders(parsed.id);
      } else {
        router.push("/rider/login");
      }
    } catch (err) {
      console.error("Session parse error:", err);
      router.push("/rider/login");
    }
  }, []);

  async function fetchOrders(riderId: string) {
    try {
      const res = await fetch(`/api/rider/orders?riderId=${riderId}`);
      const data = await res.json() as any;
      const combined: any[] = [];
      if (data.available) combined.push(...data.available);
      if (data.active) combined.push(...data.active);
      if (data.completed) combined.push(...data.completed);
      // If API only returns available/active, also add them
      setAllOrders(combined);
    } catch (err) {
      console.error("Failed to fetch rider orders:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const orders = filter === "active"
    ? allOrders.filter(o => o.status !== "completed" && o.status !== "cancelled")
    : allOrders.filter(o => o.status === "completed" || o.status === "cancelled");

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      {/* Header — Customer UI Style */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.push("/rider")}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 absolute left-1/2 -translate-x-1/2">
          {t("rider.myJobs")}
        </h1>
        <div className="w-9 h-9" />
      </header>

      {/* Tabs — Minimalist Pill Style */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex p-1 bg-slate-200/50 rounded-2xl border border-slate-200/50">
          {(["active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                flex-1 py-3 text-xs font-black uppercase rounded-[14px] transition-all duration-300
                ${filter === f 
                  ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 scale-[1.02]" 
                  : "text-slate-400 hover:text-slate-600"
                }
              `}
            >
              {f === "active" ? t("rider.inProgressTab") : t("rider.completedTab")}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-5 space-y-6 pb-28 animate-fade-in stagger">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-[1.75rem] border border-slate-100 flex items-center gap-4">
                <Skeleton variant="circle" className="w-14 h-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-24 h-4" />
                  <Skeleton variant="text" className="w-full h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 text-slate-200 border border-slate-50">
              <Icons.FileText size={40} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t("rider.noJobs")}</p>
          </div>
        ) : (
          <div className="space-y-4">
             {/* Section Label */}
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
               {filter === "active" ? t("rider.inProgressTab") : t("rider.completedTab")} ({orders.length})
             </p>

             {orders.map((order) => {
               const isPickup = order.status === "pending" || order.status === "picking_up" || order.status === "picked_up";
               return (
                 <Card 
                   key={order.id} 
                   className="p-0 overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-transform duration-300 rounded-[1.75rem] active:scale-[0.99] cursor-pointer"
                   onClick={() => router.push(`/rider/orders/${order.id}`)}
                 >
                   <div className="p-5 flex items-center gap-4">
                     {/* Icon Container */}
                     <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-primary-dark shrink-0 border border-slate-100">
                       {isPickup ? <Icons.Package size={28} /> : <Icons.Truck size={28} />}
                     </div>

                     {/* Details */}
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between gap-2 mb-1">
                         <h3 className="text-sm font-black text-slate-900 truncate uppercase">
                           {order.storeName || order.customerName || t("rider.unknownStore")}
                         </h3>
                         <Badge variant={statusToBadgeVariant(order.status as any)} className="text-[9px] font-black py-0.5 px-2">
                           {t(`orders.status.${order.status}`)}
                         </Badge>
                       </div>
                       <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight truncate">ID: {order.id}</p>
                       
                       <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            ฿{order.riderEarn || 0}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ""}
                          </span>
                       </div>
                     </div>
                     
                     <Icons.ChevronRight size={18} className="text-slate-300" />
                   </div>
                 </Card>
               );
             })}
          </div>
        )}
      </main>
    </div>
  );
}
