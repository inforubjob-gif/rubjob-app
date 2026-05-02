"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function RiderOrdersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"active" | "completed">("active");

  // Mock data - in a real app these would be fetched from API
  const orders = filter === "active" ? [
    { id: "DLV-001", type: "pickup", status: "picking_up", date: "Today", earn: 45, location: "The EmQuartier" },
    { id: "DLV-000", type: "delivery", status: "delivering_to_customer", date: "Now", earn: 65, location: "Grande Centre Point" },
  ] : [
    { id: "DLV-988", type: "delivery", status: "completed", date: "Yesterday", earn: 60, location: "Sukhumvit 24" },
    { id: "DLV-987", type: "pickup", status: "completed", date: "24 Mar", earn: 45, location: "Ekkamai 12" },
  ];

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
        {orders.length === 0 ? (
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

             {orders.map((order) => (
               <Card 
                 key={order.id} 
                 className="p-0 overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-transform duration-300 rounded-[1.75rem] active:scale-[0.99] cursor-pointer"
                 onClick={() => router.push(`/rider/orders/${order.id}`)}
               >
                 <div className="p-5 flex items-center gap-4">
                   {/* Icon Container */}
                   <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-primary-dark shrink-0 border border-slate-100">
                     {order.type === "pickup" ? <Icons.Package size={28} /> : <Icons.Truck size={28} />}
                   </div>

                   {/* Details */}
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between gap-2 mb-1">
                       <h3 className="text-sm font-black text-slate-900 truncate uppercase">
                         {order.location}
                       </h3>
                       <Badge variant={statusToBadgeVariant(order.status as any)} className="text-[9px] font-black py-0.5 px-2">
                         {t(`orders.status.${order.status}`)}
                       </Badge>
                     </div>
                     <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight truncate">ID: {order.id}</p>
                     
                     <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          ฿{order.earn}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {order.date}
                        </span>
                     </div>
                   </div>
                   
                   <Icons.ChevronRight size={18} className="text-slate-300" />
                 </div>
               </Card>
             ))}
          </div>
        )}
      </main>
    </div>
  );
}
