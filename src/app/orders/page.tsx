"use client";
 
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";
 
type TabFilter = "active" | "completed";
 
export default function OrdersPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const { t, language } = useTranslation();
  const [tab, setTab] = useState<TabFilter>("active");
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
 
  useEffect(() => {
    if (!profile?.userId) return;
 
    async function fetchOrders() {
      try {
        const res = await fetch(`/api/orders?userId=${profile?.userId}`);
        const data = (await res.json()) as any;
        if (data.orders) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, [profile?.userId]);
 
  const filtered = orders.filter((o) => {
    if (tab === "active") return o.status !== "completed" && o.status !== "cancelled" && o.status !== "rejected";
    return o.status === "completed" || o.status === "cancelled" || o.status === "rejected";
  });
 
  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      {/* Header — Styled like Notifications reference */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 absolute left-1/2 -translate-x-1/2">
          {t("orders.myOrders")}
        </h1>
        <div className="w-9 h-9" /> {/* Spacer for centering */}
      </header>
 
      {/* Tabs — Minimalist Pill Style */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex p-1 bg-slate-200/50 rounded-2xl border border-slate-200/50">
          {(["active", "completed"] as TabFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTab(f)}
              className={`
                flex-1 py-3 text-xs font-black uppercase rounded-[14px] transition-all duration-300
                ${tab === f 
                  ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 scale-[1.02]" 
                  : "text-slate-400 hover:text-slate-600"
                }
              `}
            >
              {f === "active" ? t("orders.activeTab") : t("orders.completedTab")}
            </button>
          ))}
        </div>
      </div>
 
      <main className="flex-1 p-5 space-y-6 pb-28 animate-fade-in stagger">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {t("common.loading")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 text-slate-200 border border-slate-50">
              <Icons.FileText size={40} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t("orders.noOrders")}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium max-w-[200px] mx-auto leading-relaxed">
              {t("orders.noOrdersSub").replace("{tab}", tab === "active" ? t("orders.activeTab") : t("orders.completedTab"))}
            </p>
            <Link
              href="/booking"
              className="mt-8 bg-primary text-white px-8 py-3 rounded-2xl text-xs font-black uppercase shadow-lg shadow-primary/30 active:scale-95 transition-all"
            >
              {t("orders.bookFirst")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
             {/* Section Label */}
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
               {tab === "active" ? t("orders.activeTab") : t("orders.completedTab")} ({filtered.length})
             </p>
 
             {filtered.map((order) => {
              const serviceId = order.serviceId || order.service;
              const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
              
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="p-0 overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-transform duration-300 rounded-[1.75rem] active:scale-[0.99] mb-4">
                    <div className="p-5 flex items-center gap-4">
                      {/* Icon Container */}
                      <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-primary-dark shrink-0 border border-slate-100">
                        {getServiceIcon(serviceId, { size: 28 })}
                      </div>
 
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-sm font-black text-slate-900 truncate uppercase">
                            {t(`orders.services.${serviceId}`) || "Service"}
                          </h3>
                          <Badge variant={statusToBadgeVariant(order.status)} className="text-[9px] font-black py-0.5 px-2">
                            {t(`orders.status.${order.status}`)}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight truncate">ID: {order.id}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                             ฿{order.totalPrice}
                           </span>
                           <span className="text-[10px] text-slate-400 font-bold">
                             {items.length} {t("orders.itemCount")} • {new Date(order.createdAt).toLocaleDateString(language === "th" ? "th" : "en", {
                                month: "short",
                                day: "numeric",
                             })}
                           </span>
                        </div>
                      </div>
                      
                      <Icons.ChevronRight size={18} className="text-slate-300" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
