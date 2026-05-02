"use client";

export const runtime = 'edge';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  async function fetchOrder() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?id=${id}`);
      const data = await res.json();
      if (data.order) setOrder(data.order);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-40"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!order) return <div className="text-center py-40 font-bold text-slate-400 uppercase">Order not found</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      <header className="flex items-center gap-4">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all">
          <Icons.Phone className="rotate-180" size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">ออเดอร์ #{order.id}</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{order.orderType || 'logistics'}</p>
        </div>
        <div className="ml-auto flex gap-2">
           <Badge variant={statusToBadgeVariant(order.status)}>{order.status}</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {/* Evidence Photos Section */}
           <Card className="p-8 space-y-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <Icons.Shield className="text-primary" size={18} /> หลักฐานการให้บริการ (Evidence)
              </h2>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Before Service / Acceptance</p>
                    <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-50 flex items-center justify-center group relative">
                       {order.evidenceBeforeUrl ? (
                         <>
                           <img src={order.evidenceBeforeUrl} className="w-full h-full object-cover" />
                           <a href={order.evidenceBeforeUrl} target="_blank" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-xs font-black uppercase">View Full</a>
                         </>
                       ) : (
                         <Icons.User size={48} className="text-slate-200" />
                       )}
                    </div>
                 </div>
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase">After Service / Completion</p>
                    <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-50 flex items-center justify-center group relative">
                       {order.evidenceAfterUrl ? (
                         <>
                           <img src={order.evidenceAfterUrl} className="w-full h-full object-cover" />
                           <a href={order.evidenceAfterUrl} target="_blank" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-xs font-black uppercase">View Full</a>
                         </>
                       ) : (
                         <Icons.CheckCircle size={48} className="text-slate-200" />
                       )}
                    </div>
                 </div>
              </div>
           </Card>

           {/* Order Items */}
           <Card className="p-8">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">รายการสั่งซื้อ</h2>
              <div className="space-y-4">
                 {/* Logic to map items would go here */}
                 <div className="flex justify-between text-sm font-bold border-b border-slate-50 pb-4">
                    <span className="text-slate-500">Service Fee</span>
                    <span className="text-slate-900">฿{order.laundryFee}</span>
                 </div>
                 <div className="flex justify-between text-sm font-bold border-b border-slate-50 pb-4">
                    <span className="text-slate-500">Delivery Fee</span>
                    <span className="text-slate-900">฿{order.deliveryFee}</span>
                 </div>
                 {order.cancellationFee > 0 && (
                   <div className="flex justify-between text-sm font-bold text-rose-500 border-b border-rose-50 pb-4">
                      <span>Cancellation Fee</span>
                      <span>฿{order.cancellationFee}</span>
                   </div>
                 )}
                 <div className="flex justify-between text-xl font-black pt-4">
                    <span className="text-slate-900 uppercase">Total</span>
                    <span className="text-primary-dark">฿{order.totalPrice}</span>
                 </div>
              </div>
           </Card>
        </div>

        <div className="space-y-8">
           <Card className="p-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">ข้อมูลลูกค้า</h3>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                    {order.customerPicture ? <img src={order.customerPicture} className="w-full h-full object-cover" /> : <Icons.User size={20} />}
                 </div>
                 <div>
                    <p className="font-black text-slate-900 leading-none">{order.customerName}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{order.customerPhone}</p>
                 </div>
              </div>
              <div className="space-y-4 border-t border-slate-50 pt-4">
                 <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-1">ที่อยู่จัดส่ง</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">{typeof order.address === 'string' ? JSON.parse(order.address).label : order.address?.label}</p>
                 </div>
              </div>
           </Card>

           <Card className="p-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Partner Info</h3>
              {order.providerId ? (
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-500 flex items-center justify-center">
                      <Icons.User size={20} />
                   </div>
                   <div>
                      <p className="font-black text-slate-900 leading-none">Specialist Provider</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">ID: {order.providerId}</p>
                   </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-400 italic">No direct provider assigned</p>
              )}
           </Card>
        </div>
      </div>
    </div>
  );
}
