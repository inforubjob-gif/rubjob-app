"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function TermsPage() {
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
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply opacity-70 animate-pulse-gold" />
        <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-amber-200/40 blur-[150px] mix-blend-multiply opacity-60" />
      </div>

      {/* ─── Navigation ─── */}
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
              {t("landingLegal.termsTitle")}
            </h1>
            <p className="text-slate-500 text-lg font-medium">
              {t("landingLegal.termsDescription")}
            </p>
            <div className="mt-4 text-xs font-black text-primary uppercase tracking-widest">
              {t("landingLegal.lastUpdated").replace("{date}", "27 March 2026")}
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">1. {language === 'th' ? 'การยอมรับข้อกำหนด' : 'Acceptance of Terms'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "การเข้าถึงและใช้งานแพลตฟอร์ม Rubjob ถือว่าคุณยอมรับข้อตกลงและเงื่อนไขเหล่านี้ทุกประการ หากคุณไม่ยอมรับข้อกำหนดเหล่านี้ กรุณางดเว้นการใช้บริการ"
                 : "By accessing and using the Rubjob platform, you fully accept these terms and conditions. If you do not agree with any part of these terms, please refrain from using our services."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">2. {language === 'th' ? 'ขอบเขตบริการ' : 'Scope of Service'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "Rubjob เป็นสื่อกลางในการเชื่อมต่อลูกค้ากับผู้ให้บริการซักอบรีดและพนักงานขนส่ง เรามุ่งมั่นที่จะให้บริการที่มีคุณภาพและปลอดภัยสูงสุดสำหรับเสื้อผ้าทุกชิ้น"
                 : "Rubjob acts as an intermediary connecting customers with laundry service providers and delivery personnel. We are committed to providing the highest quality and safety for every garment."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">3. {language === 'th' ? 'นโยบายการชดเชย' : 'Compensation Policy'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "ในกรณีที่ผ้าเกิดความเสียหายหรือสูญหายอันเนื่องมาจากการปฏิบัติงาน Rubjob จะดำเนินการชดเชยตามเงื่อนไขที่กำหนดไว้ในนโยบายการรับประกันของเรา"
                 : "In the event of damage or loss caused by our operations, Rubjob will provide compensation according to the terms specified in our guarantee policy."}
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
