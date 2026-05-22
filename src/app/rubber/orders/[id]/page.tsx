"use client";

export const runtime = "edge";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, IconCircle } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import PhotoUpload from "@/components/ui/PhotoUpload";
import dynamic from "next/dynamic";
import OrderIssueModal from "@/components/orders/OrderIssueModal";
import CashAdvanceRecorder from "@/components/rubber/CashAdvanceRecorder";
import Modal from "@/components/ui/Modal";

const RubberMap = dynamic(() => import("@/components/rubber/RubberMap"), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  )
});

export default function RubberOrderDetailPage() {
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [rubberCoords, setRubberCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setRubberCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.error("Rubber GPS Error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 } // allow 5s cached fix to reduce re-prompts
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

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

  const parsedAddress = (() => {
    try {
      if (!order?.address) return null;
      if (typeof order.address === 'string') return JSON.parse(order.address);
      return order.address;
    } catch { return null; }
  })();
  const storePos = { lat: order?.storeLat || 13.7563, lng: order?.storeLng || 100.5018 };
  const userPos = { 
    lat: parsedAddress?.lat || order?.lat || 13.7563, 
    lng: parsedAddress?.lng || order?.lng || 100.5018 
  };

  // Define steps that require photo
  const photoSteps: Record<string, string> = {
    "picking_up": "pickupUser", // Driver is at customer, taking photo to start delivering_to_store
    "delivering_to_store": "deliveryStore", // Driver is at store, taking photo to drop off
    "ready_for_pickup": "pickupStore",
    "delivering_to_customer": "deliveryUser",
  };

  const photoUploadRef = useRef<any>(null);
  const [autoSubmitAfterPhoto, setAutoSubmitAfterPhoto] = useState(false);
  const currentPhotoStep = photoSteps[status];

  // Auto-submit effect when photo is captured
  useEffect(() => {
    if (autoSubmitAfterPhoto && photo) {
      setAutoSubmitAfterPhoto(false);
      handleUpdateStatus(getNextStatus(status), photo);
    }
  }, [photo, autoSubmitAfterPhoto, status]);

  const handleUpdateStatus = async (nextStatus: string, photoOverride?: string) => {
    const activePhoto = photoOverride || photo;
    
    // Mandatory photos for all 4 steps
    const needsPhoto = status === "picking_up" || status === "delivering_to_store" || status === "ready_for_pickup" || status === "delivering_to_customer";
    
    if (needsPhoto && !activePhoto) {
      // Automatically trigger camera if photo is missing
      setAutoSubmitAfterPhoto(true);
      photoUploadRef.current?.triggerCapture();
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/rubber/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, photo: activePhoto }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server Error: ${res.status}`);
      }

      setStatus(nextStatus);
      setPhoto(null);
      setAutoSubmitAfterPhoto(false);
      
      // Show overlay for all transitions
      if (nextStatus === "delivering_to_store" || nextStatus === "delivering_to_customer" || nextStatus === "at_shop" || nextStatus === "completed") {
        setShowSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      console.error("Update rubber status failed:", err);
      setUpdateError(((err instanceof Error) ? err.message : "") || "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่");
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch(currentStatus) {
        case "picking_up": return "delivering_to_store";
        case "delivering_to_store": return "at_shop";
        case "at_shop": return "at_shop"; // Wait for Admin to change to ready_for_pickup
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

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 px-5 text-center">
        <Icons.AlertCircle size={48} className="text-red-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-sm text-slate-500 mb-6">ไม่พบข้อมูลออเดอร์นี้ หรือออเดอร์อาจถูกยกเลิกไปแล้ว</p>
        <Button onClick={() => router.push("/rubber")} className="w-full">
          กลับหน้าหลัก
        </Button>
      </div>
    );
  }

  if (showSuccess) {
    // Determine if this is a "job done" overlay or a "navigate next" overlay
    const isJobDone = status === "washing" || status === "completed" || status === "at_shop";
    const isToStore = status === "delivering_to_store";
    const destName = isToStore ? order?.storeName || t("admin.nav.stores") : order?.userName || t("admin.nav.users");
    const destLabel = isToStore ? "นำส่งที่ร้านซัก" : "นำส่งที่ลูกค้า";

    if (isJobDone) {
      // Job Done overlay — shown after dropping off at store or completing delivery
      const isLeg1 = status === "washing" || status === "at_shop"; // auto-chained from at_shop
      return (
        <div className="flex flex-col min-h-dvh bg-emerald-600 text-white justify-center px-6 animate-fade-in text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-20 -mb-20" />
          
          <div className="w-28 h-28 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-black/20">
            <Icons.Check size={56} strokeWidth={3} />
          </div>
          
          <h2 className="text-3xl font-black mb-2 tracking-tight">
            {isLeg1 ? "ส่งผ้าเรียบร้อย!" : "🎉 จบงานเรียบร้อย!"}
          </h2>
          <p className="text-white/80 font-bold mb-8 text-sm">
            {isLeg1 ? "ผ้าถึงร้านซักแล้ว ระบบจะแจ้งเตือนเมื่อมีงานรับผ้ากลับ" : "ส่งผ้าคืนลูกค้าสำเร็จ ขอบคุณที่ให้บริการ!"}
          </p>
          
          <button 
            onClick={() => router.push("/rubber")}
            className="w-full bg-white text-emerald-600 hover:bg-slate-50 py-4 text-base font-black rounded-xl uppercase shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 mb-4"
          >
            <Icons.Home size={20} /> กลับหน้าหลัก
          </button>
        </div>
      );
    }

    // Navigation overlay — shown for delivering_to_store or delivering_to_customer
    return (
      <div className="flex flex-col min-h-dvh bg-primary text-white justify-center px-6 animate-fade-in text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
        
        <div className="w-24 h-24 bg-white text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-black/20 animate-bounce">
          <Icons.Check size={48} strokeWidth={3} />
        </div>
        
        <h2 className="text-3xl font-black mb-2 tracking-tight">บันทึกรูปภาพสำเร็จ!</h2>
        <p className="text-white/80 font-bold mb-8 text-sm">อัปเดตสถานะงานเรียบร้อยแล้ว</p>
        
        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 mb-8 border border-white/20">
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">{destLabel}</p>
          <p className="text-xl font-black mb-4">{destName}</p>
          
          <button 
            onClick={() => {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeDest.pos.lat},${activeDest.pos.lng}`, "_blank");
              setShowSuccess(false);
            }}
            className="w-full bg-white text-primary hover:bg-slate-50 py-4 text-base font-black rounded-xl uppercase shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2"
          >
            <Icons.MapPin size={20} /> {isToStore ? "นำทางไปที่ร้านซัก" : "นำทางไปที่บ้านลูกค้า"}
          </button>
        </div>
        
        <button 
          onClick={() => setShowSuccess(false)}
          className="text-white/60 text-xs font-bold uppercase underline underline-offset-4 hover:text-white transition-colors"
        >
          กลับไปดูรายละเอียดงาน
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-5 pt-4 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="active:scale-95 transition-transform"
          >
            <IconCircle variant="white" size="sm">
              <Icons.Back size={16} />
            </IconCircle>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{t("rubber.manageTask")}</h1>
            <p className="text-xs text-slate-400">{t("orders.orderNo")} #{id}</p>
          </div>
          <Badge variant={statusToBadgeVariant(status as any)}>
            {t(`orders.status.${status}`)}
          </Badge>
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="active:scale-95 transition-transform"
            title={t("orders.reportIssue")}
          >
            <IconCircle variant="slate" size="sm">
              <Icons.Alert size={16} className="text-red-500" />
            </IconCircle>
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
           <RubberMap 
             storeLat={storePos.lat}
             storeLng={storePos.lng}
             userLat={userPos.lat}
             userLng={userPos.lng}
             rubberLat={rubberCoords?.lat}
             rubberLng={rubberCoords?.lng}
             activeDestLat={activeDest.pos.lat}
             activeDestLng={activeDest.pos.lng}
           />
           
           <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
              <div className="bg-white px-4 py-2 rounded-xl shadow-2xl border border-primary/20 flex flex-col">
                 <p className="text-[10px] font-black text-primary uppercase tracking-wider">{t("rubber.availableRequests") || "NEXT DESTINATION"}</p>
                 <p className="text-xs font-black text-slate-800">{activeDest.label === t("admin.nav.stores") ? order?.storeName : order?.userName}</p>
              </div>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeDest.pos.lat},${activeDest.pos.lng}`, "_blank")}
                className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl border border-primary-dark/20 shadow-xl font-black text-[11px] uppercase flex items-center gap-2 active:scale-95 transition-all"
              >
                 <Icons.MapPin size={16} strokeWidth={3} /> {t("rubber.navigate")}
              </button>
           </div>
        </div>

        <div className="px-5 pt-2 space-y-6">
          {/* Rubber Earning Highlight Card */}
          <Card className="p-5 border-none shadow-2xl shadow-primary/20 rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
             <div className="relative z-10 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">{t("rubber.earnAmountLabel")}</p>
                   <h2 className="text-4xl font-black italic">
                     ฿{((['picking_up', 'delivering_to_store'].includes(status) ? (order?.rubberPickupEarn || 0) : (order?.rubberDeliveryEarn || (order?.rubberEarn || 0) * 0.5)) || 0).toFixed(2)}
                   </h2>
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
                <IconCircle variant="black" size="lg">
                    <Icons.User size={32} />
                </IconCircle>
                <div className="flex-1">
                    <h3 className="text-base font-black text-slate-900 uppercase">{order?.userName || t("common.guest")}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                       <p className="text-xs text-slate-500 font-bold uppercase">ลูกค้า — {order?.isExpress ? t("tiers.platinum") : t("tiers.silver")}</p>
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
                      <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rubber.orderDetail.pickupFrom")}</p>
                      <p className="text-xs font-bold text-slate-700">{order?.storeName || t("rubber.orderDetail.assignedStore")}</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white mt-1 shadow-[0_0_5px_rgba(255,159,28,0.5)]" />
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{t("rubber.orderDetail.deliverTo")}</p>
                      <p className="text-xs font-black text-slate-900 leading-relaxed mb-1">
                        {typeof order?.address === 'string' ? (() => { try { const a = JSON.parse(order.address); return a?.details || order.address; } catch { return order.address; } })() : (order?.address?.details || parsedAddress?.details || t("rubber.orderDetail.noAddress"))}
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

           {/* Customer Note — prominent alert for driver */}
           {order?.customerNote && (
             <Card className="p-4 border-2 border-amber-200 shadow-lg shadow-amber-500/10 rounded-[2rem] bg-amber-50 relative overflow-hidden">
                <div className="flex items-start gap-3">
                   <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Icons.FileText size={20} strokeWidth={2.5} />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{t("rubber.orderDetail.customerNote") || "โน้ตจากลูกค้า"}</p>
                      <p className="text-sm font-black text-amber-900 leading-relaxed">{order.customerNote}</p>
                   </div>
                </div>
             </Card>
           )}

           {/* Items & Price Breakdown */}
          <Card className="p-6 border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-white">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{t("orders.items")}</h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">{order?.items?.length || 0} {t("orders.itemCount")}</span>
             </div>
             <div className="space-y-3">
                {order?.items?.map((item: any, i: number) => {
                  const qty = parseFloat(item.quantity) || 1;
                  const price = parseFloat(item.pricePerUnit) || 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">{item.name} × {item.quantity}</span>
                      <span className="text-slate-900 italic">฿{price * qty}</span>
                    </div>
                  );
                })}
                <div className="pt-3 mt-3 border-t border-dashed border-slate-100 flex items-center justify-between">
                   <span className="text-xs font-black text-slate-900 uppercase">{t("orders.total")}</span>
                   <span className="text-lg font-black text-primary italic">฿{order?.totalPrice}</span>
                </div>
             </div>
          </Card>

          {(status === "ready_for_pickup" || status === "delivering_to_customer") && (
            <Card className="p-6 border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                        <Icons.Search size={18} />
                     </div>
                     <h3 className="text-sm font-black uppercase tracking-wider">{t("rubber.visualIdentification") || "Visual Identification"}</h3>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 leading-relaxed">
                     {t("rubber.photoGuide") || "Use these photos to identify the correct basket/bag at the shop."}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-2">
                        <p className="text-[9px] font-black text-primary uppercase">รูปตอนรับจากลูกค้า</p>
                        <div className="aspect-square rounded-xl bg-slate-800 overflow-hidden border border-white/10">
                           {(() => {
                             try {
                               const d = order?.serviceDetails ? JSON.parse(order.serviceDetails) : null;
                               const src = d?.proofPhotos?.delivering_to_store || d?.proofPhotos?.picking_up || order?.evidenceBeforeUrl;
                               return src ? (
                                 <img 
                                   src={src} 
                                   className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                                   alt="Pickup" 
                                   onClick={() => setSelectedPhoto(src)}
                                 />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-600 italic text-[9px]">No photo</div>
                               );
                             } catch { return <div className="w-full h-full flex items-center justify-center text-slate-600 italic text-[9px]">No photo</div>; }
                           })()}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[9px] font-black text-primary uppercase">รูปตอนส่งที่ร้าน</p>
                        <div className="aspect-square rounded-xl bg-slate-800 overflow-hidden border border-white/10">
                           {(() => {
                             try {
                               const d = order?.serviceDetails ? JSON.parse(order.serviceDetails) : null;
                               const src = d?.proofPhotos?.at_shop || order?.dropoffShopPhotoUrl;
                               return src ? (
                                 <img 
                                   src={src} 
                                   className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                                   alt="At Shop" 
                                   onClick={() => setSelectedPhoto(src)}
                                 />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-600 italic text-[9px]">No photo</div>
                               );
                             } catch { return <div className="w-full h-full flex items-center justify-center text-slate-600 italic text-[9px]">No photo</div>; }
                           })()}
                        </div>
                     </div>
                  </div>
               </div>
            </Card>
          )}

          {/* Cash Advance Recorder — show when Rubber is at shop */}
          {(status === "at_shop" || status === "washing") && order?.storeId && (
            <CashAdvanceRecorder
              orderId={id!}
              storeId={order.storeId}
              storeName={order?.storeName || "Unknown Store"}
              rubberId={(() => { try { const s = JSON.parse(localStorage.getItem("rubjob_rubber_session") || "{}"); return s.id || ""; } catch { return ""; } })()}
            />
          )}

          {currentPhotoStep && status !== "at_shop" && (
             <Card className="p-6 border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-white border border-primary/10 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl transition-all group-hover:bg-primary/10" />
                <PhotoUpload 
                  ref={photoUploadRef}
                  onPhotoCapture={(url) => setPhoto(url)} 
                  label={t(`rubber.photoStep.${currentPhotoStep}`)}
                  required
                />
             </Card>
          )}
        </div>

        {/* Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-2xl border-t border-slate-100/50 z-40">
           {updateError && (
             <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 animate-fade-in">
               <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
               <p className="text-xs font-bold text-rose-600 flex-1">{updateError}</p>
               <button 
                 onClick={() => { setUpdateError(null); handleUpdateStatus(getNextStatus(status)); }}
                 className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-lg uppercase shrink-0"
               >
                 ลองใหม่
               </button>
             </div>
           )}
           {status === "washing" ? (
             <div className="text-center p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-xs font-black text-slate-400 uppercase">{t("store.processing")}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{t("rubber.orderDetail.waitingStore")}</p>
             </div>
           ) : status === "completed" ? (
             <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200 flex items-center justify-center gap-2 text-green-600 font-black">
                <Icons.Check size={20} /> {t("rubber.orderDetail.workCompleted")}
             </div>
           ) : (
             <Button 
                fullWidth 
                onClick={() => handleUpdateStatus(getNextStatus(status))}
                isLoading={isUpdating}
                className="bg-primary text-white hover:bg-primary-dark shadow-2xl shadow-primary/30 py-6 text-base font-black rounded-xl uppercase"
             >
                {status === "picking_up" ? "ยืนยันการรับผ้า" : 
                 status === "delivering_to_store" ? "ส่งผ้าที่ร้านซัก" : 
                 status === "at_shop" ? "ส่งผ้าที่ร้านซัก" : 
                 status === "ready_for_pickup" ? "รับผ้าจากร้าน" : 
                 status === "delivering_to_customer" ? "ส่งผ้าคืนลูกค้า" : "อัปเดตสถานะ"}
             </Button>
           )}
        </div>
      </div>
      {/* Full-Screen Photo Modal */}
      <Modal isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} title="ดูรูปภาพ">
        <div className="p-4 bg-slate-50 flex items-center justify-center min-h-[400px]">
          {selectedPhoto && (
            <img src={selectedPhoto} className="max-w-full max-h-[70vh] rounded-xl shadow-2xl border-4 border-white" alt="Evidence" />
          )}
        </div>
      </Modal>

    </div>
  );
}
