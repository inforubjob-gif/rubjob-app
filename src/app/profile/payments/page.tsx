"use client";

import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";

import { useState, useEffect } from "react";
import { useLiff } from "@/components/providers/LiffProvider";
import PinLock from "@/components/PinLock";

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useLiff();
  const [prefs, setPrefs] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.userId) return;
    setIsLoading(true);
    fetch(`/api/users/preferences?userId=${profile.userId}`)
      .then(res => res.json())
      .then((data: any) => {
         if (data.preferences) setPrefs(data.preferences);
      })
      .finally(() => setIsLoading(false));
  }, [profile?.userId]);

  return (
    <PinLock type="customer" userId={profile?.userId} onVerified={() => {}}>
      <div className="flex flex-col min-h-dvh bg-slate-50">
        <header className="bg-white px-5 pt-4 pb-4 border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
          >
            <Icons.Back size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">{t("profile.paymentsPage.title")}</h1>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-page-enter">
          <div className="w-40 h-40 mb-6 bg-slate-100/50 rounded-[2rem] p-6 shadow-inner border border-slate-200/50 flex items-center justify-center">
            <img 
              src="/images/icon-qr-payment.png" 
              alt="QR Payment Only" 
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-3">รองรับการจ่ายเงินผ่าน<br/><span className="text-primary">Promptpay</span> เท่านั้น</h2>
          <p className="text-sm font-medium text-slate-500 max-w-[250px] mx-auto leading-relaxed">
            ขออภัยในความไม่สะดวก ทางเรากำลังพัฒนาระบบชำระเงินรูปแบบอื่นๆ เพิ่มเติมครับ
          </p>
        </main>
      </div>
    </PinLock>
  );
}
