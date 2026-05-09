"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function RubberNotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=50");
      const data = await res.json() as any;
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClick = async (notif: any) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markRead", notificationId: notif.id })
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {}
    }
    // Navigate if link exists
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "support_reply": return <Icons.Chat size={20} />;
      case "earning": return <Icons.Wallet size={20} />;
      case "withdrawal": return <Icons.Wallet size={20} />;
      case "order_update": return <Icons.Tasks size={20} />;
      default: return <Icons.Bell size={20} />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "support_reply": return "bg-blue-50 text-blue-500";
      case "earning": return "bg-emerald-50 text-emerald-500";
      case "withdrawal": return "bg-amber-50 text-amber-500";
      case "order_update": return "bg-primary/10 text-primary";
      default: return "bg-slate-50 text-slate-400";
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "เมื่อสักครู่";
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
    const days = Math.floor(hrs / 24);
    return `${days} วันที่แล้ว`;
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="bg-primary text-white px-5 pt-12 pb-6 rounded-b-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90 transition-all"
          >
            <Icons.Back size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black">🔔 แจ้งเตือน</h1>
            <p className="text-[10px] text-white/60 font-bold uppercase">
              {unreadCount > 0 ? `${unreadCount} รายการยังไม่ได้อ่าน` : "อัพเดทล่าสุด"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] font-black text-white/80 bg-white/15 px-3 py-1.5 rounded-full active:scale-95 transition-all"
            >
              อ่านทั้งหมด
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 pt-5 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Bell size={36} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">ยังไม่มีแจ้งเตือน</p>
            <p className="text-xs text-slate-300 mt-1">เมื่อมีอัพเดท จะปรากฏที่นี่</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left p-4 rounded-xl flex items-start gap-3 transition-all active:scale-[0.98] ${
                  notif.isRead 
                    ? "bg-white border border-slate-100" 
                    : "bg-white border-2 border-primary/20 shadow-md shadow-primary/5"
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconColor(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-black truncate ${notif.isRead ? "text-slate-700" : "text-slate-900"}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${notif.isRead ? "text-slate-400" : "text-slate-600"}`}>
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-slate-300 font-bold mt-1.5">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>

                {/* Arrow */}
                {notif.link && (
                  <Icons.ChevronRight size={16} className="text-slate-200 shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
