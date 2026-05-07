"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import Modal from "@/components/ui/Modal";
import GlobalSelect from "@/components/ui/GlobalSelect";
import { showToast } from "@/components/ui/Toast";

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
    const interval = setInterval(fetchOrders, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json() as any;
      if (data.orders) setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRiders() {
    try {
      const res = await fetch("/api/admin/riders");
      const data = await res.json() as any;
      if (data.rubbers) setRiders(data.rubbers);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpdateOrder(orderId: string, updates: any) {
    setIsUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        showToast(t("common.success"), "success");
        fetchOrders();
      } else {
        showToast(t("common.error"), "error");
      }
    } catch (err) {
      showToast(t("common.error"), "error");
    } finally {
      setIsUpdating(null);
    }
  }

  function getOrderSLA(order: any) {
    if (order.status !== "at_shop" || !order.arrivedAtShopAt) return "none";
    const arrived = new Date(order.arrivedAtShopAt).getTime();
    const now = Date.now();
    const diffHours = (now - arrived) / (1000 * 60 * 60);

    if (diffHours > 5) return "critical";
    if (diffHours > 3) return "warning";
    return "none";
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <div className="w-2 h-8 bg-primary rounded-full" />
             {t('admin.orders.title')}
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">{t('admin.orders.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={fetchOrders} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Icons.Refresh size={20} className={isLoading ? "animate-spin text-primary" : "text-slate-400"} />
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-white border border-slate-200/60 shadow-xl rounded-2xl overflow-hidden">
          {isLoading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('common.loading')}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-32">
               <Icons.Search size={48} className="mx-auto text-slate-100 mb-4" />
               <p className="text-slate-400 font-bold tracking-tight">{t('admin.orders.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">{t('admin.orders.table.id')}</th>
                    <th className="px-6 py-5">{t('admin.orders.table.status')}</th>
                    <th className="px-6 py-5">{t('admin.orders.table.customer')}</th>
                    <th className="px-6 py-5">{t('admin.orders.table.photos')}</th>
                    <th className="px-6 py-5">{t('admin.orders.table.assignRider')}</th>
                    <th className="px-6 py-5">{t('admin.orders.table.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map(order => {
                    const sla = getOrderSLA(order);
                    const rowClass = sla === "critical" ? "bg-rose-50/50" : sla === "warning" ? "bg-amber-50/30" : "hover:bg-slate-50/50";
                    
                    return (
                      <tr key={order.id} className={`${rowClass} transition-colors group`}>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] font-bold text-slate-900 mb-1">#{order.id.slice(-6).toUpperCase()}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{new Date(order.createdAt).toLocaleTimeString()}</span>
                            {sla !== "none" && (
                              <div className={`mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${sla === 'critical' ? 'text-rose-500' : 'text-amber-500'}`}>
                                <Icons.AlertCircle size={10} />
                                {sla === 'critical' ? 'CRITICAL DELAY (5H+)' : 'SLA BREACH (3H+)'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <Badge variant={statusToBadgeVariant(order.status)} className="shadow-sm">
                            {t(`orders.status.${order.status}`)}
                          </Badge>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-black tracking-tight">{order.customerName}</span>
                            <span className="text-xs font-bold text-slate-400">{order.customerPhone || 'No Phone'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                           <div className="flex items-center gap-2">
                              {order.pickupPhotoUrl && (
                                <button 
                                  onClick={() => setSelectedPhoto(order.pickupPhotoUrl)}
                                  className="w-10 h-10 rounded-lg bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/20 transition-all overflow-hidden"
                                >
                                  <img src={order.pickupPhotoUrl} className="w-full h-full object-cover" alt="Pickup" />
                                </button>
                              )}
                              {order.dropoffShopPhotoUrl && (
                                <button 
                                  onClick={() => setSelectedPhoto(order.dropoffShopPhotoUrl)}
                                  className="w-10 h-10 rounded-lg bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/20 transition-all overflow-hidden"
                                >
                                  <img src={order.dropoffShopPhotoUrl} className="w-full h-full object-cover" alt="Dropoff" />
                                </button>
                              )}
                              {!order.pickupPhotoUrl && !order.dropoffShopPhotoUrl && (
                                <span className="text-[10px] font-bold text-slate-300 italic">No Photos</span>
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-6">
                           <div className="w-48">
                              <GlobalSelect
                                value={order.pickupDriverId || ""}
                                onChange={(val) => handleUpdateOrder(order.id, { pickupDriverId: val })}
                                options={[
                                  { label: "Unassigned", value: "" },
                                  ...riders.map(r => ({ label: `${r.name} (${r.displayId})`, value: r.id }))
                                ]}
                                disabled={isUpdating === order.id}
                              />
                           </div>
                        </td>
                        <td className="px-6 py-6">
                           {order.status === "at_shop" && (
                              <button
                                onClick={() => handleUpdateOrder(order.id, { status: "ready_for_return" })}
                                disabled={isUpdating === order.id}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                              >
                                {t('admin.orders.markReady')}
                              </button>
                           )}
                           {order.status === "pending" && (
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">Wait for assign</span>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} title="Photo Evidence">
         <div className="p-4 bg-slate-50 flex items-center justify-center min-h-[400px]">
            {selectedPhoto && (
              <img src={selectedPhoto} className="max-w-full max-h-[70vh] rounded-xl shadow-2xl border-4 border-white" alt="Evidence" />
            )}
         </div>
      </Modal>
    </div>
  );
}
