"use client";

export const runtime = "edge";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";
import GlobalSelect from "@/components/ui/GlobalSelect";

import Modal from "@/components/ui/Modal";

const STATUS_FLOW = [
 { key: "pending", label: "รอรับงาน", icon: "⏳" },
 { key: "picking_up", label: "ไรเดอร์ไปรับผ้า", icon: "🏍️" },
 { key: "delivering_to_store", label: "กำลังส่งร้านซัก", icon: "🚚" },
 { key: "at_shop", label: "อยู่ที่ร้านซัก", icon: "🏪" },
 { key: "washing", label: "กำลังซัก", icon: "🧺" },
 { key: "ready_for_pickup", label: "ซักเสร็จ รอส่งคืน", icon: "✅" },
 { key: "delivering_to_customer", label: "กำลังส่งคืนลูกค้า", icon: "📦" },
 { key: "completed", label: "สำเร็จ", icon: "🎉" },
];

function getNextStatuses(current: string) {
 const idx = STATUS_FLOW.findIndex(s => s.key === current);
 if (idx === -1 || idx >= STATUS_FLOW.length - 1) return [];
 return STATUS_FLOW.slice(idx + 1);
}

export default function AdminOrderDetailPage() {
 const { id } = useParams<{ id: string }>();
 const router = useRouter();
 const { t } = useTranslation();
 const { showToast } = useToast();
 const [order, setOrder] = useState<any>(null);
 const [riders, setRiders] = useState<any[]>([]);
 const [stores, setStores] = useState<any[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isUpdating, setIsUpdating] = useState(false);
 const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
 const [staffNote, setStaffNote] = useState("");
 const [confirmModal, setConfirmModal] = useState<{ key: string; label: string; icon: string } | null>(null);
 const [changeModal, setChangeModal] = useState<{ type: 'store' | 'pickup' | 'delivery' } | null>(null);
 const [changeModalValue, setChangeModalValue] = useState("");
 const [isSkippingPayment, setIsSkippingPayment] = useState(false);
 const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
 const [elapsedTime, setElapsedTime] = useState("00:00:00");
 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
 const [rejectReason, setRejectReason] = useState("");

 useEffect(() => {
  if (id) { fetchOrder(); fetchRiders(); fetchStores(); }
 }, [id]);

 // ── Live Elapsed Timer ──
 useEffect(() => {
  if (timerRef.current) clearInterval(timerRef.current);
  if (!order?.updatedAt && !order?.createdAt) return;
  
  const timeStr = order.updatedAt || order.createdAt;
  // SQLite timestamps are UTC but lack the 'Z' suffix. Append 'Z' to prevent timezone offset bugs.
  const safeTimeStr = timeStr.includes('Z') ? timeStr : timeStr.replace(' ', 'T') + 'Z';
  const startTime = new Date(safeTimeStr).getTime();
  
  function tick() {
   const now = Date.now();
   const diff = Math.max(0, now - startTime);
   const hrs = Math.floor(diff / 3600000);
   const mins = Math.floor((diff % 3600000) / 60000);
   const secs = Math.floor((diff % 60000) / 1000);
   setElapsedTime(
    `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
   );
  }
  tick();
  timerRef.current = setInterval(tick, 1000);
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
 }, [order?.updatedAt, order?.createdAt]);

 async function fetchOrder() {
  setIsLoading(true);
  try {
   const res = await fetch(`/api/admin/orders?id=${id}`);
   const data = await res.json() as any;
   if (data.order) {
    setOrder(data.order);
    setStaffNote(data.order.staffNote || "");
   }
  } catch (err) { console.error(err); }
  finally { setIsLoading(false); }
 }

 async function fetchRiders() {
  try {
   const res = await fetch("/api/admin/rubbers");
   const data = await res.json() as any;
   if (data.rubbers) setRiders(data.rubbers);
  } catch {}
 }

 async function fetchStores() {
  try {
   const res = await fetch("/api/admin/stores");
   const data = await res.json() as any;
   if (data.stores) setStores(data.stores);
  } catch {}
 }

 async function handleUpdate(updates: any) {
  setIsUpdating(true);
  try {
   const res = await fetch(`/api/admin/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
   });
   if (res.ok) {
    showToast(t("admin.broadcast.updateSuccess"), "success");
    fetchOrder();
   } else {
    const err = await res.json() as any;
    showToast(err.error || t("admin.broadcast.genericError"), "error");
   }
  } catch { showToast(t("admin.broadcast.genericError"), "error"); }
  finally { setIsUpdating(false); }
 }

 async function handleRebroadcast(type: 'pickup' | 'delivery') {
  if (!confirm(`ยืนยันบรอดแคสหาไรเดอร์ ${type === 'pickup' ? 'รับผ้า' : 'ส่งคืน'} ใหม่?\n\nระบบจะปลดไรเดอร์เดิมออก และส่งแจ้งเตือนหาคนขับทุกคนที่ออนไลน์อยู่`)) return;
  setIsBroadcasting(type);
  try {
   const res = await fetch(`/api/admin/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rebroadcastType: type }),
   });
   if (res.ok) {
    showToast(`📡 บรอดแคสหาไรเดอร์${type === 'pickup' ? 'รับผ้า' : 'ส่งคืน'}ใหม่สำเร็จ!`, "success");
    fetchOrder();
   } else {
    const err = await res.json() as any;
    showToast(err.error || "เกิดข้อผิดพลาด", "error");
   }
  } catch { showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error"); }
  finally { setIsBroadcasting(null); }
 }

  function parseAddress(addr: any) {
   try { return typeof addr === 'string' ? JSON.parse(addr)?.label : addr?.label; }
   catch { return addr || 'ไม่ระบุ'; }
  }

  function parseUTCDate(dateStr: string) {
   if (!dateStr) return new Date();
   return new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  }

 if (isLoading) return <div className="flex justify-center py-40"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
 if (!order) return <div className="text-center py-40 font-bold text-slate-400 uppercase">Order not found</div>;

 const nextStatuses = getNextStatuses(order.status);
 const currentStep = STATUS_FLOW.findIndex(s => s.key === order.status);

 return (
  <>
  <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-fade-in">
   {/* Header */}
   <header className="flex items-center gap-4 flex-wrap">
    <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all">
     <Icons.Back size={18} />
    </button>
    <div className="flex-1 min-w-0">
     <h1 className="text-2xl font-black text-slate-900 tracking-tight">ออเดอร์ #{order.id?.slice(-6).toUpperCase()}</h1>
     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{order.serviceName || order.orderType || 'logistics'}</p>
    </div>
    <Badge variant={statusToBadgeVariant(order.status)} className="text-sm px-4 py-2">{STATUS_FLOW.find(s => s.key === order.status)?.label || order.status}</Badge>
   </header>

   {/* ── Status Pipeline + Timer ── */}
   <Card className="p-6 bg-white border border-slate-100">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
     <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะงาน (Order Pipeline)</h2>
     {/* ── Elapsed Timer ── */}
     {order.status !== 'completed' && order.status !== 'cancelled' && (
      <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg">
       <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
       <div className="flex flex-col">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/40">เวลาที่ใช้ไป</span>
        <span className="text-xl font-black font-mono tracking-wider">{elapsedTime}</span>
       </div>
       <div className="ml-2 text-[8px] font-black uppercase text-white/30 max-w-[80px] leading-tight">
        นับจากอัปเดตล่าสุด
       </div>
      </div>
     )}
    </div>
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
     {STATUS_FLOW.map((step, i) => {
      const isCurrent = step.key === order.status;
      const isPast = i < currentStep;
      const isFuture = i > currentStep;
      return (
       <div key={step.key} className="flex items-center gap-1 shrink-0">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all
         ${isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : ''}
         ${isPast ? 'bg-emerald-50 text-emerald-600' : ''}
         ${isFuture ? 'bg-slate-50 text-slate-300' : ''}
        `}>
         <span>{step.icon}</span>
         <span className="whitespace-nowrap">{step.label}</span>
         {isPast && <Icons.CheckCircle size={14} />}
        </div>
        {i < STATUS_FLOW.length - 1 && <div className={`w-4 h-0.5 ${isPast ? 'bg-emerald-300' : 'bg-slate-100'}`} />}
       </div>
      );
     })}
    </div>
   </Card>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* ── Left Column: Main Controls ── */}
    <div className="lg:col-span-2 space-y-6">

     {/* ── Quick Actions ── */}
     {order.status !== 'completed' && order.status !== 'cancelled' && (
      <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl">
       <h2 className="text-xs font-black uppercase tracking-widest text-white/50 mb-5 flex items-center gap-2">
        <Icons.Settings size={14} /> ศูนย์บัญชาการ (Command Center)
       </h2>



        {/* Status Transition Buttons - Full Admin Control Tower */}
        <div>
         <label className="text-[10px] font-black text-white/40 uppercase block mb-3">⚡ อัปเดตสถานะ (Admin Control Tower)</label>
         
         <div className="grid grid-cols-1 gap-3">
          {/* Washing - Admin triggers on behalf of the store */}
          {(order.status === "at_shop" || order.status === "delivering_to_store") && (
           <button
            onClick={() => setConfirmModal({ key: "washing", label: "กำลังซัก (ร้านเริ่มซักแล้ว)", icon: "🧺" })}
            disabled={isUpdating}
            className="w-full py-5 bg-blue-500 hover:bg-blue-400 text-white text-lg font-black rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
           >
            <span className="text-2xl">🧺</span>
            <span>เริ่มซักผ้า (Washing)</span>
            <Icons.ChevronRight size={20} />
           </button>
          )}

          {/* Ready for return - Admin marks when store is done */}
          {(order.status === "washing" || order.status === "at_shop") && (
           <button
            onClick={() => setConfirmModal({ key: "ready_for_pickup", label: "ซักเสร็จ พร้อมส่งคืน", icon: "✅" })}
            disabled={isUpdating}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-black rounded-2xl shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
           >
            <span className="text-2xl">✅</span>
            <span>ซักเสร็จแล้ว พร้อมส่งคืน</span>
            <Icons.ChevronRight size={20} />
           </button>
          )}

          {/* Wait for return rider */}
          {order.status === "ready_for_pickup" && (
           <div className="w-full py-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">
             🏍️ เรียกไรเดอร์ให้แล้ว... รอไรเดอร์กดรับงาน
            </p>
           </div>
          )}

          {/* Complete */}
          {order.status === "delivering_to_customer" && (
           <button
            onClick={() => setConfirmModal({ key: "completed", label: "สำเร็จ (ส่งถึงลูกค้าแล้ว)", icon: "🎉" })}
            disabled={isUpdating}
            className="w-full py-5 bg-violet-500 hover:bg-violet-400 text-white text-lg font-black rounded-2xl shadow-xl shadow-violet-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
           >
            <span className="text-2xl">🎉</span>
            <span>ส่งถึงลูกค้าแล้ว — ปิดงาน</span>
            <Icons.ChevronRight size={20} />
           </button>
          )}

          {/* Pending/Picking up - Show informational state */}
          {(order.status === "pending" || order.status === "picking_up") && (
           <div className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-center">
            <p className="text-xs font-bold text-white/40 uppercase">
             {order.status === "pending" 
              ? "⏳ รอไรเดอร์กดรับงาน..." 
              : "🏍️ ไรเดอร์กำลังเดินทางไปรับผ้า..."}
            </p>
           </div>
          )}

          {/* Manual Override - For edge cases */}
          <details className="group">
           <summary className="cursor-pointer text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors py-2 flex items-center gap-2">
            <Icons.Settings size={12} /> Manual Override (สำหรับกรณีพิเศษ)
           </summary>
           <div className="mt-2 grid grid-cols-2 gap-2">
            {nextStatuses.map(s => (
             <button
              key={s.key}
              onClick={() => setConfirmModal(s)}
              disabled={isUpdating}
              className="py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border border-white/5"
             >
              <span>{s.icon}</span>
              <span>{s.label}</span>
             </button>
            ))}
           </div>
          </details>
         </div>

         {/* Cancel - Danger Zone */}
         <button
          onClick={() => setConfirmModal({ key: 'cancelled', label: 'ยกเลิกงาน', icon: '❌' })}
          disabled={isUpdating}
          className="mt-4 w-full py-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm font-black rounded-xl border border-rose-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
         >
          ❌ ยกเลิกงาน
         </button>
        </div>

       {/* Skip Payment — Testing Tool */}
       {order.paymentStatus !== 'paid' && (
        <button
         onClick={async () => {
          setIsSkippingPayment(true);
          try {
           const res = await fetch(`/api/admin/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: "paid" }),
           });
           if (res.ok) {
            showToast("✅ ข้ามการจ่ายเงินสำเร็จ — Broadcast งานให้คนขับแล้ว", "success");
            fetchOrder();
           } else {
            const err = await res.json() as any;
            showToast(err.error || "เกิดข้อผิดพลาด", "error");
           }
          } catch { showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error"); }
          finally { setIsSkippingPayment(false); }
         }}
         disabled={isSkippingPayment}
         className="mt-4 w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border border-amber-600/20"
        >
         {isSkippingPayment ? (
          <>
           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
           กำลังดำเนินการ...
          </>
         ) : (
          <>
           🧪 ข้ามการจ่ายเงิน (Testing)
          </>
         )}
        </button>
       )}
      </Card>
      )}

      {/* ── Slip Verification (แนบสลิปจากลูกค้า) ── */}
      {order.paymentStatus === 'slip_uploaded' && (
       <Card className="p-6 border-2 border-amber-200 bg-amber-50/30 shadow-lg shadow-amber-100/30">
        <h2 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-5 flex items-center gap-2">
         🧾 สลิปชำระเงินจากลูกค้า — รอตรวจสอบ
        </h2>
        
        {/* Slip Image */}
        {(() => {
          // Find slip URL from payment_logs data (stored in rawResponse)
          const slipLog = order.paymentLogs?.find((l: any) => l.gateway === 'manual_slip');
          let slipUrl = null;
          try {
            if (slipLog?.rawResponse) {
              slipUrl = JSON.parse(slipLog.rawResponse)?.slipUrl;
            }
          } catch {}
          // Fallback: search all payment logs for slip URL
          if (!slipUrl) {
            const anySlip = order.paymentLogs?.find((l: any) => l.rawResponse?.includes?.('slipUrl'));
            try { if (anySlip) slipUrl = JSON.parse(anySlip.rawResponse)?.slipUrl; } catch {}
          }
          return slipUrl ? (
            <div className="mb-5 cursor-pointer" onClick={() => setSelectedPhoto(slipUrl)}>
              <img src={slipUrl} alt="สลิปการโอนเงิน" className="w-full max-w-sm mx-auto rounded-xl border-2 border-amber-200 shadow-lg" />
              <p className="text-[10px] text-amber-500 text-center mt-2 font-bold">กดที่รูปเพื่อดูขนาดเต็ม</p>
            </div>
          ) : (
            <div className="mb-5 p-6 bg-amber-50 rounded-xl text-center">
              <p className="text-xs font-bold text-amber-500">⚠️ ไม่พบรูปสลิป — ตรวจสอบใน R2 Bucket โดยตรง</p>
            </div>
          );
        })()}

        {/* Amount Info */}
        <div className="mb-5 p-4 bg-white rounded-xl border border-amber-100">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">ยอดที่ต้องจ่าย</span>
            <span className="text-xl font-black text-slate-900">฿{order.totalPrice || 0}</span>
          </div>
        </div>

        {/* Reject Reason */}
        <div className="mb-4">
          <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">เหตุผล (กรณีปฏิเสธ)</label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="เช่น ยอดไม่ตรง, สลิปไม่ชัด, สลิปปลอม"
            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:border-amber-400 outline-none transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              if (!confirm("ยืนยัน: ปฏิเสธสลิปนี้?")) return;
              setIsVerifyingSlip(true);
              try {
                const res = await fetch("/api/admin/orders/verify-slip", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: order.id, action: "reject", reason: rejectReason || undefined }),
                });
                const data = await res.json() as any;
                if (res.ok) { showToast("❌ ปฏิเสธสลิปแล้ว — แจ้งลูกค้าเรียบร้อย", "success"); fetchOrder(); }
                else showToast(data.error || "เกิดข้อผิดพลาด", "error");
              } catch { showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error"); }
              finally { setIsVerifyingSlip(false); }
            }}
            disabled={isVerifyingSlip}
            className="py-4 bg-white border-2 border-rose-200 text-rose-600 font-black text-sm rounded-xl hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-50"
          >
            ❌ ปฏิเสธ
          </button>
          <button
            onClick={async () => {
              if (!confirm("ยืนยัน: อนุมัติสลิปนี้? ระบบจะส่งงานให้ Rubber ทันที")) return;
              setIsVerifyingSlip(true);
              try {
                const res = await fetch("/api/admin/orders/verify-slip", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: order.id, action: "approve" }),
                });
                const data = await res.json() as any;
                if (res.ok) { showToast("✅ อนุมัติสลิปสำเร็จ — กำลังหา Rubber!", "success"); fetchOrder(); }
                else showToast(data.error || "เกิดข้อผิดพลาด", "error");
              } catch { showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error"); }
              finally { setIsVerifyingSlip(false); }
            }}
            disabled={isVerifyingSlip}
            className="py-4 bg-emerald-500 text-white font-black text-sm rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isVerifyingSlip ? "กำลังดำเนินการ..." : "✅ อนุมัติ — ส่งงาน"}
          </button>
        </div>
       </Card>
      )}

      {/* ── Evidence Photos ── */}
      <Card className="p-6">
       <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-5 flex items-center gap-2">
        <Icons.Shield className="text-primary" size={16} /> หลักฐานรูปภาพ (Evidence Photos)
       </h2>
       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
         { label: "รับผ้าจากลูกค้า (Pickup)", url: order?.serviceDetails ? (() => { try { const d = JSON.parse(order.serviceDetails); return d?.proofPhotos?.delivering_to_store || d?.proofPhotos?.picking_up || order.evidenceBeforeUrl; } catch { return order.evidenceBeforeUrl; } })() : order?.evidenceBeforeUrl },
         { label: "ส่งที่ร้านซัก (Dropoff)", url: order?.serviceDetails ? (() => { try { const d = JSON.parse(order.serviceDetails); return d?.proofPhotos?.at_shop || order.dropoffShopPhotoUrl; } catch { return order.dropoffShopPhotoUrl; } })() : order?.dropoffShopPhotoUrl },
         { label: "รับจากร้าน (From Store)", url: order?.serviceDetails ? (() => { try { const d = JSON.parse(order.serviceDetails); return d?.proofPhotos?.delivering_to_customer || null; } catch { return null; } })() : null },
         { label: "ส่งคืนลูกค้า (Delivered)", url: order?.serviceDetails ? (() => { try { const d = JSON.parse(order.serviceDetails); return d?.proofPhotos?.completed || order.evidenceAfterUrl; } catch { return order.evidenceAfterUrl; } })() : order?.evidenceAfterUrl },
        ].map((photo) => (
        <div key={photo.label} className="space-y-2">
         <p className="text-[9px] font-black text-slate-400 uppercase">{photo.label}</p>
         <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden border-2 border-slate-100 flex items-center justify-center group relative cursor-pointer"
          onClick={() => photo.url && setSelectedPhoto(photo.url)}
         >
          {photo.url ? (
           <>
            <img src={photo.url} className="w-full h-full object-cover" alt={photo.label} />
            <div className="absolute inset-0 bg-black/40 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all flex items-center justify-center">
             <Icons.Search size={20} className="text-white" />
            </div>
           </>
          ) : (
           <div className="text-center">
            <Icons.User size={24} className="text-slate-200 mx-auto" />
            <p className="text-[8px] text-slate-300 font-bold mt-1">ยังไม่มี</p>
           </div>
          )}
         </div>
        </div>
       ))}
      </div>
     </Card>

     {/* ── Pricing Breakdown ── */}
     <Card className="p-6">
      <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-5">💰 รายละเอียดค่าบริการ</h2>
      <div className="space-y-3">
       <div className="flex justify-between text-sm font-bold border-b border-slate-50 pb-3">
        <span className="text-slate-500">ค่าซัก ({order.serviceName || 'Wash & Dry'})</span>
        <span className="text-slate-900">฿{order.laundryFee || 0}</span>
       </div>
       <div className="flex justify-between text-sm font-bold border-b border-slate-50 pb-3">
        <span className="text-slate-500">ค่าขนส่ง ({order.distanceKm ? `${(Number(order.distanceKm) * 2).toFixed(1)} km (ไป-กลับ)` : '-'})</span>
        <span className="text-slate-900">฿{order.deliveryFee || 0}</span>
       </div>
       {Number(order.cancellationFee) > 0 && (
        <div className="flex justify-between text-sm font-bold text-rose-500 border-b border-rose-50 pb-3">
         <span>ค่ายกเลิก</span><span>฿{order.cancellationFee}</span>
        </div>
       )}
       <div className="flex justify-between text-lg font-black pt-2">
        <span className="text-slate-900">ยอดรวมสุทธิ</span>
        <span className="text-primary">฿{order.totalPrice || 0}</span>
       </div>
      </div>
     </Card>

     {/* ── Staff Note ── */}
     <Card className="p-6">
      <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">📝 โน้ตสำหรับทีมงาน</h2>
      <textarea
       value={staffNote}
       onChange={(e) => setStaffNote(e.target.value)}
       placeholder="บันทึกข้อมูลเพิ่มเติม เช่น ผ้าชิ้นไหน, ร้านซักรับเวลาไหน..."
       className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm font-medium focus:border-primary outline-none transition-all resize-none"
       rows={3}
      />
      <button
       onClick={() => handleUpdate({ staffNote })}
       disabled={isUpdating}
       className="mt-3 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase rounded-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
      >
       💾 บันทึกโน้ต
      </button>
     </Card>
    </div>

    {/* ── Right Column: Info Cards ── */}
    <div className="space-y-6">
     {/* Customer Info */}
     <Card className="p-5">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">👤 ข้อมูลลูกค้า</h3>
      <div className="flex items-center gap-3 mb-4">
       <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
        {order.customerPicture ? <img src={order.customerPicture} className="w-full h-full object-cover" /> : <Icons.User size={20} className="text-slate-300" />}
       </div>
       <div>
        <p className="font-black text-slate-900 text-sm">{order.customerName || 'ไม่ระบุชื่อ'}</p>
        <p className="text-xs font-bold text-slate-400">{order.customerPhone || 'ไม่มีเบอร์'}</p>
       </div>
      </div>
      {order.customerPhone && (
       <a href={`tel:${order.customerPhone}`} className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 text-xs font-black rounded-xl hover:bg-emerald-100 transition-all">
        <Icons.Phone size={14} /> โทรหาลูกค้า
       </a>
      )}
      <div className="mt-4 pt-4 border-t border-slate-50">
       <p className="text-[9px] font-black text-slate-300 uppercase mb-1">ที่อยู่จัดส่ง</p>
       <p className="text-xs font-bold text-slate-600 leading-relaxed">{parseAddress(order.address)}</p>
      </div>
     </Card>

     {/* Store Info */}
     <Card className="p-5 border-2 border-primary/10">
      <div className="flex items-center justify-between mb-4">
       <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">🏪 ร้านซักที่รับงาน</h3>
       <button onClick={() => { setChangeModal({ type: 'store' }); setChangeModalValue(order.storeId || ""); }} className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors uppercase">เปลี่ยนร้าน (ฉุกเฉิน)</button>
      </div>
      {order.storeName ? (
       <>
        <div className="flex items-center gap-3 mb-4">
         <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icons.Office size={22} className="text-primary" />
         </div>
         <div>
          <p className="font-black text-slate-900 text-sm">{order.storeName}</p>
          <p className="text-xs font-bold text-slate-400">{order.storePhone || 'ไม่มีเบอร์'}</p>
         </div>
        </div>
        {order.storePhone && (
         <a href={`tel:${order.storePhone}`} className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary text-xs font-black rounded-xl hover:bg-primary/20 transition-all">
          <Icons.Phone size={14} /> โทรหาร้านซัก
         </a>
        )}
        {order.storeAddress && (
         <div className="mt-3 pt-3 border-t border-slate-50">
          <p className="text-[9px] font-black text-slate-300 uppercase mb-1">ที่อยู่ร้าน</p>
          <p className="text-xs font-bold text-slate-600">{parseAddress(order.storeAddress)}</p>
         </div>
        )}
       </>
      ) : (
       <div className="text-center py-6">
        <Icons.Office size={32} className="text-slate-200 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-400">ยังไม่ได้ระบุร้านซัก</p>
        <p className="text-[10px] text-slate-300 mt-1">เลือกร้านจาก Command Center ด้านบน</p>
       </div>
      )}
     </Card>

     {/* Pickup Rider Info */}
     <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
       <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">🏍️ ไรเดอร์รับผ้า</h3>
        <button 
         onClick={() => handleRebroadcast('pickup')}
         disabled={!!isBroadcasting}
         className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors uppercase disabled:opacity-50 flex items-center gap-1.5"
        >
         {isBroadcasting === 'pickup' ? (
          <><div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> กำลังบรอดแคส...</>
         ) : (
          <>📡 บรอดแคสใหม่</>
         )}
        </button>
      </div>
      {order.pickupRiderName ? (
       <>
        <div className="flex items-center gap-3 mb-3">
         <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Icons.Car size={18} className="text-emerald-500" /></div>
         <div>
          <p className="font-black text-slate-900 text-sm">{order.pickupRiderName}</p>
          <p className="text-xs font-bold text-slate-400">{order.pickupRiderPhone || '-'}</p>
         </div>
        </div>
        {order.pickupRiderPhone && (
         <a href={`tel:${order.pickupRiderPhone}`} className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 text-xs font-black rounded-xl hover:bg-emerald-100 transition-all">
          <Icons.Phone size={14} /> โทรหาไรเดอร์
         </a>
        )}
       </>
      ) : (
       <p className="text-xs font-bold text-slate-400 italic text-center py-4">ยังไม่ได้มอบหมาย</p>
      )}
     </Card>

     {/* Delivery Rider Info */}
     <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
       <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">📦 ไรเดอร์ส่งคืน</h3>
        <button 
         onClick={() => handleRebroadcast('delivery')}
         disabled={!!isBroadcasting}
         className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors uppercase disabled:opacity-50 flex items-center gap-1.5"
        >
         {isBroadcasting === 'delivery' ? (
          <><div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /> กำลังบรอดแคส...</>
         ) : (
          <>📡 บรอดแคสใหม่</>
         )}
        </button>
      </div>
      {order.deliveryRiderName ? (
       <>
        <div className="flex items-center gap-3 mb-3">
         <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Icons.Car size={18} className="text-blue-500" /></div>
         <div>
          <p className="font-black text-slate-900 text-sm">{order.deliveryRiderName}</p>
          <p className="text-xs font-bold text-slate-400">{order.deliveryRiderPhone || '-'}</p>
         </div>
        </div>
        {order.deliveryRiderPhone && (
         <a href={`tel:${order.deliveryRiderPhone}`} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 text-xs font-black rounded-xl hover:bg-blue-100 transition-all">
          <Icons.Phone size={14} /> โทรหาไรเดอร์
         </a>
        )}
       </>
      ) : (
       <p className="text-xs font-bold text-slate-400 italic text-center py-4">ยังไม่ได้มอบหมาย</p>
      )}
     </Card>

     {/* Order Meta */}
     <Card className="p-5 bg-slate-50/50">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">📋 ข้อมูลทั่วไป</h3>
      <div className="space-y-3 text-xs">
       <div className="flex justify-between"><span className="text-slate-400 font-bold">Order ID</span><span className="font-mono font-black text-slate-700">{order.id}</span></div>
       <div className="flex justify-between"><span className="text-slate-400 font-bold">ประเภท</span><span className="font-black text-slate-700">{order.orderType || 'logistics'}</span></div>
       <div className="flex justify-between"><span className="text-slate-400 font-bold">การชำระเงิน</span><span className="font-black text-slate-700">{order.paymentMethod || '-'}</span></div>
       <div className="flex justify-between"><span className="text-slate-400 font-bold">สถานะชำระ</span><Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'} className="text-[9px]">{order.paymentStatus || 'pending'}</Badge></div>
       <div className="flex justify-between"><span className="text-slate-400 font-bold">สร้างเมื่อ</span><span className="font-bold text-slate-600">{order.createdAt ? parseUTCDate(order.createdAt).toLocaleString('th-TH') : '-'}</span></div>
       <div className="flex justify-between"><span className="text-slate-400 font-bold">อัพเดทล่าสุด</span><span className="font-bold text-slate-600">{order.updatedAt ? parseUTCDate(order.updatedAt).toLocaleString('th-TH') : '-'}</span></div>
      </div>
     </Card>
    </div>
   </div>

   </div>

   {/* Photo Modal */}
   <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} title="ดูรูปภาพ">
    <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[400px] rounded-b-xl">
     {selectedPhoto && <img src={selectedPhoto} className="max-w-full max-h-[70vh] rounded-xl shadow-2xl" alt="Evidence" />}
    </div>
   </Modal>

   {/* ── Status Change Confirmation Modal ── */}
   <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title="ยืนยันเปลี่ยนสถานะ">
    <div className="p-6 space-y-6">
     <div className="text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-amber-100">
       {confirmModal?.icon}
      </div>
      <p className="text-lg font-black text-slate-900 mb-1">ยืนยันเปลี่ยนสถานะ?</p>
      <p className="text-sm text-slate-500 font-medium">
       คุณกำลังจะเปลี่ยนสถานะจาก <span className="font-black text-slate-700">{STATUS_FLOW.find(s => s.key === order.status)?.label}</span>{' '}
       ไปเป็น <span className="font-black text-primary">{confirmModal?.label}</span>
      </p>
      {confirmModal?.key === 'cancelled' && (
       <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
        <p className="text-xs font-black text-rose-600">⚠️ การยกเลิกงานไม่สามารถย้อนกลับได้</p>
       </div>
      )}
      
      {/* Auto Refund Notice */}
      {confirmModal?.key === 'cancelled' && order?.paymentStatus === 'paid' && (
        <div className="mt-4 p-4 bg-sky-50 rounded-xl border border-sky-100 text-left">
          <p className="text-xs font-black text-sky-600 flex items-center gap-2">💬 ระบบจะส่ง LINE แจ้งลูกค้าให้กรอกเลขบัญชีเพื่อรับเงินคืนอัตโนมัติ</p>
          <p className="text-[10px] font-bold text-sky-500 mt-1">ไม่ต้องขอข้อมูลจากลูกค้าเองครับ ระบบจัดการให้ทั้งหมด</p>
        </div>
      )}

     </div>
     <div className="grid grid-cols-2 gap-3">
      <button
       onClick={() => setConfirmModal(null)}
       className="py-4 bg-slate-100 text-slate-600 font-black text-sm rounded-xl hover:bg-slate-200 transition-all active:scale-95"
      >
       ยกเลิก
      </button>
      <button
       onClick={async () => {
        if (!confirmModal) return;
        
        const updates: any = { status: confirmModal.key };
        
        setConfirmModal(null);
        await handleUpdate(updates);

       }}
       disabled={isUpdating}
       className={`py-4 text-white font-black text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 ${
        confirmModal?.key === 'cancelled'
         ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30'
         : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
       }`}
      >
       {isUpdating ? 'กำลังอัปเดต...' : 'ยืนยัน'}
      </button>
     </div>
    </div>
   </Modal>

   {/* ── Emergency Change Modal (Store Only) ── */}
   <Modal isOpen={!!changeModal} onClose={() => setChangeModal(null)} title="เปลี่ยนร้านซัก (ฉุกเฉิน)">
    <div className="p-6 space-y-6">
     <div>
      <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">เลือกร้านใหม่</label>
      <GlobalSelect
       value={changeModalValue}
       onChange={setChangeModalValue}
       options={[
        { label: "-- ยกเลิกการระบุร้าน --", value: "" },
        ...stores.map(s => ({ label: s.name + (s.phone ? " (" + s.phone + ")" : ""), value: s.id }))
       ]}
       disabled={isUpdating}
      />
     </div>
     <div className="grid grid-cols-2 gap-3">
      <button
       onClick={() => setChangeModal(null)}
       className="py-4 bg-slate-100 text-slate-600 font-black text-sm rounded-xl hover:bg-slate-200 transition-all active:scale-95"
      >
       ยกเลิก
      </button>
      <button
       onClick={async () => {
        if (!changeModal) return;
        await handleUpdate({ storeId: changeModalValue });
        setChangeModal(null);
       }}
       disabled={isUpdating}
       className="py-4 bg-primary text-white font-black text-sm rounded-xl transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-50"
      >
       {isUpdating ? 'กำลังอัปเดต...' : 'บันทึกการเปลี่ยนแปลง'}
      </button>
     </div>
    </div>
   </Modal>
  </>
 );
}
