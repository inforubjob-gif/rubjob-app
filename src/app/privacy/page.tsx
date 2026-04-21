"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function PrivacyPage() {
  const { t, language } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-dvh bg-[#fafbfd] text-slate-800 font-sans overflow-x-hidden relative">
      {/* ─── Ambient Glowing Orbs ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply opacity-70 animate-pulse-gold" />
        <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-orange-100/60 blur-[100px] mix-blend-multiply opacity-80" />
      </div>

      {/* ─── Navigation (Simple version of landing nav) ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <a href="/landing" className="flex items-center">
            <img 
              src="/images/rubjob-complete_Text-color.png" 
              alt="RUBJOB" 
              className="h-12 md:h-16 w-auto object-contain" 
            />
          </a>
          <div className="flex items-center gap-4">
            <a href="/landing" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors cursor-pointer">
              {language === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
            </a>
          </div>
        </div>
      </nav>

      {/* ─── Content ─── */}
      <main className="relative z-10 pt-32 pb-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              {t("landingLegal.privacyTitle")}
            </h1>
            <p className="text-slate-500 text-lg font-medium">
              {t("landingLegal.privacyDescription")}
            </p>
            <div className="mt-4 text-xs font-black text-primary uppercase tracking-widest">
              {t("landingLegal.lastUpdated").replace("{date}", "27 March 2026")}
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">1. {language === 'th' ? 'ข้อมูลที่เราเก็บรวบรวม' : 'Information We Collect'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "เราเก็บรวบรวมข้อมูลที่คุณให้ไว้เมื่อสมัครใช้งาน เช่น ชื่อ, เบอร์โทรศัพท์, ที่อยู่สำหรับรับ-ส่งผ้า และประวัติการทำรายการ เพื่อให้การบริการเป็นไปอย่างราบรื่น"
                 : "We collect information you provide when signing up, such as your name, phone number, pickup/delivery addresses, and transaction history to ensure smooth service delivery."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">2. {language === 'th' ? 'การใช้งานข้อมูลของคุณ' : 'How We Use Your Data'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "ข้อมูลของคุณจะถูกนำไปใช้เพื่อการจัดส่งผ้าโดยคนขับ ตรวจสอบสถานะการซักอบรีดโดยร้านค้าพาร์ทเนอร์ และแจ้งเตือนสถานะต่างๆ ผ่าน LINE OA"
                 : "Your data is used for delivery coordination by riders, laundry processing verification by partner stores, and status notifications via our LINE OA."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">3. {language === 'th' ? 'ความปลอดภัยของข้อมูล' : 'Data Security'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "เราใช้ระบบรักษาความปลอดภัยมาตรฐานอุตสาหกรรม และการเข้ารหัสข้อมูล (Encryption) เพื่อปกป้องข้อมูลส่วนบุคคลของคุณจากการเข้าถึงโดยไม่ได้รับอนุญาต"
                 : "We implement industry-standard security measures and encryption to protect your personal information from unauthorized access."}
              </p>
            </section>

            <div className="pt-8 border-t border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-4">{t("landingLegal.businessDetails")}</h3>
              <div className="text-sm text-slate-500 space-y-2">
                <p>{t("landingLegal.address")}</p>
                <p>{t("landingLegal.email")}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Simple Footer ─── */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
            © 2026 RUBJOB. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
