"use client";

import { useState, useEffect, useRef } from "react";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/providers/AdminProvider";

export default function AdminGlobalNotifier() {
  const { t } = useTranslation();
  const router = useRouter();
  const { admin } = useAdmin();
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    }
  }, []);

  const fetchAlerts = async () => {
    if (!admin) return;
    try {
      const [ordersRes, ticketsRes] = await Promise.all([
        fetch("/api/admin/orders").catch(() => null),
        fetch("/api/admin/support/tickets").catch(() => null)
      ]);
      
      const newAlerts: any[] = [];
      
      if (ordersRes && ordersRes.ok) {
        const data = await ordersRes.json() as any;
        if (data.orders) {
          // 1. Pending Assignment
          const pending = data.orders.filter((o: any) => o.status === "pending");
          if (pending.length > 0) {
            newAlerts.push({
              id: "pending_orders",
              type: "warning",
              title: "ออเดอร์รอการมอบหมาย",
              desc: `มี ${pending.length} ออเดอร์ที่รอมอบหมายให้คนขับ`,
              link: "/admin/orders",
              icon: Icons.Clock
            });
          }
          
          // 2. SLA Warning (> 3 hours at shop)
          const slaOrders = data.orders.filter((o: any) => {
            if (o.status !== "at_shop" || !o.arrivedAtShopAt) return false;
            const arrived = new Date(o.arrivedAtShopAt).getTime();
            return (Date.now() - arrived) / (1000 * 60 * 60) > 3;
          });
          if (slaOrders.length > 0) {
            newAlerts.push({
              id: "sla_orders",
              type: "critical",
              title: "ออเดอร์ค้างที่ร้านนานเกินไป",
              desc: `มี ${slaOrders.length} ออเดอร์อยู่ที่ร้านนานกว่า 3 ชั่วโมง`,
              link: "/admin/orders",
              icon: Icons.AlertTriangle
            });
          }
        }
      }
      
      if (ticketsRes && ticketsRes.ok) {
        const data = await ticketsRes.json() as any;
        if (data.tickets) {
          const unread = data.tickets.filter((t: any) => t.status === "active" && t.unreadCount > 0);
          if (unread.length > 0) {
            newAlerts.push({
              id: "unread_tickets",
              type: "info",
              title: "ข้อความช่วยเหลือใหม่",
              desc: `มี ${unread.length} ข้อความที่ยังไม่ได้อ่าน`,
              link: "/admin/support",
              icon: Icons.Message
            });
          }
        }
      }
      
      setAlerts(prev => {
        // If there are more alerts now than before, trigger sound and red dot
        if (newAlerts.length > 0 && JSON.stringify(newAlerts) !== JSON.stringify(prev)) {
          setHasNew(true);
          try {
            audioRef.current?.play().catch(() => {});
          } catch(e) {}
        }
        return newAlerts;
      });
      
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [admin]);

  if (!admin) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4 pointer-events-none">
      
      {/* Notifications Panel */}
      {isOpen && (
        <div className="w-80 bg-white rounded-3xl shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden pointer-events-auto animate-slide-up origin-bottom-right">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <Icons.Bell size={16} /> การแจ้งเตือน
            </h3>
            <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full">{alerts.length} รายการ</span>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2 no-scrollbar bg-slate-50">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Icons.CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-widest">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              alerts.map((alert, idx) => {
                const Icon = alert.icon;
                const colors = {
                  warning: "bg-orange-100 text-orange-600 border-orange-200",
                  critical: "bg-red-100 text-red-600 border-red-200",
                  info: "bg-blue-100 text-blue-600 border-blue-200"
                }[alert.type as "warning" | "critical" | "info"];

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(alert.link);
                    }}
                    className="w-full text-left mb-2 p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 transition-all flex items-start gap-3 active:scale-95"
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${colors}`}>
                      <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{alert.title}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">{alert.desc}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNew(false);
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center pointer-events-auto transition-all shadow-xl active:scale-95 ${
          hasNew ? "bg-red-500 text-white shadow-red-500/30 animate-bounce" : "bg-slate-900 text-white shadow-slate-900/20"
        }`}
      >
        <Icons.Bell size={24} className={hasNew ? "animate-pulse" : ""} />
        {alerts.length > 0 && !hasNew && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black">
            {alerts.length}
          </span>
        )}
      </button>
    </div>
  );
}
