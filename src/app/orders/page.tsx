"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
// Removed mock import
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
    if (tab === "active") return o.status !== "completed" && o.status !== "cancelled";
    return o.status === "completed" || o.status === "cancelled";
  });

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Header */}
      <header className="relative z-30 px-5 pt-6 pb-4 transition-all">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 text-white active:scale-95 transition-transform"
          >
            <Icons.Back size={20} />
          </button>
          <h1 className="text-xl font-black text-white tracking-tight">{t("orders.myOrders")}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/10">
          {(["active", "completed"] as TabFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTab(f)}
              className={`
                flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200
                ${tab === f ? "bg-white text-slate-900 shadow-lg" : "text-white/60"}
              `}
            >
              {f === "active" ? t("orders.activeTab") : t("orders.completedTab")}
            </button>
          ))}
        </div>
      </header>

      <div className="relative z-10 flex-1 px-5 py-4 space-y-5 animate-fade-in stagger pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-xs mt-4 font-bold tracking-widest uppercase">
              {t("common.loading") || "Loading Orders..."}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-300">
            <Icons.FileText size={48} strokeWidth={1.5} className="mb-4 opacity-20" />
            <p className="text-sm font-semibold text-foreground">{t("orders.noOrders")}</p>
            <p className="text-xs text-muted mt-1">
              {t("orders.noOrdersSub").replace("{tab}", tab === "active" ? t("orders.activeTab") : t("orders.completedTab"))}
            </p>
            <Link
              href="/booking"
              className="mt-4 text-sm font-semibold text-primary-dark underline underline-offset-2"
            >
              {t("orders.bookFirst")}
            </Link>
          </div>
        ) : (
          filtered.map((order) => {
            const serviceId = order.serviceId || order.service;
            const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
            
            return (
              <Link key={order.id} href={`/orders/${order.id}`} className="block">
                <Card className="p-5 shadow-lg shadow-slate-200/50 border border-slate-100" hoverable>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark shrink-0">
                        {getServiceIcon(serviceId, { size: 24 })}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-foreground">
                          {t(`orders.services.${serviceId}`) || "Service"}
                        </h3>
                        <p className="text-xs text-muted mt-0.5 font-medium">{order.id}</p>
                      </div>
                    </div>
                    <Badge variant={statusToBadgeVariant(order.status)}>
                      {t(`orders.status.${order.status}`)}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between text-sm">
                    <span className="text-muted font-medium">
                      {items.length} {t("orders.itemCount")} •{" "}
                      {new Date(order.createdAt).toLocaleDateString(language === "th" ? "th" : language === "zh" ? "zh" : "en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-black text-foreground text-base">฿{order.totalPrice}</span>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
