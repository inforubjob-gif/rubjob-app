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
    <div className="min-h-dvh bg-[#fafbfd] text-slate-800 font-sans relative">
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
              {t("landingLegal.lastUpdated").replace("{date}", "21 May 2026")}
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">1. {language === 'th' ? 'การยอมรับข้อกำหนด' : 'Acceptance of Terms'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "การเข้าใช้งานและใช้บริการของ Rubjob ถือว่าผู้ใช้งานรับทราบและยอมรับข้อกำหนด เงื่อนไข และนโยบายทั้งหมดของแพลตฟอร์ม"
                 : "By accessing and using Rubjob's services, the user acknowledges and accepts all terms, conditions, and policies of the platform."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">2. {language === 'th' ? 'ขอบเขตการให้บริการ' : 'Scope of Service'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "Rubjob เป็นแพลตฟอร์มตัวกลางในการเชื่อมต่อผู้ใช้งานกับผู้ให้บริการ พาร์ทเนอร์ร้านค้า และผู้ขับขี่ เพื่ออำนวยความสะดวกด้านการรับ–ส่งและบริการอื่น ๆ ที่ระบบรองรับ บริษัทขอสงวนสิทธิ์ในการปรับเปลี่ยน เพิ่ม หรือลดประเภทบริการตามความเหมาะสมโดยไม่ต้องแจ้งให้ทราบล่วงหน้า"
                 : "Rubjob is an intermediary platform connecting users with service providers, partner merchants, and drivers to facilitate delivery and other supported services. The Company reserves the right to modify, add, or reduce service types as appropriate without prior notice."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">3. {language === 'th' ? 'การส่งมอบสินค้าและทรัพย์สิน' : 'Delivery of Goods and Property'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "ผู้ใช้งานมีหน้าที่ตรวจสอบทรัพย์สินก่อนส่งมอบทุกครั้ง และไม่ควรเก็บเงินสด เอกสารสำคัญ ของมีค่า วัตถุอันตราย หรือสิ่งผิดกฎหมายไว้ภายในสิ่งของที่ส่งมอบให้บริการ บริษัทขอสงวนสิทธิ์ในการปฏิเสธหรือไม่รับผิดชอบต่อค่าเสียหายที่เกิดจากการให้บริการในกรณีที่พบวัตถุต้องห้ามหรือสิ่งที่อาจก่อให้เกิดความเสียหายต่อระบบการให้บริการ"
                 : "Users are responsible for inspecting their property before each delivery. Cash, important documents, valuables, hazardous materials, or illegal items should not be kept inside the delivered goods. The Company reserves the right to refuse service or disclaim liability for any damage resulting from services if prohibited items or items that may cause damage to the service system are found."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">4. {language === 'th' ? 'การตรวจสอบและบันทึกข้อมูลการให้บริการ' : 'Inspection and Recording of Service Data'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "เพื่อรักษามาตรฐานคุณภาพและความปลอดภัย ระบบอาจมีการบันทึกรูปภาพสินค้า ข้อมูลการรับ–ส่ง ตำแหน่งที่ตั้ง ระยะเวลาในการดำเนินงาน รวมถึงข้อมูลการติดต่อที่เกี่ยวข้องกับการให้บริการ ข้อมูลดังกล่าวจะถูกใช้เพื่อยืนยันรายการ ตรวจสอบคุณภาพ และป้องกันข้อพิพาทที่อาจเกิดขึ้น"
                 : "To maintain quality standards and safety, the system may record images of goods, delivery information, location, duration of operations, and contact details related to the service. This information will be used to confirm transactions, monitor quality, and prevent disputes."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">5. {language === 'th' ? 'นโยบายความเสียหายและการชดเชย' : 'Damage and Compensation Policy'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "Inกรณีที่เกิดความเสียหายหรือสูญหายอันเกิดจากกระบวนการดำเนินงานของ Rubjob บริษัทจะพิจารณาการชดเชยตามความเหมาะสมและเงื่อนไขที่กำหนด ทั้งนี้ บริษัทไม่รับผิดชอบต่อความเสียหายที่เกิดจากคุณสมบัติเฉพาะของสินค้า การเสื่อมสภาพตามธรรมชาติ คราบที่ไม่สามารถกำจัดได้ สีตก ผ้าหด ผ้าย้วย หรือความเสียหายที่เกิดจากข้อมูลที่ผู้ใช้งานไม่ได้แจ้งล่วงหน้า ผู้ใช้งานต้องแจ้งปัญหาภายใน 24 ชั่วโมงหลังได้รับสินค้า".replace("Inกรณี", "ในกรณี")
                 : "In the event of damage or loss caused by Rubjob's operations, the Company will consider compensation based on appropriateness and specified conditions. The Company is not responsible for damages caused by the unique characteristics of the goods, natural wear and tear, unremovable stains, color bleeding, shrinkage, stretching, or damages resulting from information not disclosed in advance. Users must report any issues within 24 hours of receiving the goods."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">6. {language === 'th' ? 'การใช้พาร์ทเนอร์และผู้ให้บริการภายนอก' : 'Use of Partners and Third-Party Service Providers'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "บริการบางส่วนอาจดำเนินการผ่านร้านค้า พาร์ทเนอร์ หรือผู้ให้บริการภายนอกที่ร่วมงานกับ Rubjob โดยบริษัทจะดำเนินการคัดเลือกตามมาตรฐานที่เหมาะสมเพื่อให้เกิดคุณภาพและความปลอดภัยในการให้บริการ"
                 : "Some services may be performed through merchants, partners, or third-party service providers collaborating with Rubjob. The Company will select them in accordance with appropriate standards to ensure service quality and safety."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">7. {language === 'th' ? 'การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล' : 'Collection and Use of Personal Data'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "Rubjob อาจเก็บรวบรวมข้อมูลที่จำเป็นต่อการให้บริการ เช่น ชื่อ เบอร์โทรศัพท์ ที่อยู่ ตำแหน่งที่ตั้ง ประวัติการใช้บริการ รูปภาพ ข้อมูลการชำระเงิน และข้อมูลอื่นที่เกี่ยวข้องกับการดำเนินงาน โดยข้อมูลดังกล่าวจะถูกใช้เพื่อดำเนินการให้บริการ ติดต่อประสานงาน ปรับปรุงคุณภาพบริการ วิเคราะห์การใช้งาน รวมถึงการส่งข่าวสาร โปรโมชั่น หรือสิทธิพิเศษตามที่ผู้ใช้งานยินยอม"
                 : "Rubjob may collect personal data necessary for providing services, such as name, phone number, address, location, service history, photos, payment information, and other operation-related data. Such data will be used to process services, coordinate, improve service quality, analyze usage, and send news, promotions, or special offers as consented by the user."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">8. {language === 'th' ? 'การเปิดเผยข้อมูลแก่บุคคลภายนอก' : 'Disclosure of Information to Third Parties'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "ข้อมูลบางส่วนอาจถูกเปิดเผยแก่ผู้ขับขี่ ร้านค้า พาร์ทเนอร์ ระบบชำระเงิน หรือผู้ให้บริการที่เกี่ยวข้องเท่าที่จำเป็นต่อการดำเนินงาน โดยบริษัทจะดำเนินการตามมาตรการรักษาความปลอดภัยและกฎหมายคุ้มครองข้อมูลส่วนบุคคลที่เกี่ยวข้อง"
                 : "Certain information may be disclosed to drivers, merchants, partners, payment systems, or related service providers as necessary for operations. The Company will act in compliance with safety measures and relevant personal data protection laws."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">9. {language === 'th' ? 'การใช้ตำแหน่งที่ตั้ง' : 'Use of Location Data'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "ระบบอาจเข้าถึงข้อมูลตำแหน่งที่ตั้งของผู้ใช้งานเพื่อคำนวณค่าบริการ ค้นหาผู้ให้บริการใกล้เคียง ติดตามสถานะงาน และเพิ่มประสิทธิภาพในการให้บริการ โดยข้อมูลตำแหน่งจะถูกใช้งานเฉพาะในส่วนที่เกี่ยวข้องกับการดำเนินงานเท่านั้น"
                 : "The system may access the user's location data to calculate service fees, find nearby service providers, track job status, and enhance service efficiency. Location data will be used solely for purposes related to operations."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">10. {language === 'th' ? 'สิทธิของผู้ใช้งาน' : 'User Rights'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "ผู้ใช้งานมีสิทธิในการเข้าถึง แก้ไข ถอนความยินยอม หรือขอลบข้อมูลส่วนบุคคลตามสิทธิที่กฎหมายกำหนด โดยสามารถติดต่อทีมงานผ่านช่องทางที่ระบุภายในแพลตฟอร์ม"
                 : "Users have the right to access, rectify, withdraw consent, or request the deletion of their personal data as prescribed by law, by contacting the team through the channels specified within the platform."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-800 mb-4">11. {language === 'th' ? 'การเปลี่ยนแปลงข้อกำหนด' : 'Amendments to Terms'}</h2>
              <p className="text-slate-600 leading-relaxed">
                {language === 'th' 
                 ? "บริษัทขอสงวนสิทธิ์ในการแก้ไข ปรับปรุง หรือเปลี่ยนแปลงข้อกำหนดและเงื่อนไขการใช้บริการได้ตามความเหมาะสม โดยการใช้งานอย่างต่อเนื่องหลังมีการเปลี่ยนแปลง ถือว่าผู้ใช้งานยอมรับข้อกำหนดฉบับล่าสุดของแพลตฟอร์ม"
                 : "The Company reserves the right to amend, update, or change the terms and conditions of service as appropriate. Continued use after changes are made constitutes acceptance of the latest terms of the platform."}
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
