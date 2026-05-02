"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant, statusLabel } from "@/components/ui/Badge";
import StatusTimeline from "@/components/ui/StatusTimeline";
import Button from "@/components/ui/Button";
// Removed mock import
import { Icons, getServiceIcon, IconCircle } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";

const ITEM_KEY_MAP: Record<string, string> = {
  "T-shirt": "items.tshirt",
  "Pants": "items.pants",
  "Towel": "items.towel",
  "Suit Jacket": "items.suitJacket",
  "Dress Shirt": "items.dressShirt",
  "Skirt": "items.skirt",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useLiff();
  const { t } = useTranslation();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/orders/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText }),
      });
      if (res.ok) {
        alert("ขอบคุณสำหรับรีวิวครับ!");
        // Update local state to hide review box
        setOrder({ ...order, rating, reviewText });
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    async function fetchOrder() {
      if (!id) return;
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = (await res.json()) as any;
        if (data.order) {
          setOrder(data.order);
        }
      } catch (err) {
        console.error("Fetch order detail error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  const sendToLine = async () => {
    try {
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) {
        const statusTxt = t(`orders.status.${order?.status || 'pending'}`);
        const msg = t("orders.notifications.msgTemplate")
          .replace("{id}", order?.id || "")
          .replace("{status}", statusTxt);

        await liff.sendMessages([
          {
            type: "text",
            text: `🧺 RUBJOB Update\n${msg}\n\nView details: ${window.location.href}`,
          },
        ]);
        alert(t("orders.notifications.statusSent"));
      } else {
        alert(t("orders.lineOnly"));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted text-xs mt-4 font-bold uppercase">
          {t("common.loading") || "Fetching Order Detail..."}
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-5 text-center text-slate-300">
        <Icons.FileText size={48} strokeWidth={1.5} className="mb-4 opacity-20" />
        <p className="text-base font-bold text-foreground">{t("orders.orderNotFound")}</p>
        <p className="text-sm text-muted mt-1">{t("orders.orderNotFoundSub")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/orders")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const serviceId = order.serviceId || order.service;
  const items = Array.isArray(order.items) ? order.items : [];
  const address = typeof order.address === "object" ? order.address : { label: "N/A" };
  const isDeliveryPhase = ['ready_for_pickup', 'delivering_to_customer', 'completed'].includes(order.status);

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="active:scale-95 transition-transform"
          >
            <IconCircle variant="white" size="sm">
              <Icons.Back size={18} />
            </IconCircle>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{t("orders.detailsTitle")}</h1>
            <p className="text-xs text-muted">{order.id}</p>
          </div>
          <Badge variant={statusToBadgeVariant(order.status)}>
            {t(`orders.status.${order.status}`)}
          </Badge>
        </div>
      </header>

      <div className="flex-1 px-5 py-5 space-y-5 animate-fade-in">
        {/* Service Info */}
        <Card className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <IconCircle variant="orange" size="md">
              {getServiceIcon(serviceId, { size: 24 })}
            </IconCircle>
            <div>
              <h2 className="text-base font-bold text-foreground">{t(`orders.services.${serviceId}`) || order.serviceName}</h2>
              <p className="text-xs text-muted">~{order.estimatedDays || 2} {t("booking.dayTurnaround")}</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <InfoRow label={t("orders.info.pickupDate")} value={order.pickupDate} />
            <InfoRow label={t("orders.info.timeSlot")} value={order.pickupTimeSlot} />
            <InfoRow label={t("orders.info.address")} value={address.label} />
            {order.deliveryDate && (
              <InfoRow label={t("orders.info.delivered")} value={order.deliveryDate} />
            )}
          </div>
        </Card>

        {/* Status Timeline */}
        {order.status !== "cancelled" && (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Icons.MapPin size={18} className="text-primary" /> {t("orders.tracking")}
            </h3>
            <StatusTimeline currentStatus={order.status} orderType={order.orderType} />
          </Card>
        )}

        {/* Review Section (New) */}
        {order.status === "completed" && !order.rating && (
          <Card className="p-6 bg-gradient-to-br from-white to-primary/5 border-primary/20 shadow-xl shadow-primary/5">
             <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center text-3xl mb-4 animate-bounce-slow">
                   ⭐️
                </div>
                <h3 className="text-lg font-black text-foreground mb-1">{t("orders.review.title") || "ให้คะแนนบริการนี้"}</h3>
                <p className="text-xs text-muted mb-6">{t("orders.review.subtitle") || "ความเห็นของคุณช่วยพัฒนาการบริการให้ดียิ่งขึ้น"}</p>
                
                <div className="flex gap-3 mb-8">
                   {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-3xl transition-all duration-300 transform ${rating >= star ? "scale-125 grayscale-0" : "grayscale opacity-30 hover:opacity-50 hover:scale-110"}`}
                      >
                         ⭐
                      </button>
                   ))}
                </div>

                {rating > 0 && (
                  <div className="w-full space-y-4 animate-fade-in">
                     <textarea 
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-300 font-medium"
                        placeholder={t("orders.review.placeholder") || "เล่าประสบการณ์การใช้งานที่นี่..."}
                        rows={3}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                     />
                     <Button 
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest"
                     >
                        {isSubmittingReview ? t("common.sending") : t("orders.review.submit") || "ส่งรีวิวเลย"}
                     </Button>
                  </div>
                )}
             </div>
          </Card>
        )}

        {/* Driver Info */}
        {(order.pickupDriverId || order.deliveryDriverId) && (
          <Card className="p-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Icons.Truck size={18} className="text-primary" /> {t("orders.info.driver")}
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-lg font-bold text-primary-dark">
                {(isDeliveryPhase ? order.deliveryDriverName : order.pickupDriverName || "D")?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {isDeliveryPhase ? order.deliveryDriverName : order.pickupDriverName || "Driver Partner"}
                </p>
                <p className="text-xs text-muted">Rider ID: {(isDeliveryPhase ? order.deliveryDriverId : order.pickupDriverId)?.slice(-6).toUpperCase()}</p>
              </div>
              <a
                href={`tel:${isDeliveryPhase ? order.deliveryDriverPhone : order.pickupDriverPhone}`}
                className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"
              >
                <Icons.Phone size={20} className="text-success" />
              </a>
            </div>
          </Card>
        )}

        {/* Items Breakdown */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Icons.FileText size={18} className="text-primary" /> {t("orders.items")}
          </h3>
          <div className="space-y-2">
            {items.map((item: any, i: number) => {
              const qty = parseFloat(item.quantity) || 1;
              const price = parseFloat(item.pricePerUnit) || 0;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {t(ITEM_KEY_MAP[item.name] || "") || item.name} × {item.quantity}
                  </span>
                  <span className="font-semibold text-foreground">
                    ฿{qty * price}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-dashed border-border pt-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{t("booking.laundryFee") || "Laundry Fee"}</span>
                <span className="font-semibold text-foreground">฿{order.laundryFee}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{t("booking.deliveryFee") || "Delivery Fee"}</span>
                <span className="font-semibold text-foreground">฿{order.deliveryFee}</span>
              </div>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">{t("orders.total")}</span>
              <span className="text-lg font-bold text-primary-dark">฿{Math.ceil(order.totalPrice)}</span>
            </div>
          </div>
        </Card>

        {/* Support */}
        <Card className="p-4 bg-surface-alt">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shrink-0">
              <Icons.Phone size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t("orders.needHelp")}</p>
              <p className="text-xs text-muted">{t("orders.contactSupport")}</p>
            </div>
            <Button variant="outline" size="sm">
              {t("common.chat")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}
