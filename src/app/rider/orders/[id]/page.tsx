"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import PhotoUpload from "@/components/ui/PhotoUpload";
import dynamic from "next/dynamic";
import OrderIssueModal from "@/components/orders/OrderIssueModal";

const RiderMap = dynamic(() => import("@/components/rider/RiderMap"), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  )
});

export default function RiderOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { t } = useTranslation();
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("picking_up");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }
        const data = await res.json() as any;
        if (data.order) {
          setOrder(data.order);
          setStatus(data.order.status);
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error("Failed to fetch order detail:", err);
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  const storePos = { lat: order?.storeLat || 13.7563, lng: order?.storeLng || 100.5018 };
  const userPos = { 
    lat: order?.address?.lat || order?.lat || 13.7563, 
    lng: order?.address?.lng || order?.lng || 100.5018 
  };

  // Define steps that require photo
  const photoSteps: Record<string, string> = {
    "picking_up": "pickupUser",
    "delivering_to_store": "deliveryStore",
    "ready_for_pickup": "pickupStore",
    "delivering_to_customer": "deliveryUser",
  };

  const currentPhotoStep = photoSteps[status];

  const handleUpdateStatus = async (nextStatus: string) => {
    if (currentPhotoStep && !photo) {
      alert(t("rider.photoStepDesc"));
      return;
    }

    setIsUpdating(true);
    try {
      await fetch(`/api/rider/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, photo }),
      });
      setStatus(nextStatus);
      setPhoto(null);
      
      // Auto-redirection for states that end the current rider leg
      if (nextStatus === "washing" || nextStatus === "completed") {
        setTimeout(() => {
          router.push("/rider");
        }, 2000);
      }
    } catch (err) {
      console.error("Update rider status failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch(currentStatus) {
        case "picking_up": return "delivering_to_store";
        case "delivering_to_store": return "washing";
        case "ready_for_pickup": return "delivering_to_customer";
        case "delivering_to_customer": return "completed";
        default: return currentStatus;
    }
  };

  // Helper to determine active destination
  const getActiveDestination = () => {
    if (status === "delivering_to_store" || status === "ready_for_pickup") {
      return { pos: storePos, label: t("admin.nav.stores") };
    }
    return { pos: userPos, label: t("admin.nav.users") };
  };

  const activeDest = getActiveDestination();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-300 uppercase">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-primary active:scale-95 transition-transform border border-orange-100"
          >
            <Icons.Back size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{t("rider.manageTask")}</h1>
            <p className="text-xs text-slate-400">{t("orders.orderNo")} #{id}</p>
          </div>
          <Badge variant={statusToBadgeVariant(status as any)}>
            {t(`orders.status.${status}`)}
          </Badge>
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500 active:scale-95 transition-transform border border-red-100"
            title={t("orders.reportIssue")}
          >
            <Icons.Alert size={18} />
          </button>
        </div>
      </header>

      <OrderIssueModal 
        isOpen={isIssueModalOpen} 
        onClose={() => setIsIssueModalOpen(false)} 
        orderId={id as string} 
      />

      <div className="flex-1 space-y-6 animate-fade-in relative">
        {/* Functional Map Section */}
        <div className="h-48 relative bg-slate-200 overflow-hidden border-b border-slate-100">
           <RiderMap 
             storeLat={storePos.lat}
             storeLng={storePos.lng}
             userLat={userPos.lat}
             userLng={userPos.lng}
           />
           
           <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
              <div className="bg-white px-4 py-2 rounded-xl shadow-2xl border border-primary/20 flex flex-col">
                 <p className="text-[10px] font-black text-primary uppercase tracking-wider">{t("rider.availableRequests") || "NEXT DESTINATION"}</p>
                 <p className="text-xs font-black text-slate-800">{activeDest.label === t("admin.nav.stores") ? order?.storeName : order?.userName}</p>
              </div>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeDest.pos.lat},${activeDest.pos.lng}`, "_blank")}
                className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl border border-primary-dark/20 shadow-xl font-black text-[11px] uppercase flex items-center gap-2 active:scale-95 transition-all"
              >
                 <Icons.MapPin size={16} strokeWidth={3} /> {t("rider.navigate")}
              </button>
           </div>
        </div>

        <div className="px-5 pt-2 space-y-6">
          {/* Rider Earning Highlight Card */}
          <Card className="p-5 border-none shadow-2xl shadow-primary/20 rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
             <div className="relative z-10 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">{t("rider.earnAmountLabel")}</p>
                   <h2 className="text-4xl font-black italic">฿{order?.riderEarn?.toFixed(0)}</h2>
                </div>
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                   <Icons.Logo variant="icon-white" size={32} />
                </div>
             </div>
             <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-white/50 uppercase">
                <span>{t("booking.standardTitle")}</span>
                <span>{t("booking.instantConfirmation")}</span>
             </div>
          </Card>

          <Card className="p-6 border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
             <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100 shadow-inner">
                    <Icons.User size={30} />
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-black text-slate-900 uppercase">{order?.userName || t("common.guest")}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                       <p className="text-xs text-slate-500 font-bold uppercase">{t("rider.profile.verifiedHero")} — {t("tiers.silver")}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                   {order?.phone && (
                     <button 
                       onClick={() => window.open(`tel:${order.phone}`)}
                       className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-lg shadow-blue-500/10 active:scale-90 transition-transform"
                     >
                         <Icons.Phone size={20} />
                     </button>
                   )}
                   <button 
                     onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order?.lat || 13.7563},${order?.lng || 100.5018}`, "_blank")}
                     className="w-11 h-11 rounded-2xl bg-orange-50 text-primary flex items-center justify-center border border-orange-100 shadow-lg shadow-primary/10 active:scale-90 transition-transform"
                   >
                       <Icons.MapPin size={20} />
                   </button>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="flex items-start gap-4">
                   <div className="flex flex-col items-center gap-1 mt-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-slate-300" />
                      <div className="w-0.5 h-10 bg-gradient-to-b from-slate-200 to-transparent rounded-full" />
                   </div>
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rider.orderDetail.pickupFrom")}</p>
                      <p className="text-xs font-bold text-slate-700">{order?.storeName || t("rider.orderDetail.assignedStore")}</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white mt-1 shadow-[0_0_5px_rgba(255,159,28,0.5)]" />
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rider.orderDetail.deliverTo")}</p>
                      <p className="text-xs font-black text-slate-900 leading-relaxed mb-1">
                        {typeof order?.address === 'string' ? order.address : (order?.address?.details || t("rider.orderDetail.noAddress"))}
                      </p>
                      {/* Note for Driver */}
                      {order?.address?.note && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg border border-red-100 mt-1 animate-pulse">
                           <Icons.Alert size={12} strokeWidth={3} />
                           <p className="text-[10px] font-black uppercase text-red-600">{order.address.note}</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </Card>

          {/* Items & Price Breakdown */}
          <Card className="p-6 border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-white">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{t("orders.items")}</h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">{order?.items?.length || 0} {t("orders.itemCount")}</span>
             </div>
             <div className="space-y-3">
                {order?.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">{item.name} × {item.quantity}</span>
                    <span className="text-slate-900 italic">฿{item.pricePerUnit * item.quantity}</span>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-dashed border-slate-100 flex items-center justify-between">
                   <span className="text-xs font-black text-slate-900 uppercase">{t("orders.total")}</span>
                   <span className="text-lg font-black text-primary italic">฿{order?.totalPrice}</span>
                </div>
             </div>
          </Card>

          {currentPhotoStep && (
             <Card className="p-6 border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-white border border-primary/10 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl transition-all group-hover:bg-primary/10" />
                <PhotoUpload 
                  onPhotoCapture={(url) => setPhoto(url)} 
                  label={t(`rider.photoStep.${currentPhotoStep}`)}
                  required
                />
             </Card>
          )}
        </div>

        {/* Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-2xl border-t border-slate-100/50 z-40">
           {status === "washing" ? (
             <div className="text-center p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-xs font-black text-slate-400 uppercase">{t("store.processing")}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{t("rider.orderDetail.waitingStore")}</p>
             </div>
           ) : status === "completed" ? (
             <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200 flex items-center justify-center gap-2 text-green-600 font-black">
                <Icons.Check size={20} /> {t("rider.orderDetail.workCompleted")}
             </div>
           ) : (
             <Button 
                fullWidth 
                onClick={() => handleUpdateStatus(getNextStatus(status))}
                isLoading={isUpdating}
                className="bg-primary text-white hover:bg-primary-dark shadow-2xl shadow-primary/30 py-6 text-base font-black rounded-xl uppercase"
             >
                {status === "picking_up" ? t("rider.orderDetail.btnPickup") : 
                 status === "delivering_to_store" ? t("rider.orderDetail.btnHandover") : 
                 status === "ready_for_pickup" ? t("rider.orderDetail.btnPickupStore") : 
                 status === "delivering_to_customer" ? t("rider.orderDetail.btnFinish") : t("rider.orderDetail.btnUpdateTask")}
             </Button>
           )}
        </div>
      </div>
    </div>
  );
}
