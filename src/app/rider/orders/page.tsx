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

  const orders = filter === "active" ? [
    { id: "DLV-001", type: "pickup", status: "picking_up", date: "Today", earn: 45, location: "The EmQuartier" },
    { id: "DLV-000", type: "delivery", status: "delivering_to_customer", date: "Now", earn: 65, location: "Grande Centre Point" },
  ] : [
    { id: "DLV-988", type: "delivery", status: "completed", date: "Yesterday", earn: 60, location: "Sukhumvit 24" },
    { id: "DLV-987", type: "pickup", status: "completed", date: "24 Mar", earn: 45, location: "Ekkamai 12" },
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden text-slate-900">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      <header className="relative z-10 px-5 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={() => router.push("/rider")}
                className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20"
            >
                <Icons.Back size={20} />
            </button>
            <h1 className="text-xl font-black text-white tracking-tight drop-shadow-sm">{t("rider.myJobs")}</h1>
        </div>
        
        <div className="flex bg-white/20 p-1.5 rounded-[1.8rem] backdrop-blur-xl border border-white/20 shadow-lg shadow-primary-dark/10">
           <button 
                onClick={() => setFilter("active")}
                className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-[1.4rem] transition-all duration-500 ${filter === "active" ? "bg-white text-primary shadow-lg shadow-primary/20 scale-[1.02]" : "text-white/60"}`}
           >
                 {t("staff.inProgressTab")}
           </button>
           <button 
                onClick={() => setFilter("completed")}
                className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-[1.4rem] transition-all duration-500 ${filter === "completed" ? "bg-white text-primary shadow-lg shadow-primary/20 scale-[1.02]" : "text-white/70"}`}
           >
                 {t("staff.completedTab")}
           </button>
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 pb-24 animate-fade-in stagger">
        {orders.map((order) => (
          <Card 
            key={order.id} 
            className="p-4 active:scale-95 transition-transform"
            onClick={() => router.push(`/rider/orders/${order.id}`)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                {order.type === "pickup" ? <Icons.Package size={24} /> : <Icons.Truck size={24} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.id}</span>
                  <span className="text-xs font-black text-primary">฿{order.earn}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-700 leading-tight truncate max-w-[180px]">
                    {order.location}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{order.date}</p>
              </div>
              <div className="text-right">
                <Badge variant={statusToBadgeVariant(order.status as any)}>
                    {t(`orders.status.${order.status}`)}
                </Badge>
              </div>
            </div>
          </Card>
        ))}

        {orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Icons.Tasks size={48} className="opacity-20 mb-4" />
                <p className="font-bold text-slate-400">{t("staff.noJobs")}</p>
            </div>
        )}
      </div>
    </div>
  );
}
