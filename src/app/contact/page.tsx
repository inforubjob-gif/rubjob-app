"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
            
            {/* Left: Contact Channels */}
            <div className="space-y-8">
              <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-6">
                 {t("landingContact.directChannels")}
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                {/* LINE Channel */}
                <a href="https://line.me/R/ti/p/@rubjob" target="_blank" rel="noopener noreferrer" className="group p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-[#00B900] text-white flex items-center justify-center text-4xl shadow-lg shadow-[#00B900]/20 group-hover:scale-110 transition-transform">
                    💬
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 mb-1">{t("landingContact.lineTitle")}</h3>
                    <p className="text-slate-500 text-sm">{t("landingContact.lineDesc")}</p>
                    <p className="text-[#00B900] font-bold text-sm mt-2">@rubjob</p>
                  </div>
                </a>

                {/* Facebook Channel */}
                <a href="#" className="group p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-4xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                    📘
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 mb-1">{t("landingContact.facebookTitle")}</h3>
                    <p className="text-slate-500 text-sm">{t("landingContact.facebookDesc")}</p>
                  </div>
                </a>
              </div>

              {/* Admin Portal Link */}
              {/* Admin Portal Link removed to decouple public website from app */}
            </div>

            {/* Right: FAQ */}
            <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 p-8 md:p-12">
               <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-8">
                 {t("landingContact.faqTitle")}
              </h2>
              <div className="divide-y divide-slate-50">
                <FAQItem question={t("landingContact.faq.q1")} answer={t("landingContact.faq.a1")} />
                <FAQItem question={t("landingContact.faq.q2")} answer={t("landingContact.faq.a2")} />
                <FAQItem question={t("landingContact.faq.q3")} answer={t("landingContact.faq.a3")} />
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center">
           <img 
              src="/images/rubjob-complete_Text-color.png" 
              alt="RUBJOB" 
              className="h-12 w-auto object-contain mb-4 opacity-50 grayscale" 
            />
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
            © 2026 RUBJOB. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
