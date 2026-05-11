"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all_users");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast("กรุณาพิมพ์ข้อความที่ต้องการส่ง", "error");
      return;
    }

    const targetLabel = target === "all_users" ? "ลูกค้าทั้งหมด" : target === "rubbers" ? "Rubber ทั้งหมด" : "ร้านค้าทั้งหมด";
    if (!confirm(`คุณต้องการส่งข้อความนี้ไปยัง "${targetLabel}" ใช่หรือไม่?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, target }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ส่งข้อความไม่สำเร็จ");
      
      showToast(`ส่งข้อความสำเร็จ! (ส่งได้: ${data.sent}, ล้มเหลว: ${data.failed})`, "success");
      setMessage("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
            <Icons.Bell size={24} />
          </div>
          ศูนย์ประกาศข่าวสาร
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          ส่งประกาศ โปรโมชั่น หรือการแจ้งเตือนไปยังผู้ใช้งานผ่าน LINE Push Notification
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8">
        <form onSubmit={handleSend} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">เลือกกลุ่มเป้าหมาย</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "all_users", label: "ลูกค้าทั้งหมด", icon: <Icons.Users size={20} /> },
                { id: "rubbers", label: "Rubber ทั้งหมด", icon: <Icons.Car size={20} /> }
              ].map(t => (
                <label 
                  key={t.id}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    target === t.id 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <input 
                    type="radio" 
                    name="target" 
                    value={t.id} 
                    checked={target === t.id} 
                    onChange={(e) => setTarget(e.target.value)} 
                    className="sr-only"
                  />
                  {t.icon}
                  <span className="font-bold text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">เนื้อหาข้อความ</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการส่งที่นี่... สามารถใช้อีโมจิได้ 😊"
              className="w-full h-40 p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-slate-700"
              required
            />
            <p className="text-xs text-slate-400 font-medium">
              หมายเหตุ: ข้อความจะถูกส่งเป็นข้อความมาตรฐานผ่าน LINE Official Account กรุณาตรวจสอบโควต้าการส่งข้อความ LINE Messaging API ของคุณ
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Icons.Loading size={20} />
                  กำลังส่งข้อความ...
                </>
              ) : (
                <>
                  <Icons.Bell size={20} />
                  ส่งข้อความประกาศ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
