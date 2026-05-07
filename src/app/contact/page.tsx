"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-6 text-left transition-colors ${isOpen ? 'text-primary' : 'text-slate-800 hover:text-primary'} group`}
      >
        <span className="font-bold text-lg pr-4">{question}</span>
        <svg className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400 group-hover:text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div 
        className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-slate-600 leading-relaxed text-sm">{answer}</p>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const { t, language } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-dvh bg-[#fafbfd] text-slate-800 font-sans overflow-x-hidden relative">
      {/* ─── Ambient Glowing Orbs ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply opacity-70 animate-pulse-gold" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-200/40 blur-[150px] mix-blend-multiply opacity-60" />
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
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              {t("landingContact.title")}
            </h1>
            <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto">
              {t("landingContact.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Column: Form & Channels */}
            <div className="space-y-12">
              
              {/* Send Message Form */}
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 md:p-10 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                 
                 <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                   <Icons.FileText className="text-primary" />
                   {language === 'th' ? 'ส่งข้อความหาเรา' : 'Send us a message'}
                 </h2>

                 {submitted ? (
                   <div className="py-12 text-center animate-fade-in">
                     <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                       ✓
                     </div>
                     <h3 className="text-2xl font-black text-slate-900 mb-2">
                       {language === 'th' ? 'ส่งข้อความสำเร็จ!' : 'Message Sent!'}
                     </h3>
                     <p className="text-slate-500 font-medium">
                       {language === 'th' ? 'เราได้รับข้อความของคุณแล้ว จะรีบติดต่อกลับโดยเร็วที่สุดครับ' : 'We received your message and will get back to you shortly.'}
                     </p>
                     <Button 
                       variant="outline" 
                       className="mt-8"
                       onClick={() => setSubmitted(false)}
                     >
                       {language === 'th' ? 'ส่งอีกข้อความ' : 'Send another message'}
                     </Button>
                   </div>
                 ) : (
                   <form onSubmit={handleSubmit} className="space-y-5">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                       <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'th' ? 'ชื่อของคุณ' : 'Your Name'}</label>
                         <input 
                           type="text" 
                           required
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                           placeholder={language === 'th' ? 'เช่น สมชาย สายเสมอ' : 'e.g. John Doe'}
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'th' ? 'อีเมลติดต่อ' : 'Email Address'}</label>
                         <input 
                           type="email" 
                           required
                           value={formData.email}
                           onChange={(e) => setFormData({...formData, email: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                           placeholder="your@email.com"
                         />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'th' ? 'หัวข้อเรื่อง' : 'Subject'}</label>
                       <input 
                         type="text" 
                         required
                         value={formData.subject}
                         onChange={(e) => setFormData({...formData, subject: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                         placeholder={language === 'th' ? 'ระบุหัวข้อที่ต้องการสอบถาม' : 'What is this regarding?'}
                       />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'th' ? 'รายละเอียด' : 'Message'}</label>
                       <textarea 
                         required
                         rows={5}
                         value={formData.message}
                         onChange={(e) => setFormData({...formData, message: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none"
                         placeholder={language === 'th' ? 'พิมพ์ข้อความที่ต้องการติดต่อ...' : 'Type your message here...'}
                       />
                     </div>
                     <Button 
                       type="submit" 
                       disabled={isSubmitting}
                       className="w-full py-5 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                     >
                       {isSubmitting ? (language === 'th' ? 'กำลังส่ง...' : 'Sending...') : (language === 'th' ? 'ส่งข้อความ' : 'Send Message')}
                     </Button>
                   </form>
                 )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {/* LINE Channel */}
                 <a href="https://line.me/R/ti/p/@rubjob" target="_blank" rel="noopener noreferrer" className="group p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
                  <div className="flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <Icons.Line size={48} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{t("landingContact.lineTitle")}</h3>
                    <p className="text-slate-400 text-xs">@rubjob</p>
                  </div>
                </a>

                {/* Facebook Channel */}
                 <a href="#" className="group p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
                  <div className="flex items-center justify-center group-hover:-rotate-12 transition-transform">
                    <Icons.Facebook size={48} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{t("landingContact.facebookTitle")}</h3>
                    <p className="text-slate-400 text-xs">Facebook Page</p>
                  </div>
                </a>
              </div>
            </div>
            
            {/* Right Column: FAQ */}
            <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 p-8 md:p-12 sticky top-32">
               <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-8 flex items-center gap-2">
                 <span className="w-8 h-px bg-primary" />
                 {t("landingContact.faqTitle")}
              </h2>
              <div className="divide-y divide-slate-50">
                <FAQItem question={t("landingContact.faq.q1")} answer={t("landingContact.faq.a1")} />
                <FAQItem question={t("landingContact.faq.q2")} answer={t("landingContact.faq.a2")} />
                <FAQItem question={t("landingContact.faq.q3")} answer={t("landingContact.faq.a3")} />
                <FAQItem 
                  question={language === 'th' ? "หากผ้าเสียหายต้องทำอย่างไร?" : "What if my clothes are damaged?"} 
                  answer={language === 'th' ? "Rubjob มีนโยบายรับประกันความเสียหายสูงสุดตามเงื่อนไขที่กำหนด คุณสามารถติดต่อแอดมินผ่าน LINE เพื่อแจ้งเรื่องเคลมได้ทันทีครับ" : "Rubjob has a damage insurance policy. You can contact our admin via LINE to file a claim immediately."} 
                />
                <FAQItem 
                  question={language === 'th' ? "มีค่าบริการซัก-อบ เท่าไหร่?" : "How much are the laundry fees?"} 
                  answer={language === 'th' ? "ราคาจะขึ้นอยู่กับขนาดเครื่องและแพ็คเกจที่เลือก โดยระบบจะแสดงราคาสุทธิให้ทราบก่อนกดสั่งซื้อทุกครั้งครับ" : "Prices depend on the machine size and selected package. The net price will be shown before you confirm your order."} 
                />
              </div>

              <div className="mt-12 p-8 rounded-[32px] bg-slate-900 text-white relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 <h4 className="text-xl font-black mb-2 relative z-10">{language === 'th' ? 'ยังสงสัยอยู่?' : 'Still have questions?'}</h4>
                 <p className="text-slate-400 text-sm mb-6 relative z-10">{language === 'th' ? 'ทักแชทคุยกับแอดมินได้ตลอด 24 ชม.' : 'Chat with our admin team anytime 24/7.'}</p>
                 <a href="https://line.me/R/ti/p/@rubjob" className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs hover:gap-4 transition-all relative z-10">
                   {language === 'th' ? 'ไปที่ LINE Official' : 'Go to LINE Official'}
                   <Icons.ArrowRight size={16} />
                 </a>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            © 2026 RUBJOB. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
