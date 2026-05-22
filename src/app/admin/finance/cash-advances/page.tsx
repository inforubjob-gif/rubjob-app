"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/providers/ToastProvider";

export default function CashAdvancesPage() {
  const { showToast } = useToast();
  const [grouped, setGrouped] = useState<any[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [expandedRubber, setExpandedRubber] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/cash-advances?status=${statusFilter}`);
      const data = await res.json() as any;
      setGrouped(data.grouped || []);
      setGrandTotal(data.grandTotal || 0);
      setTotalRecords(data.totalRecords || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSettle(id: string) {
    setSettlingId(id);
    try {
      const res = await fetch("/api/admin/cash-advances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "settle" }),
      });
      if (res.ok) {
        showToast("จ่ายคืนเรียบร้อย", "success");
        fetchData();
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSettlingId(null);
    }
  }

  async function handleReject(id: string) {
    const note = prompt("หมายเหตุ (ทำไมถึงปฏิเสธ)?");
    try {
      const res = await fetch("/api/admin/cash-advances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reject", note }),
      });
      if (res.ok) {
        showToast("ปฏิเสธรายการแล้ว", "success");
        fetchData();
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  }

  async function handleSettleAll(rubberId: string) {
    if (!confirm("ยืนยันจ่ายคืนทั้งหมดให้ Rubber คนนี้?")) return;
    setSettlingId(rubberId);
    try {
      const res = await fetch("/api/admin/cash-advances/settle-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubberId }),
      });
      const data = await res.json() as any;
      if (res.ok) {
        showToast(`จ่ายคืน ฿${data.settledTotal?.toLocaleString()} (${data.settledCount} รายการ) เรียบร้อย`, "success");
        fetchData();
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSettlingId(null);
    }
  }

  const tempLabels: Record<string, string> = { cold: "น้ำเย็น", warm: "น้ำอุ่น", hot: "น้ำร้อน" };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">💰 เงินสดสำรองจ่าย (Cash Advances)</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">จัดการยอดเงินสดที่ Rubber จ่ายให้ร้านค้า</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-none shadow-xl shadow-amber-500/20">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">ยอดค้างจ่ายคืนรวม</p>
          <p className="text-3xl font-black mt-1">฿{grandTotal.toLocaleString()}</p>
        </Card>
        <Card className="p-6 bg-white border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">จำนวนรายการ</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{totalRecords}</p>
        </Card>
        <Card className="p-6 bg-white border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rubber ที่มียอดค้าง</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{grouped.length}</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl w-fit">
        {[
          { value: "pending", label: "รอจ่ายคืน", color: "text-amber-600" },
          { value: "settled", label: "จ่ายคืนแล้ว", color: "text-emerald-600" },
          { value: "rejected", label: "ปฏิเสธ", color: "text-rose-600" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-6 py-3 text-xs font-black rounded-xl transition-all ${statusFilter === f.value ? `bg-white ${f.color} shadow-sm` : "text-slate-400 hover:text-slate-600"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped by Rubber */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-20 text-center bg-white border border-slate-100">
          <Icons.Check size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-sm font-black text-slate-400 uppercase">ไม่มีรายการ {statusFilter === "pending" ? "ค้างจ่ายคืน" : statusFilter === "settled" ? "ที่จ่ายแล้ว" : "ที่ปฏิเสธ"}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <Card key={group.rubberId} className="bg-white border border-slate-100 shadow-sm overflow-hidden">
              {/* Rubber Header */}
              <button
                onClick={() => setExpandedRubber(expandedRubber === group.rubberId ? null : group.rubberId)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                    {group.rubberName?.[0] || "R"}
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900">{group.rubberName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{group.count} รายการ • {group.rubberPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-black text-amber-500">฿{group.totalPending.toLocaleString()}</p>
                  </div>
                  {statusFilter === "pending" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSettleAll(group.rubberId); }}
                      disabled={settlingId === group.rubberId}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                    >
                      {settlingId === group.rubberId ? "..." : "Settle All"}
                    </button>
                  )}
                  <Icons.ChevronDown size={16} className={`text-slate-300 transition-transform ${expandedRubber === group.rubberId ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Expanded Records */}
              {expandedRubber === group.rubberId && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {group.records.map((r: any) => (
                    <div key={r.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${r.machineType === "washer" ? "bg-blue-50 text-blue-500" : "bg-orange-50 text-orange-500"}`}>
                          {r.machineType === "washer" ? "🫧" : "🌀"}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {r.machineType === "washer" ? "เครื่องซัก" : "เครื่องอบ"} {r.machineSizeKg}kg
                            {r.waterTemp && <span className="text-slate-400 font-bold"> • {tempLabels[r.waterTemp] || r.waterTemp}</span>}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {r.storeName} • {r.orderId || "ไม่มี order"} • {new Date(r.createdAt).toLocaleDateString("th-TH")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-900">฿{r.amount}</span>
                        {statusFilter === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSettle(r.id)}
                              disabled={settlingId === r.id}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleReject(r.id)}
                              className="px-3 py-1.5 bg-rose-50 text-rose-500 rounded-lg text-[10px] font-black uppercase border border-rose-100 hover:bg-rose-100 transition-all"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {statusFilter === "settled" && (
                          <Badge variant="success">จ่ายแล้ว</Badge>
                        )}
                        {statusFilter === "rejected" && (
                          <Badge variant="danger">ปฏิเสธ</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
