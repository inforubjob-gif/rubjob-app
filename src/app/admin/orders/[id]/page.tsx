"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
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
  { key: "ready_for_return", label: "ซักเสร็จ รอส่งคืน", icon: "✅" },
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

  useEffect(() => {
    if (id) { fetchOrder(); fetchRiders(); fetchStores(); }
  }, [id]);

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
        showToast("อัพเดทสำเร็จ", "success");
        fetchOrder();
      } else {
        const err = await res.json() as any;
        showToast(err.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch { showToast("เกิดข้อผิดพลาด", "error"); }
    finally { setIsUpdating(false); }
  }

  function parseAddress(addr: any) {
    try { return typeof addr === 'string' ? JSON.parse(addr)?.label : addr?.label; }
    catch { return addr || 'ไม่ระบุ'; }
  }

  if (isLoading) return <div className="flex justify-center py-40"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!order) return <div className="text-center py-40 font-bold text-slate-400 uppercase">Order not found</div>;

  const nextStatuses = getNextStatuses(order.status);
  const currentStep = STATUS_FLOW.findIndex(s => s.key === order.status);

  return (
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

      {/* ── Status Pipeline ── */}
      <Card className="p-6 bg-white border border-slate-100">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">สถานะงาน (Order Pipeline)</h2>
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

              {/* Assign Riders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase block mb-2">🏍️ ไรเดอร์รับผ้า (Pickup)</label>
                  <GlobalSelect
                    value={order.pickupDriverId || ""}
                    onChange={(val) => handleUpdate({ pickupDriverId: val })}
                    options={[
                      { label: "-- ยังไม่ระบุ --", value: "" },
                      ...riders.filter(r => r.status === 'active').map(r => ({ label: `${r.name} ${r.phone ? `(${r.phone})` : ''}`, value: r.id }))
                    ]}
                    disabled={isUpdating}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase block mb-2">📦 ไรเดอร์ส่งคืน (Delivery)</label>
                  <GlobalSelect
                    value={order.deliveryDriverId || ""}
                    onChange={(val) => handleUpdate({ deliveryDriverId: val })}
                    options={[
                      { label: "-- ยังไม่ระบุ --", value: "" },
                      ...riders.filter(r => r.status === 'active').map(r => ({ label: `${r.name} ${r.phone ? `(${r.phone})` : ''}`, value: r.id }))
                    ]}
                    disabled={isUpdating}
                  />
                </div>
              </div>

              {/* Assign Store */}
              <div className="mb-6">
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2">🏪 ร้านซักที่รับงาน</label>
                <GlobalSelect
                  value={order.storeId || ""}
                  onChange={(val) => handleUpdate({ storeId: val })}
                  options={[
                    { label: "-- ยังไม่ระบุร้าน --", value: "" },
                    ...stores.map(s => ({ label: `${s.name} ${s.phone ? `(${s.phone})` : ''}`, value: s.id }))
                  ]}
                  disabled={isUpdating}
                />
              </div>

              {/* Status Transition Buttons */}
              {nextStatuses.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase block mb-3">⚡ เปลี่ยนสถานะ</label>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map(ns => (
                      <button
                        key={ns.key}
                        onClick={() => handleUpdate({ status: ns.key })}
                        disabled={isUpdating}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-xl backdrop-blur-sm border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {ns.icon} {ns.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleUpdate({ status: "cancelled" })}
                      disabled={isUpdating}
                      className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-black rounded-xl border border-rose-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      ❌ ยกเลิกงาน
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ── Evidence Photos ── */}
          <Card className="p-6">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Icons.Shield className="text-primary" size={16} /> หลักฐานรูปภาพ (Evidence Photos)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "รับผ้า (Pickup)", url: order.pickupPhotoUrl },
                { label: "ส่งร้านซัก (Dropoff)", url: order.dropoffShopPhotoUrl },
                { label: "ก่อนบริการ (Before)", url: order.evidenceBeforeUrl },
                { label: "หลังบริการ (After)", url: order.evidenceAfterUrl },
              ].map((photo) => (
                <div key={photo.label} className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase">{photo.label}</p>
                  <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden border-2 border-slate-100 flex items-center justify-center group relative cursor-pointer"
                    onClick={() => photo.url && setSelectedPhoto(photo.url)}
                  >
                    {photo.url ? (
                      <>
                        <img src={photo.url} className="w-full h-full object-cover" alt={photo.label} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
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
                <span className="text-slate-500">ค่าซัก ({order.serviceName || 'Wash & Fold'})</span>
                <span className="text-slate-900">฿{order.laundryFee || 0}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-b border-slate-50 pb-3">
                <span className="text-slate-500">ค่าขนส่ง ({order.distanceKm ? `${Number(order.distanceKm).toFixed(1)} km` : '-'})</span>
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
            <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">🏪 ร้านซักที่รับงาน</h3>
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
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">🏍️ ไรเดอร์รับผ้า</h3>
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
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">📦 ไรเดอร์ส่งคืน</h3>
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
              <div className="flex justify-between"><span className="text-slate-400 font-bold">สร้างเมื่อ</span><span className="font-bold text-slate-600">{order.createdAt ? new Date(order.createdAt).toLocaleString('th-TH') : '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-bold">อัพเดทล่าสุด</span><span className="font-bold text-slate-600">{order.updatedAt ? new Date(order.updatedAt).toLocaleString('th-TH') : '-'}</span></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Photo Modal */}
      <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} title="ดูรูปภาพ">
        <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[400px] rounded-b-xl">
          {selectedPhoto && <img src={selectedPhoto} className="max-w-full max-h-[70vh] rounded-xl shadow-2xl" alt="Evidence" />}
        </div>
      </Modal>
    </div>
  );
}
