"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { SUPPORT_FAQS, SUPPORT_TEMPLATES } from "@/lib/support-content";

export default function SupportPage() {
  const { t } = useTranslation();
  const faqs = SUPPORT_FAQS.customer;
  const templates = SUPPORT_TEMPLATES.customer;

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      <header className="relative z-10 px-5 pt-12 pb-8">
        <h1 className="text-3xl font-black text-white mb-2 drop-shadow-sm">{t("support.title")}</h1>
        <p className="text-white/90 text-sm font-semibold">{t("support.subtitle")}</p>
        
        {/* Search Bar */}
        <div className="mt-8 bg-white/20 backdrop-blur-md rounded-xl px-4 py-4 flex items-center gap-3 text-white border border-white/20 shadow-xl">
           <Icons.Search size={20} />
           <input 
                type="text" 
                placeholder="Search for help..."
                className="bg-transparent border-none p-0 text-sm placeholder:text-white/50 focus:ring-0 flex-1"
           />
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-8 pt-2 pb-24 animate-fade-in stagger">
        {/* Quick Contact */}
        <section className="grid grid-cols-2 gap-4">
            <Card className="p-5 flex flex-col items-center text-center gap-3" hoverable>
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <Icons.Line size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t("support.contactAdmin")}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase">LINE Official</p>
            </Card>
            <Card className="p-5 flex flex-col items-center text-center gap-3" hoverable>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icons.Phone size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Call Support</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase">24/7 Available</p>
            </Card>
        </section>

        {/* FAQs */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground">Templates</h2>
          </div>
          <div className="space-y-3">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{tpl.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tpl.subject}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(`Subject: ${tpl.subject}\n\n${tpl.message}`)}
                    className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary-dark"
                  >
                    {t("common.copy")}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground">Q&A</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i} className="p-5">
                <h3 className="text-sm font-black text-slate-800 mb-2 flex items-start gap-2">
                    <Icons.HelpCircle size={18} className="text-primary mt-0.5 shrink-0" />
                    {faq.q}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed pl-7">{faq.a}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="pb-8">
            <Card className="p-6 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/30 transition-colors" />
                <h3 className="text-lg font-black mb-3 relative z-10">Report a Problem</h3>
                <p className="text-xs text-slate-200 leading-relaxed mb-6 relative z-10">Having issues with your order or the app? Let us know and we&apos;ll fix it immediately.</p>
                <Button fullWidth className="bg-primary text-white border-none font-black text-xs uppercase relative z-10">
                    Open Support Ticket
                </Button>
            </Card>
        </section>
      </div>
    </div>
  );
}
