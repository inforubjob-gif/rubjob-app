"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/providers/LiffProvider";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons, getServiceIcon, IconCircle } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import { TIME_SLOTS } from "@/lib/constants";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PromptPayCheckout from "@/components/checkout/PromptPayCheckout";

export default function QuickBookPage() {
  const router = useRouter();
  const { profile, isReady, login, isLoggedIn } = useLiff();
  const { t, language } = useTranslation();

  const [recentOrder, setRecentOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  
  // Payment state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "loading" | "creating" | "ready" | "error">("idle");

  // Prevent double-submit
  const hasSubmittedRef = useRef(false);

  // Fetch Stripe config
  useEffect(() => {
    async function fetchStripeConfig() {
      try {
        const res = await fetch("/api/payment/config");
        const data = await res.json() as any;
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (err) {
        console.error("Failed to fetch payment config", err);
      }
    }
    fetchStripeConfig();
  }, []);

  // Fetch recent order
  useEffect(() => {
    if (!profile?.userId) {
      if (profile === null) {
        setIsLoading(false);
      }
      return;
    }

    async function fetchRecentOrder() {
      try {
        const res = await fetch(`/api/orders?userId=${profile?.userId}`);
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          const validOrder = data.orders.find((o: any) => o.status !== "rejected") || data.orders[0];
          if (typeof validOrder.items === "string") {
            try { validOrder.items = JSON.parse(validOrder.items); } catch {}
          }
          if (typeof validOrder.address === "string") {
            try { validOrder.address = JSON.parse(validOrder.address); } catch {}
          }
          setRecentOrder(validOrder);
        }
      } catch (err) {
        console.error("Failed to fetch recent order:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecentOrder();
  }, [profile?.userId]);

  const getFirstAvailableSlot = () => {
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const validSlots = TIME_SLOTS.filter(s => {
      const [slotH, slotM] = s.startTime.split(":").map(Number);
      return !(currentH > slotH || (currentH === slotH && currentM >= slotM));
    });

    if (validSlots.length > 0) {
      return { date: todayStr, slotId: validSlots[0].id, slotLabel: validSlots[0].label };
    } else {
      const tomorrow = new Date(now.getTime() + 86400000 - now.getTimezoneOffset() * 60000);
      return { date: tomorrow.toISOString().slice(0, 10), slotId: TIME_SLOTS[0].id, slotLabel: TIME_SLOTS[0].label };
    }
  };

  // Manual Submit: User must click "Confirm" to create booking + payment
  const handleConfirmQuickBook = async () => {
    if (!recentOrder || !profile?.userId || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setPaymentStatus("creating");

    try {
      const { date, slotId } = getFirstAvailableSlot();

      const payload = {
        userId: profile!.userId,
        storeId: recentOrder.storeId,
        providerId: recentOrder.providerId,
        serviceId: recentOrder.serviceId,
        items: recentOrder.items,
        address: recentOrder.address,
        paymentMethod: "promptpay",
        laundryFee: recentOrder.laundryFee,
        deliveryFee: recentOrder.deliveryFee,
        distanceKm: recentOrder.distanceKm || 0,
        totalPrice: recentOrder.totalPrice,
        pickupDateTime: `${date} ${slotId}`,
        scheduledDate: recentOrder.scheduledDate
      };

      // 1. Create Booking
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const bookingData = await res.json();
      if (!res.ok || !bookingData.success) throw new Error(bookingData.error || "Booking failed");
      
      const orderId = bookingData.orderId;
      setActiveOrderId(orderId);

      // 2. Create Stripe Payment
      const payRes = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: Math.ceil(recentOrder.totalPrice),
          paymentMethod: "promptpay"
        })
      });

      const payData = await payRes.json() as any;
      if (payRes.ok && payData.clientSecret) {
        setClientSecret(payData.clientSecret);
        setPaymentStatus("ready");
      } else {
        throw new Error("Payment initialization failed");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาด");
      setPaymentStatus("error");
    }
  };

  const totalPrice = Math.ceil(recentOrder?.totalPrice || 0);

  // ─── Loading State ───
  if (isLoading || paymentStatus === "loading" || paymentStatus === "creating") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-black text-slate-700 uppercase">
            {paymentStatus === "creating" ? "กำลังสร้างคำสั่งซัก..." : t("common.loading")}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {paymentStatus === "creating" ? "กรุณารอสักครู่ ระบบกำลังเตรียม QR ชำระเงิน" : ""}
          </p>
        </div>
      </div>
    );
  }

  // ─── No Recent Order ───
  if (!recentOrder) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 text-slate-300">
          <Icons.Clock size={40} />
        </div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">ไม่พบประวัติการใช้งาน</h1>
        <p className="text-sm text-slate-500 mb-8 max-w-[250px]">
          คุณต้องทำการจองบริการผ่านระบบปกติอย่างน้อย 1 ครั้ง เพื่อใช้งานระบบจองด่วน
        </p>
        <button
          onClick={() => router.push("/booking")}
          className="bg-primary text-white px-8 py-3.5 rounded-2xl text-sm font-black uppercase shadow-lg shadow-primary/30 active:scale-95 transition-all"
        >
          กลับไปหน้าจองปกติ
        </button>
      </div>
    );
  }

  // ─── Error State ───
  if (paymentStatus === "error") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 text-red-400">
          <Icons.AlertCircle size={40} />
        </div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">เกิดข้อผิดพลาด</h1>
        <p className="text-sm text-red-500 mb-4 max-w-[280px] font-medium">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => { hasSubmittedRef.current = false; window.location.reload(); }}
            className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-black uppercase shadow-lg shadow-primary/30 active:scale-95 transition-all"
          >
            ลองใหม่
          </button>
          <button
            onClick={() => router.push("/booking")}
            className="bg-white text-slate-600 px-6 py-3 rounded-xl text-sm font-bold border border-slate-200 active:scale-95 transition-all"
          >
            จองปกติ
          </button>
        </div>
      </div>
    );
  }

  // ─── Idle State — Show Summary ───
  if (paymentStatus === "idle") {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-white px-5 pt-4 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
          <button onClick={() => router.back()} className="active:scale-95 transition-transform">
            <IconCircle variant="white" size="sm">
              <Icons.Back size={18} />
            </IconCircle>
          </button>
          <h1 className="text-lg font-bold text-slate-900">⚡ จองด่วน</h1>
          <img src="/images/rubjob-complete_logo-color.png" alt="RUBJOB" className="h-7 w-auto object-contain" />
        </header>

        <main className="flex-1 px-5 py-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <IconCircle variant="orange" size="md">
                {getServiceIcon(recentOrder.serviceId, { size: 24 })}
              </IconCircle>
              <div>
                <h2 className="font-black text-slate-800 text-lg">
                  ใช้บริการแบบเดิม
                </h2>
                <p className="text-sm text-slate-500">บริการ: {recentOrder.serviceName || recentOrder.serviceId}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-bold">ราคารวม (โดยประมาณ)</span>
                <span className="text-xl font-black text-primary">฿{totalPrice}</span>
              </div>
              <p className="text-xs text-slate-400">
                ระบบจะสร้างคำสั่งซักโดยอ้างอิงจากออเดอร์ล่าสุดของคุณ (ทั้งราคาและสถานที่รับส่ง) และชำระเงินผ่านระบบ PromptPay
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleConfirmQuickBook}
                className="w-full bg-primary text-white py-4 rounded-xl font-black text-base uppercase shadow-lg shadow-primary/30 active:scale-95 transition-all"
              >
                ยืนยันจองด่วน
              </button>
              
              <button
                onClick={() => router.push("/booking")}
                className="w-full bg-white text-slate-500 border border-slate-200 py-3.5 rounded-xl font-bold text-sm uppercase active:scale-95 transition-all"
              >
                แก้ไขรายละเอียด (จองปกติ)
              </button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // ─── Payment Ready — Show QR ───
  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white px-5 pt-4 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => router.back()} className="active:scale-95 transition-transform">
          <IconCircle variant="white" size="sm">
            <Icons.Back size={18} />
          </IconCircle>
        </button>
        <h1 className="text-lg font-bold text-slate-900">⚡ จองด่วน</h1>
        <img src="/images/rubjob-complete_logo-color.png" alt="RUBJOB" className="h-7 w-auto object-contain" />
      </header>

      <main className="flex-1 p-5 pb-40 animate-page-enter">
        {/* Success Banner */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
            <Icons.Check size={22} strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm font-black text-green-800">สร้างคำสั่งซักสำเร็จ!</p>
            <p className="text-xs text-green-600 font-medium mt-0.5">สแกน QR ด้านล่างเพื่อชำระเงิน</p>
          </div>
        </div>

        {/* Order Summary Mini */}
        <Card className="p-4 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <IconCircle variant="orange" size="md" className="shrink-0">
              {getServiceIcon(recentOrder.serviceId, { size: 20 })}
            </IconCircle>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900">
                {t(`orders.services.${recentOrder.serviceId}`) || recentOrder.serviceId}
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">
                {recentOrder.address?.label || recentOrder.address?.name || "ที่อยู่จัดส่ง"}
              </p>
            </div>
            <span className="text-xl font-black text-primary-dark">฿{totalPrice}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Icons.Bell size={12} />
            <span>เวลารับผ้าถัดไปอัตโนมัติ</span>
          </div>
        </Card>

        {/* PromptPay QR via Stripe */}
        {clientSecret && stripePromise ? (
          <Card className="p-6 border-2 border-primary bg-primary/5 shadow-2xl shadow-primary/10">
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <PromptPayCheckout clientSecret={clientSecret} autoConfirm />
            </Elements>
          </Card>
        ) : (
          <Card className="p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">กำลังโหลด QR Code...</p>
          </Card>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-5 z-40">
        <button
          onClick={() => router.push(activeOrderId ? `/orders/${activeOrderId}` : "/orders")}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          ดูประวัติการสั่งซื้อ
        </button>
      </div>
    </div>
  );
}
