"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant, statusLabel } from "@/components/ui/Badge";
import StatusTimeline from "@/components/ui/StatusTimeline";
import Button from "@/components/ui/Button";
import { MOCK_ORDERS, SERVICES } from "@/lib/mock-data";
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
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json() as any;
        if (data.order) {
          setOrder(data.order);
        } else {
          // Fallback to mock for dev
          setOrder(MOCK_ORDERS.find(o => o.id === id));
        }
      } catch (err) {
        console.error("Fetch order detail error:", err);
        setOrder(MOCK_ORDERS.find(o => o.id === id));
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchOrder();
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
        <p className="text-muted text-xs mt-4 font-bold tracking-widest uppercase">
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

  const service = SERVICES.find((s) => s.id === order.service);

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
            {statusLabel(order.status)}
          </Badge>
        </div>
      </header>

      <div className="flex-1 px-5 py-5 space-y-5 animate-fade-in">
        {/* Service Info */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center text-primary-dark shrink-0">
              {getServiceIcon(order.service, { size: 24 })}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{t(`orders.services.${order.service}`) || service?.name}</h2>
              <p className="text-xs text-muted">~{service?.estimatedDays} {t("booking.dayTurnaround")}</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <InfoRow label={t("orders.info.pickupDate")} value={order.pickupDate} />
            <InfoRow label={t("orders.info.timeSlot")} value={order.pickupTimeSlot} />
            <InfoRow label={t("orders.info.address")} value={order.address.label} />
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
        {(order.pickupDriverId || order.deliveryDriverId) && order.status !== "completed" && (
          <Card className="p-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Icons.Home size={18} className="text-primary" /> {t("orders.info.driver")}
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-lg font-bold text-primary-dark">
                D
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Driver Partner</p>
                <p className="text-xs text-muted">081-XXX-XXXX</p>
              </div>
              <a
                href={`tel:0810000000`}
                className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
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
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {t(ITEM_KEY_MAP[item.name] || "") || item.name} × {item.quantity}
                </span>
                <span className="font-semibold text-foreground">
                  ฿{item.quantity * item.pricePerUnit}
                </span>
              </div>
            ))}
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
