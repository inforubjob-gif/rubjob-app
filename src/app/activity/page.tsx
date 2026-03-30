"use client";

import Card from "@/components/ui/Card";
import { MOCK_ORDERS } from "@/lib/mock-data";
import Badge, { statusToBadgeVariant, statusLabel } from "@/components/ui/Badge";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function ActivityPage() {
  const { t } = useTranslation();
  // Show all orders as activity/history
  const activities = [...MOCK_ORDERS].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-border sticky top-0 z-30">
        <h1 className="text-xl font-bold text-foreground">Activity</h1>
        <p className="text-xs text-muted mt-0.5">Your recent activity and history</p>
      </header>

      <div className="flex-1 px-5 py-4 space-y-3 animate-fade-in stagger">
        {activities.map((order) => {
          const time = new Date(order.updatedAt);
          return (
            <Card key={order.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">
                      Order {order.id}
                    </p>
                    <Badge variant={statusToBadgeVariant(order.status)} className="scale-[0.8] origin-left">
                      {t(`orders.status.${order.status}`)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                    {time.toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {order.items.length} {t("orders.itemCount")} • ฿{order.totalPrice}
                  </p>
                </div>

                <div className="w-16 h-16 shrink-0 transition-transform active:scale-95">
                  <img 
                    src={
                      order.status === "completed" ? "/images/icon/เสร็จสิ้น.png" :
                      order.status === "washing" ? "/images/icon/icon-กำลังซัก.png" :
                      order.status === "delivering_to_customer" ? "/images/icon/icon-ไรเดอร์กำลังนำผ้าส่งคืน.png" :
                      order.status === "delivering_to_store" ? "/images/icon/icon-ไรเดอร์กำลังนำผ้าส่งร้าน.png" :
                      order.status === "picking_up" ? "/images/icon/icon-ไรเดอร์กำลังเข้ารับผ้า.png" :
                      "/images/icon/icon-ร้านซักผ้า.png"
                    } 
                    alt={order.status}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
