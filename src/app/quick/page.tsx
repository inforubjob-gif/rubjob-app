"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/providers/LiffProvider";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons, getServiceIcon, IconCircle } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import { TIME_SLOTS } from "@/lib/constants";

export default function QuickBookPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const { t, language } = useTranslation();

  const [recentOrder, setRecentOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"confirm" | "payment">("confirm");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

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
          // Parse items/address if they're JSON strings
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

  const nextSlot = getFirstAvailableSlot();
  const locale = language === "th" ? "th-TH" : "en-US";
  const pickupDateLabel = new Date(nextSlot.date + "T00:00:00").toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long",
  });

  const handleConfirm = async () => {
    if (!recentOrder || !profile?.userId) return;

    setIsSubmitting(true);
    setError("");

    try {
      const { date, slotId } = nextSlot;

      const payload = {
        userId: profile.userId,
        storeId: recentOrder.storeId,
        providerId: recentOrder.providerId,
        serviceId: recentOrder.serviceId,
        items: recentOrder.items,
        address: recentOrder.address,
        paymentMethod: recentOrder.paymentMethod || "promptpay",
        laundryFee: recentOrder.laundryFee,
        deliveryFee: recentOrder.deliveryFee,
        distanceKm: recentOrder.distanceKm || 0,
        totalPrice: recentOrder.totalPrice,
        pickupDateTime: `${date} ${slotId}`,
        scheduledDate: recentOrder.scheduledDate
      };

      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const bookingData = await res.json();
      if (!res.ok || !bookingData.success) throw new Error(bookingData.error || "Booking failed");
      
      const orderId = bookingData.orderId;
      setActiveOrderId(orderId);
      setStep("payment");
      setIsSubmitting(false);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาด");
      setIsSubmitting(false);
    }
  };

  // Navigate to full booking with pre-filled service
  const handleEdit = () => {
    if (recentOrder?.serviceId) {
      router.push(`/booking?service=${recentOrder.serviceId}`);
    } else {
      router.push("/booking");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t("common.loading")}</p>
      </div>
    );
  }

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

  // Extract display info
  const addressLabel = recentOrder.address?.label || recentOrder.address?.name || "ที่อยู่";
  const addressDetail = recentOrder.address?.details || recentOrder.address?.detail || recentOrder.address?.address || "ไม่มีระบุ";
  const addressNote = recentOrder.address?.note;
  const laundryFee = recentOrder.laundryFee || 0;
  const deliveryFee = recentOrder.deliveryFee || 0;
  const totalPrice = Math.ceil(recentOrder.totalPrice || 0);
  const distanceKm = recentOrder.distanceKm ? Number(recentOrder.distanceKm).toFixed(1) : null;
  const isExpress = recentOrder.scheduledDate?.includes("ด่วน") || recentOrder.scheduledDate?.includes("Express");
  const itemsList = Array.isArray(recentOrder.items) ? recentOrder.items : [];

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white px-5 pt-3 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="active:scale-95 transition-transform"
        >
          <IconCircle variant="white" size="sm">
            <Icons.Back size={18} />
          </IconCircle>
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          {step === "confirm" ? "⚡ จองด่วน" : "ชำระเงิน"}
        </h1>
        {step === "confirm" ? (
          <button
            onClick={handleEdit}
            className="text-xs font-black text-primary active:opacity-60 transition-opacity uppercase"
          >
            แก้ไข
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
      </header>

      <main className="flex-1 p-5 pb-40 animate-fade-in">
        {step === "confirm" ? (
          <>
            {/* Info Banner */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-5 flex items-start gap-3">
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Icons.Bell size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[13px] font-black text-primary-dark">ทำรายการเดิมซ้ำอีกครั้ง</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                  ระบบดึงข้อมูลจากออเดอร์ล่าสุดมาให้ คุณสามารถกด <span className="text-primary font-bold">"แก้ไข"</span> มุมขวาบนเพื่อปรับรายละเอียดได้
                </p>
              </div>
            </div>

            {/* Service Card */}
            <Card className="p-0 overflow-hidden mb-4 border-slate-200">
              <div className="p-4 flex items-center gap-4 bg-white border-b border-slate-100">
                <IconCircle variant="orange" size="lg" className="shrink-0">
                  {getServiceIcon(recentOrder.serviceId, { size: 24 })}
                </IconCircle>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-[15px]">
                    {t(`orders.services.${recentOrder.serviceId}`) || recentOrder.serviceId}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">ออเดอร์อ้างอิง: {recentOrder.id}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${isExpress ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                  {isExpress ? "⚡ ด่วน" : "มาตรฐาน"}
                </div>
              </div>
            </Card>

            {/* Details Section */}
            <div className="space-y-3 mb-5">
              {/* Items */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconCircle variant="black" size="sm">
                    <Icons.FileText size={12} strokeWidth={3} />
                  </IconCircle>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">รายการที่เลือก</span>
                </div>
                <div className="pl-9 space-y-1.5">
                  {itemsList.length > 0 ? itemsList.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">• {item.name}</span>
                      {item.qty && item.qty > 1 && (
                        <span className="text-xs font-bold text-slate-400">×{item.qty}</span>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400">ไม่มีรายการ</p>
                  )}
                </div>
              </Card>

              {/* Address */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconCircle variant="orange" size="sm">
                    <Icons.MapPin size={12} strokeWidth={3} />
                  </IconCircle>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">สถานที่รับ-ส่งผ้า</span>
                </div>
                <div className="pl-9">
                  <p className="text-sm font-bold text-slate-900">{addressLabel}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{addressDetail}</p>
                  {addressNote && (
                    <div className="flex items-center gap-1.5 mt-2 text-primary-dark">
                      <Icons.FileText size={11} strokeWidth={3} />
                      <p className="text-xs font-medium">{addressNote}</p>
                    </div>
                  )}
                  {distanceKm && (
                    <p className="text-[11px] text-slate-400 font-bold mt-1.5">📍 ระยะทาง {distanceKm} กม.</p>
                  )}
                </div>
              </Card>

              {/* Pickup Schedule */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconCircle variant="yellow" size="sm">
                    <Icons.Bell size={12} strokeWidth={3} />
                  </IconCircle>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">นัดรับผ้า (อัตโนมัติ)</span>
                </div>
                <div className="pl-9">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary-dark px-3 py-1.5 rounded-lg">
                      <p className="text-xs font-black">{pickupDateLabel}</p>
                    </div>
                    <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                      <p className="text-xs font-black">{nextSlot.slotLabel}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-2">
                    * ระบบเลือกช่วงเวลาที่เร็วที่สุดให้อัตโนมัติ
                  </p>
                </div>
              </Card>
            </div>

            {/* Price Breakdown */}
            <Card className="p-0 overflow-hidden mb-5 border-slate-200">
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <IconCircle variant="black" size="sm">
                    <Icons.Payment size={12} strokeWidth={3} />
                  </IconCircle>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">สรุปยอดชำระ</span>
                </div>
                <div className="pl-9 space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">🧺 ค่าซักรีด</span>
                    <span className="font-bold text-slate-800">฿{Math.ceil(laundryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">🛵 ค่าจัดส่ง (ไปกลับ)</span>
                    <span className="font-bold text-slate-800">฿{Math.ceil(deliveryFee)}</span>
                  </div>
                  {isExpress && (
                    <div className="flex justify-between items-center text-amber-600">
                      <span className="font-medium">⚡ ค่าบริการด่วน</span>
                      <span className="font-bold">+฿20</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-4 bg-slate-50 border-t border-slate-100 flex items-end justify-between mt-2">
                <div>
                  <span className="block text-sm font-black text-slate-900">ยอดรวมสุทธิ</span>
                  <span className="block text-[10px] text-slate-400 font-bold">รวมภาษีมูลค่าเพิ่มแล้ว</span>
                </div>
                <span className="text-3xl font-black text-primary-dark">฿{totalPrice}</span>
              </div>
            </Card>

            {/* Edit CTA */}
            <button
              onClick={handleEdit}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-primary border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all mb-4"
            >
              <Icons.Settings size={16} />
              ต้องการแก้ไขรายละเอียด? → ไปหน้าจองปกติ
            </button>

            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
                <Icons.AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-8 pb-12 animate-fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100/50">
              <Icons.Check size={32} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">การจองด่วนสำเร็จ!</h2>
            <p className="text-sm text-slate-500 mb-8 text-center max-w-[280px]">
              สแกน QR Code เพื่อชำระเงิน<br/><span className="text-rose-500 font-bold">*ต้องชำระเงินก่อนระบบถึงจะเริ่มดำเนินการ</span>
            </p>

            <Card className="w-full max-w-sm overflow-hidden flex flex-col items-center p-6 border-slate-200">
              <div className="bg-[#1a3d6d] px-5 py-2.5 rounded-xl flex items-center gap-3 mb-6 w-full justify-center">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-[11px] font-black text-[#1a3d6d]">PP</span>
                </div>
                <span className="text-base font-black text-white">PromptPay</span>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100 relative overflow-hidden mb-6">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021129370016A000000677010111011300660000000005802TH5303764580215${totalPrice}.006304`}
                  alt="PromptPay QR" 
                  className="w-48 h-48 object-contain"
                />
              </div>
              
              <div className="text-center w-full">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm font-bold text-slate-500">ยอดชำระสุทธิ</span>
                  <span className="text-3xl font-black text-slate-900">฿{totalPrice}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 left-0 right-0 p-5 z-40">
        {step === "confirm" ? (
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังดำเนินการ...</span>
              </>
            ) : (
              <>
                <Icons.Check size={20} strokeWidth={3} />
                ยืนยันการจองด่วน — ฿{totalPrice}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => router.push(`/orders/${activeOrderId}`)}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            ไปหน้าออเดอร์ →
          </button>
        )}
      </div>
    </div>
  );
}
