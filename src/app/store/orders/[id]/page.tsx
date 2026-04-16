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

export default function StoreOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { t } = useTranslation();
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [weight, setWeight] = useState("0");
  const [actualItems, setActualItems] = useState("0");
  const [isExpress, setIsExpress] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json() as any;
        if (data.order) {
          const o = data.order;
          setOrder(o);
          setStatus(o.status);
          setIsExpress(o.totalPrice > 200);
          
          if (o.serviceDetails) {
            const sd = typeof o.serviceDetails === 'string' ? JSON.parse(o.serviceDetails) : o.serviceDetails;
            setWeight(sd.weight || "0");
            setActualItems(sd.items || "0");
          }
        }
      } catch (err) {
        console.error("Failed to fetch order detail:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/store/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
    } catch (err) {
      console.error("Update status failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"
          >
            <Icons.Back size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{t("store.manageTask")}</h1>
            <p className="text-xs text-slate-400">{t("orders.orderNo")} #{id}</p>
          </div>
          <Badge variant={statusToBadgeVariant(status as any)}>
            {t(`orders.status.${status}`)}
          </Badge>
        </div>
      </header>

      <div className="flex-1 space-y-8 animate-fade-in relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t("common.loading")}</p>
          </div>
        ) : (
          <>
            {/* Animated Rider Map Section */}
            {(status === "delivering_to_store" || status === "ready_for_pickup") && (
              <div className="h-44 relative bg-slate-100 overflow-hidden border-b border-slate-200">
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                <div className="absolute top-[60%] left-0 right-0 h-0.5 bg-slate-200" />
                <div className="absolute top-[60%] left-[65%] -translate-y-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                   <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-[0_10px_20px_rgba(255,159,28,0.3)] ring-4 ring-white animate-bounce-slow">
                      <Icons.Bike size={24} strokeWidth={3} />
                   </div>
                   <div className="bg-primary text-[8px] font-black text-slate-800 px-2 py-0.5 rounded-full mt-2 shadow-md uppercase tracking-tighter">
                     {(order?.pickupDriverName || order?.deliveryDriverName || t("common.rider"))} {t("store.arriving")}
                   </div>
                </div>
                <div className="absolute top-[60%] left-[85%] -translate-y-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                   <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-lg ring-2 ring-white">
                      <Icons.Logo size={18} variant="icon" />
                   </div>
                   <p className="text-[8px] font-black mt-1.5 uppercase opacity-50">Store</p>
                </div>
              </div>
            )}

            <div className="px-5 pt-6 pb-24 space-y-8">
              {/* Customer Info Card */}
              <Card className="p-4 space-y-4 border-2 border-slate-100 shadow-sm rounded-[2rem] bg-orange-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                    <Icons.User size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t("store.customer")}</p>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      {order?.userName || t("common.guest")}
                    </h3>
                  </div>
                </div>
              </Card>

              {/* Rider Info Card */}
              <Card className="p-4 space-y-4 border-2 border-slate-100 shadow-sm rounded-[2rem]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-lg">
                    <Icons.Bike size={24} strokeWidth={3} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      {order?.pickupDriverName || order?.deliveryDriverName || t("store.notAssigned")}
                    </h3>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mt-1">
                      {t("store.riderNo")} {order?.pickupDriverId || order?.deliveryDriverId || "N/A"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                      <button className="w-10 h-10 rounded-2xl bg-orange-50 text-primary flex items-center justify-center border border-orange-100 active:scale-95 transition-all">
                          <Icons.Phone size={18} />
                      </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-3xl flex items-center justify-between border border-slate-100">
                   <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary shrink-0 shadow-sm border border-orange-50">
                         <Icons.Truck size={18} />
                       </div>
                       <div className="text-left">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t("common.status")}</p>
                         <p className="text-xs text-slate-700 font-extrabold">{status === "delivering_to_store" ? t("store.comingToStore") : t("store.atStore")}</p>
                       </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-100">
                          <Icons.Check size={12} className="text-green-500" strokeWidth={4} />
                          <span className="text-[8px] font-black text-green-600 uppercase">Photo Verified</span>
                      </div>
                      {status === "delivering_to_store" && (
                          <div className="text-right">
                              <p className="text-[10px] font-black text-primary">5 Mins</p>
                          </div>
                      )}
                   </div>
                </div>
              </Card>

              {/* Processing Timer */}
              {status === "washing" && (
                 <Card className={`p-6 border-none shadow-2xl ${isExpress ? 'bg-red-600 shadow-red-200' : 'bg-primary shadow-primary/20'} text-white relative overflow-hidden rounded-[2.5rem]`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black text-white/80 uppercase tracking-[0.25em] mb-1.5 leading-none">{t("store.processing")}</p>
                            <h3 className="text-2xl font-black italic uppercase tracking-tight drop-shadow-sm">
                               {isExpress ? t("store.flashExpress") : t("store.standardWash")}
                            </h3>
                        </div>
                        <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md border border-white/30 shadow-inner">
                           <CountdownTimer seconds={isExpress ? 1200 : 3600} urgentThreshold={900} />
                        </div>
                    </div>
                 </Card>
              )}

              {/* Service Summary */}
              <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 border-none shadow-sm bg-white border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t("profile.service")}</p>
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shadow-sm">
                              {getServiceIcon(order?.serviceId as any, { size: 18 })}
                          </div>
                          <span className="text-xs font-black text-slate-900">{order?.serviceName || t(`orders.services.${order?.serviceId}`)}</span>
                      </div>
                  </Card>
                  <Card className={`p-4 border-none shadow-sm ${isExpress ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-primary/10 text-slate-900 border border-primary/20'}`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Service Level</p>
                      <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${isExpress ? 'bg-red-600 text-white' : 'bg-primary text-slate-900'} flex items-center justify-center shadow-sm`}>
                              <Icons.Clock size={18} />
                          </div>
                          <span className="text-xs font-black">{isExpress ? "EXPRESS" : "STANDARD"}</span>
                      </div>
                  </Card>
              </div>

               {/* Job Requirements */}
              <Card className="p-5 space-y-4 shadow-sm border border-slate-100">
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
                        <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 shadow-inner">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 leading-none italic">{t("store.clientPrefs")}</p>
                            <p className="text-xs text-amber-800 leading-relaxed font-bold">{order.staffNote}</p>
                        </div>
                      )}
                  </div>
              </Card>

              {/* Store Actions */}
               <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t("store.workflowTitle")}</h3>
                {status === "delivering_to_store" && (
                  <Button fullWidth onClick={() => handleUpdateStatus("washing")} isLoading={isLoading} className="bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 py-5 text-sm font-black italic rounded-[1.5rem] uppercase tracking-widest">
                    <Icons.Package size={20} className="mr-2" /> {t("staff.receiveFromDriver")}
                  </Button>
                )}
                {status === "washing" && (
                  <Button fullWidth onClick={() => handleUpdateStatus("ready_for_pickup")} isLoading={isLoading} className="bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 py-5 text-sm font-black italic rounded-[1.5rem] uppercase tracking-widest">
                    <Icons.Phone size={20} className="mr-2" /> {t("staff.callRider")}
                  </Button>
                )}
                {status === "ready_for_pickup" && (
                  <Button fullWidth onClick={() => handleUpdateStatus("completed")} isLoading={isLoading} className="bg-primary text-white hover:bg-primary-dark shadow-xl py-5 text-sm font-black italic rounded-[1.5rem] uppercase tracking-widest">
                    <Icons.Check size={20} className="mr-2" strokeWidth={4} /> {t("store.handoverToDriver")}
                  </Button>
                )}
�บร้อย"}
                  </Button>
                )}
                {status === "completed" && (
                  <div className="p-10 bg-orange-50 rounded-[2.5rem] border-4 border-dashed border-orange-200 flex flex-col items-center justify-center gap-4 text-center animate-bounce-slow">
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
          </>
        )}
      </div>
    </div>
  );
}
