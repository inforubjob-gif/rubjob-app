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
        // Not logged in or initialization failed
        setIsLoading(false);
      }
      return;
    }

    async function fetchRecentOrder() {
      try {
        const res = await fetch(`/api/orders?userId=${profile?.userId}`);
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          // Find the most recent valid order (e.g. not rejected)
          const validOrder = data.orders.find((o: any) => o.status !== "rejected") || data.orders[0];
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
      return { date: todayStr, slotId: validSlots[0].id };
    } else {
      // If today is full, return tomorrow's first slot
      const tomorrow = new Date(now.getTime() + 86400000 - now.getTimezoneOffset() * 60000);
      return { date: tomorrow.toISOString().slice(0, 10), slotId: TIME_SLOTS[0].id };
    }
  };

  const handleConfirm = async () => {
    if (!recentOrder || !profile?.userId) return;

    setIsSubmitting(true);
    setError("");

    try {
      const { date, slotId } = getFirstAvailableSlot();

      const payload = {
        userId: profile.userId,
        storeId: recentOrder.storeId,
        providerId: recentOrder.providerId,
        serviceId: recentOrder.serviceId,
        items: recentOrder.items,
        address: recentOrder.address,
        paymentMethod: recentOrder.paymentMethod || "qr",
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

      // 2. We show the payment step so they can scan the QR
      setStep("payment");
      setIsSubmitting(false);

    } catch (err: any) {
      console.error(err);
      setError(err.message || t("common.toast.error"));
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t("common.loading")}</p>
      </div>
    );
  }

  if (!recentOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 absolute left-1/2 -translate-x-1/2">
          จองด่วน (Quick Book)
        </h1>
        <div className="w-9 h-9" />
      </header>

      <main className="flex-1 p-5 pb-32 animate-fade-in">
        {step === "confirm" ? (
          <>
            <div className="mb-6">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">ทำรายการเดิมซ้ำ</h2>
              <p className="text-slate-800 font-medium text-sm">
                ระบบจะอิงข้อมูลจากออเดอร์ล่าสุดของคุณ และเลือกเวลาเข้ารับผ้าที่เร็วที่สุดของวันนี้
              </p>
            </div>

            <Card className="p-0 overflow-hidden mb-6 border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-white">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                  {getServiceIcon(recentOrder.serviceId, { size: 24 })}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase">{t(`orders.services.${recentOrder.serviceId}`) || recentOrder.serviceId}</h3>
                  <p className="text-xs text-slate-500 font-medium">รูปแบบที่คุณใช้เป็นประจำ</p>
                </div>
              </div>
              
              <div className="p-4 space-y-4 bg-slate-50/50">
                <div className="flex gap-3">
                  <IconCircle variant="black" size="sm" className="shrink-0 mt-0.5">
                    <Icons.FileText size={12} />
                  </IconCircle>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">รายการที่เลือก</p>
                    {recentOrder.items?.map((item: any, i: number) => (
                      <p key={i} className="text-sm font-medium text-slate-900">• {item.name}</p>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <IconCircle variant="blue" size="sm" className="shrink-0 mt-0.5">
                    <Icons.MapPin size={12} />
                  </IconCircle>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">สถานที่รับ-ส่ง</p>
                    <p className="text-sm font-medium text-slate-900">{recentOrder.address?.detail || recentOrder.address?.address || "ไม่มีระบุ"}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <IconCircle variant="yellow" size="sm" className="shrink-0 mt-0.5">
                    <Icons.Bell size={12} />
                  </IconCircle>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ความเร็วจัดส่ง</p>
                    <p className="text-sm font-medium text-slate-900">{recentOrder.scheduledDate}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                <span className="font-black text-slate-600 uppercase">ยอดรวมสุทธิ</span>
                <span className="text-xl font-black text-primary">฿{Math.ceil(recentOrder.totalPrice)}</span>
              </div>
            </Card>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
                <Icons.Close size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-8 pb-12 animate-fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100/50">
              <Icons.Check size={32} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">การจองด่วนสำเร็จ</h2>
            <p className="text-sm text-slate-500 mb-8 text-center max-w-[280px]">
              สแกน QR Code เพื่อชำระเงิน หรือคลิกดูรายละเอียดออเดอร์เพื่อชำระภายหลัง
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
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021129370016A000000677010111011300660000000005802TH5303764580215${Math.ceil(recentOrder.totalPrice)}.006304`}
                  alt="PromptPay QR" 
                  className="w-48 h-48 object-contain"
                />
              </div>
              
              <div className="text-center w-full">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm font-bold text-slate-500">ยอดชำระสุทธิ</span>
                  <span className="text-3xl font-black text-slate-900">฿{Math.ceil(recentOrder.totalPrice)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-40">
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
                ยืนยันการจองด่วน
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => router.push(`/orders/${activeOrderId}`)}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            ไปหน้าออเดอร์ของฉัน
          </button>
        )}
      </div>
    </div>
  );
}
