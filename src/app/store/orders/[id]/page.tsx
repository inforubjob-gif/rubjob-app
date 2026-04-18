"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import CountdownTimer from "@/components/ui/CountdownTimer";
import OrderIssueModal from "@/components/orders/OrderIssueModal";

export default function StoreOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { t } = useTranslation();
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/store/orders/${id}`);
        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        console.error("Fetch order detail failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (nextStatus: string) => {
    setIsUpdating(true);
    try {
      await fetch(`/api/store/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setOrder({ ...order, status: nextStatus });
    } catch (err) {
      console.error("Update status failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">{t("common.loading")}</div>;
  if (!order) return <div className="p-10 text-center font-bold text-slate-400">{t("orders.orderNotFound")}</div>;

  const status = order.status;
  const isExpress = order.serviceLevel === "EXPRESS";
  const weight = order.weight || 5;
  const actualItems = order.itemCount || 10;

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <header className="bg-white px-5 pt-12 pb-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
          <Icons.Back size={20} />
        </button>
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t("store.manageTask")}</h1>
        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 active:scale-90 transition-all border border-red-100"
          title={t("orders.reportIssue")}
        >
          <Icons.Alert size={20} />
        </button>
      </header>
      
      <OrderIssueModal 
        isOpen={isIssueModalOpen} 
        onClose={() => setIsIssueModalOpen(false)} 
        orderId={id as string} 
      />

      <div className="flex-1 px-5 py-6">
        <Card className="p-6 mb-6 border-none shadow-sm bg-white overflow-hidden relative rounded-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">{t("orders.tracking")} #{id.slice(-6)}</p>
              <Badge variant={statusToBadgeVariant(status)} className="font-black italic text-[10px] uppercase tracking-tighter">
                {t(`orders.status.${status}`)}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">{t("common.store")}</p>
              <p className="text-xs font-black text-slate-900">{t("store.unitNo")} #A12</p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
             <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-dashed border-l-2 border-slate-100 border-dashed" />
             <div className="relative z-10 w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shadow-inner">
                <Icons.User size={22} />
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t("store.customer")}</p>
                <p className="text-sm font-black text-slate-900 truncate">Customer #TR-88</p>
             </div>
          </div>
        </Card>

        <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t("store.workflowTitle")}</h3>
            
            <div className="space-y-4">
              <Card className={`p-5 transition-all outline-dashed outline-2 ${status === 'delivering_to_store' ? 'outline-primary bg-primary/5 shadow-xl shadow-primary/10' : 'bg-white outline-slate-100'}`}>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status === 'delivering_to_store' ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}>
                           <Icons.Truck size={22} />
                       </div>
                       <div>
                          <h4 className={`text-sm font-black uppercase tracking-tight ${status === 'delivering_to_store' ? 'text-primary-dark' : 'text-slate-400'}`}>{t("store.incomingFromRider")}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{t("store.arriving")} • {t("store.riderNo")} #RD-99</p>
                       </div>
                   </div>
                </div>
              </Card>

              {status === "washing" && (
                 <Card className={`p-6 border-none shadow-2xl ${isExpress ? 'bg-red-600 shadow-red-200' : 'bg-primary shadow-primary/20'} text-white relative overflow-hidden rounded-xl`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black text-white/80 uppercase tracking-[0.25em] mb-1.5 leading-none">{t("store.processing")}</p>
                            <h3 className="text-2xl font-black italic uppercase tracking-tight drop-shadow-sm">
                               {isExpress ? t("store.flashExpress") : t("store.standardWash")}
                            </h3>
                        </div>
                        <div className="bg-white/20 p-3.5 rounded-xl backdrop-blur-md border border-white/30 shadow-inner">
                           <CountdownTimer seconds={isExpress ? 1200 : 3600} urgentThreshold={900} />
                        </div>
                    </div>
                 </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-white border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t("profile.service")}</p>
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shadow-sm">
                              {getServiceIcon(order?.serviceId as any, { size: 18 })}
                          </div>
                          <span className="text-xs font-black text-slate-900">{order?.serviceName || t(`orders.services.${order?.serviceId}`)}</span>
                      </div>
                  </Card>
                  <Card className={`p-4 ${isExpress ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-900 border border-slate-100'}`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Service Level</p>
                      <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${isExpress ? 'bg-red-600 text-white' : 'bg-primary text-white'} flex items-center justify-center shadow-sm`}>
                              <Icons.Clock size={18} />
                          </div>
                          <span className="text-xs font-black">{isExpress ? "EXPRESS" : "STANDARD"}</span>
                      </div>
                  </Card>
              </div>

              <Card className="p-5 space-y-4 border border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("store.requirementsTitle")}</h3>
                  <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <span className="text-xs font-bold text-slate-500">{t("store.pickupWeight")}</span>
                          <span className="text-xs font-black text-slate-900 tracking-tight">{weight} kg</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <span className="text-xs font-bold text-slate-500">{t("store.pickupItems")}</span>
                          <span className="text-xs font-black text-slate-900 tracking-tight">{actualItems} pcs</span>
                      </div>
                      {order?.staffNote && (
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 shadow-inner">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 leading-none italic">{t("store.clientPrefs")}</p>
                            <p className="text-xs text-amber-800 leading-relaxed font-bold">{order.staffNote}</p>
                        </div>
                      )}
                  </div>
              </Card>

              <div className="space-y-3">
                {status === "delivering_to_store" && (
                  <Button fullWidth onClick={() => handleUpdateStatus("washing")} isLoading={isUpdating} className="bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 py-5 text-sm font-black italic rounded-xl uppercase tracking-widest">
                    <Icons.Package size={20} className="mr-2" /> {t("staff.receiveFromDriver")}
                  </Button>
                )}
                {status === "washing" && (
                  <Button fullWidth onClick={() => handleUpdateStatus("ready_for_pickup")} isLoading={isUpdating} className="bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 py-5 text-sm font-black italic rounded-xl uppercase tracking-widest">
                    <Icons.Phone size={20} className="mr-2" /> {t("staff.callRider")}
                  </Button>
                )}
                {status === "ready_for_pickup" && (
                  <Button fullWidth onClick={() => handleUpdateStatus("completed")} isLoading={isUpdating} className="bg-primary text-white hover:bg-primary-dark shadow-xl py-5 text-sm font-black italic rounded-xl uppercase tracking-widest">
                    <Icons.Check size={20} className="mr-2" strokeWidth={4} /> {t("store.handoverToDriver")}
                  </Button>
                )}
                {status === "completed" && (
                  <div className="p-10 bg-orange-50 rounded-xl border-4 border-dashed border-orange-200 flex flex-col items-center justify-center gap-4 text-center animate-bounce-slow">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-200">
                          <Icons.Check size={32} strokeWidth={4} />
                      </div>
                      <div>
                         <h4 className="text-lg font-black text-primary leading-none">{t("store.handoffSuccess")}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-6 italic">{t("store.handoffDesc")}</p>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
