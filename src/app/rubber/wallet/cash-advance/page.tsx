"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { Icons, IconCircle } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

export default function CashAdvancePage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [settledTotal, setSettledTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "settled">("pending");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const session = localStorage.getItem("rubjob_rubber_session");
      if (!session) return;
      const parsed = JSON.parse(session);
      const rubberId = parsed?.id;
      if (!rubberId) return;

      const res = await fetch(`/api/rubber/cash-advance?rubberId=${rubberId}`);
      const data = await res.json() as any;
      setRecords(data.records || []);
      setPendingTotal(data.pendingTotal || 0);
      setSettledTotal(data.settledTotal || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredRecords = records.filter(r => {
    if (tab === "pending") return r.status === "pending";
    return r.status === "settled" || r.status === "rejected";
  });

  const tempLabels: Record<string, string> = { cold: "น้ำเย็น", warm: "น้ำอุ่น", hot: "น้ำร้อน" };

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-5 pt-4 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="active:scale-95 transition-transform">
            <IconCircle variant="white" size="sm"><Icons.Back size={16} /></IconCircle>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">เงินสดสำรองจ่าย</h1>
            <p className="text-xs text-slate-400">Cash Advance Wallet</p>
          </div>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-6 animate-fade-in">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-none shadow-2xl shadow-amber-500/30 rounded-[2rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">ยอดค้างรับคืน</p>
            <h2 className="text-4xl font-black italic">฿{pendingTotal.toLocaleString()}</h2>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-white/50 uppercase">
              <span>รอ Admin จ่ายคืน</span>
              <span>จ่ายคืนไปแล้ว ฿{settledTotal.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          <button
            onClick={() => setTab("pending")}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${tab === "pending" ? "bg-amber-50 text-amber-600 shadow-sm" : "text-slate-400"}`}
          >
            รอจ่ายคืน ({records.filter(r => r.status === "pending").length})
          </button>
          <button
            onClick={() => setTab("settled")}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${tab === "settled" ? "bg-emerald-50 text-emerald-600 shadow-sm" : "text-slate-400"}`}
          >
            เสร็จสิ้น ({records.filter(r => r.status !== "pending").length})
          </button>
        </div>

        {/* Records List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="p-16 text-center bg-white border-none shadow-sm rounded-[2rem]">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icons.Wallet size={32} className="text-slate-200" />
            </div>
            <p className="text-xs font-black text-slate-300 uppercase">ไม่มีรายการ</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map(r => (
              <Card key={r.id} className="p-4 bg-white border-none shadow-sm rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${r.machineType === "washer" ? "bg-blue-50" : "bg-orange-50"}`}>
                    {r.machineType === "washer" ? "🫧" : "🌀"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-900">
                        {r.machineType === "washer" ? "เครื่องซัก" : "เครื่องอบ"} {r.machineSizeKg}kg
                      </p>
                      {r.status === "settled" && <Badge variant="success">จ่ายแล้ว</Badge>}
                      {r.status === "rejected" && <Badge variant="danger">ปฏิเสธ</Badge>}
                      {r.status === "pending" && <Badge variant="warning">รอจ่ายคืน</Badge>}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {r.storeName} {r.waterTemp ? `• ${tempLabels[r.waterTemp] || r.waterTemp}` : ""} • {new Date(r.createdAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <p className="text-lg font-black text-slate-900 italic shrink-0">฿{r.amount}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
