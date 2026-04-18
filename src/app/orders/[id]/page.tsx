"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant, statusLabel } from "@/components/ui/Badge";
import StatusTimeline from "@/components/ui/StatusTimeline";
import Button from "@/components/ui/Button";
// Removed mock import
import { Icons, getServiceIcon } from "@/components/ui/Icons";
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

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface-alt flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark shrink-0">
              {getServiceIcon(serviceId, { size: 24 })}
            </div>
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
            <StatusTimeline currentStatus={order.status} />
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
                {(order.status === 'delivering_to_customer' ? order.deliveryDriverName : order.pickupDriverName || "D")?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {order.status === 'delivering_to_customer' ? order.deliveryDriverName : order.pickupDriverName || "Driver Partner"}
                </p>
                <p className="text-xs text-muted">Rider ID: {(order.status === 'delivering_to_customer' ? order.deliveryDriverId : order.pickupDriverId)?.slice(-6).toUpperCase()}</p>
              </div>
              <a
                href={`tel:${order.riderPhone || '0810000000'}`}
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
              <span className="text-lg font-bold text-primary-dark">฿{order.totalPrice}</span>
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
