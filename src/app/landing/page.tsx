"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { Icons, IconCircle } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import Link from "next/link";

/** Resolve the app subdomain URL dynamically based on current hostname */
function getPortalUrl(subdomain: string): string {
  if (typeof window === "undefined") return "#";
  const host = window.location.host;
  const protocol = window.location.protocol;

  // Known root domains
  const roots = ["rubjob-all.com", "rubjob.com", "rubjob-app.pages.dev", "lvh.me", "localhost"];
  for (const root of roots) {
    if (host.includes(root)) {
      const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
      return `${protocol}//${subdomain}.${root}${port}`;
    }
  }
  // Fallback: just use path-based routing
  return `/${subdomain === "app" ? "" : subdomain}`;
}




function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-6 px-1 text-left transition-colors ${isOpen ? 'text-primary' : 'text-slate-800 hover:text-primary'} group`}
      >
        <span className="font-bold text-lg pr-4">{question}</span>
        <svg className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400 group-hover:text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div 
        className={`bg-primary/5 px-6 rounded-b-xl transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96 py-5 opacity-100 mb-4' : 'max-h-0 py-0 opacity-0 mb-0'}`}
      >
        <p className="text-slate-600 leading-relaxed text-sm">{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const FEATURES = [
    { 
      icon: <IconCircle variant="orange" size="lg"><Icons.Relax size={32} strokeWidth={2.5} /></IconCircle>, 
      title: t("landing.features.list.relax.title"), 
      titleColor: "text-primary",
      desc: t("landing.features.list.relax.desc") 
    },
    { 
      icon: <IconCircle variant="yellow" size="lg"><Icons.Smile size={32} strokeWidth={2.5} /></IconCircle>, 
      title: t("landing.features.list.happy.title"), 
      titleColor: "text-secondary",
      desc: t("landing.features.list.happy.desc") 
    },
    { 
      icon: <IconCircle variant="white" size="lg"><Icons.Settings size={32} strokeWidth={2.5} /></IconCircle>, 
      title: t("landing.features.list.custom.title"), 
      titleColor: "text-slate-800",
      desc: t("landing.features.list.custom.desc") 
    },
    { 
      icon: <IconCircle variant="black" size="lg"><Icons.HeartHand size={32} strokeWidth={2.5} /></IconCircle>, 
      title: t("landing.features.list.trust.title"), 
      titleColor: "text-slate-900",
      desc: t("landing.features.list.trust.desc") 
    },
    { 
      icon: <IconCircle variant="orange" size="lg"><Icons.Lightbulb size={32} strokeWidth={2.5} /></IconCircle>, 
      title: t("landing.features.list.smart.title"), 
      titleColor: "text-primary",
      desc: t("landing.features.list.smart.desc") 
    },
    { 
      icon: <IconCircle variant="yellow" size="lg"><Icons.Check size={32} strokeWidth={3} /></IconCircle>, 
      title: t("landing.features.list.perfect.title"), 
      titleColor: "text-secondary",
      desc: t("landing.features.list.perfect.desc") 
    },
  ];

  const STEPS = [
    { number: "01", title: t("landing.howItWorks.steps.step1.title"), desc: t("landing.howItWorks.steps.step1.desc") },
    { number: "02", title: t("landing.howItWorks.steps.step2.title"), desc: t("landing.howItWorks.steps.step2.desc") },
    { number: "03", title: t("landing.howItWorks.steps.step3.title"), desc: t("landing.howItWorks.steps.step3.desc") },
    { number: "04", title: t("landing.howItWorks.steps.step4.title"), desc: t("landing.howItWorks.steps.step4.desc") },
  ];

  const TESTIMONIALS = [
    {
      rating: 5,
      quote: t("landing.testimonials.list.fah.quote"),
      author: t("landing.testimonials.list.fah.author"),
      role: t("landing.testimonials.list.fah.role"),
      iconColor: "bg-orange-100 text-orange-500",
      icon: "👩🏻",
    },
    {
      rating: 5,
      quote: t("landing.testimonials.list.tum.quote"),
      author: t("landing.testimonials.list.tum.author"),
      role: t("landing.testimonials.list.tum.role"),
      iconColor: "bg-blue-100 text-blue-500",
      icon: "👨🏻‍💻",
    },
    {
      rating: 5,
      quote: t("landing.testimonials.list.ann.quote"),
      author: t("landing.testimonials.list.ann.author"),
      role: t("landing.testimonials.list.ann.role"),
      iconColor: "bg-emerald-100 text-emerald-500",
      icon: "👩🏻‍🍳",
    },
  ];

  const FAQS = [
    { q: t("landing.faq.list.q1.q"), a: t("landing.faq.list.q1.a") },
    { q: t("landing.faq.list.q2.q"), a: t("landing.faq.list.q2.a") },
    { q: t("landing.faq.list.q3.q"), a: t("landing.faq.list.q3.a") },
    { q: t("landing.faq.list.q4.q"), a: t("landing.faq.list.q4.a") },
    { q: t("landing.faq.list.q5.q"), a: t("landing.faq.list.q5.a") },
    { q: t("landing.faq.list.q6.q"), a: t("landing.faq.list.q6.a") },
  ];

  const CONTACTS = [
    {
      name: t("landing.contact.list.facebook.name"),
      desc: t("landing.contact.list.facebook.desc"),
      icon: <Icons.Facebook size={64} />,
      bgClass: ""
    },
    {
      name: t("landing.contact.list.line.name"),
      desc: t("landing.contact.list.line.desc"),
      icon: <Icons.Line size={64} />,
      bgClass: ""
    }
  ];

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-[#fafbfd] text-slate-800 font-sans overflow-x-hidden relative">
      {/* ─── Ambient Glowing Orbs (Light Theme Adaptation) ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] rounded-full bg-primary/20 blur-[120px] mix-blend-multiply opacity-70 animate-pulse-gold" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[100px] mix-blend-multiply opacity-80" />
      </div>

      {/* ─── Navigation ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/images/rubjob-complete_Vertical-text-color.png" 
              alt="RUBJOB" 
              className="h-20 md:h-[100px] w-auto object-contain scale-110 md:scale-[1.3] origin-left" 
            />
          </div>
          
          <div className="hidden md:flex items-center gap-10 text-sm font-bold text-slate-600">
            <a href="#how-it-works" className="hover:text-primary relative group py-2">
              {t("landing.nav.howItWorks")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#features" className="hover:text-primary relative group py-2">
              {t("landing.nav.features")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#line-app" className="hover:text-primary relative group py-2">
              {t("landing.nav.lineApp")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          </div>

          {/* App link removed as per request to decouple website from app */}
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 pt-36 pb-12 md:pt-48 md:pb-16 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left Text Column */}
          <div className="flex-1 text-center lg:text-left z-20">


            <h1
              className={`text-6xl lg:text-7xl xl:text-[88px] font-black leading-[1.05] tracking-tight text-slate-900 mb-6 transition-all duration-700 delay-100 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
               {t("landing.hero.title")}
              <br />
              <span className="relative inline-block pb-2">
                {t("landing.hero.titleSub")}
                <svg className="absolute w-full h-5 left-0 -bottom-2 text-amber-300" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 0" stroke="currentColor" strokeWidth="4" fill="transparent" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p
              className={`text-xl md:text-2xl text-slate-500 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium transition-all duration-700 delay-200 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
               {t("landing.hero.subtitle")}
            </p>

            <div
              className={`flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 transition-all duration-700 delay-300 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <a href="#how-it-works" className="px-10 py-5 bg-primary hover:bg-primary-dark text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <img src="/images/mascot-peek.png" alt="" className="w-6 h-6 object-contain group-hover:-translate-y-1 transition-transform relative z-10" />
                  <span className="relative z-10 uppercase tracking-widest">{t("landing.hero.cta")}</span>
                </a>
            </div>
          </div>

          {/* Right Floating Mascot Centerpiece */}
          <div className="flex-1 relative w-full h-[350px] lg:h-[450px] flex items-center justify-center -z-0">
             
             {/* Mascot Floating Image */}
             <div className="relative w-full max-w-[400px] h-full animate-float z-20 flex items-center justify-center">
               <img 
                 src="/images/mascot-ready.png" 
                 alt="Rubjob Mascot Ready" 
                 className="w-full h-auto object-contain filter drop-shadow-2xl"
               />
             </div>

             {/* Ambient abstract background blobs behind the mascot */}
             <div className="absolute top-[50%] right-[10%] w-32 h-32 bg-amber-500/20 rounded-full blur-3xl z-10" />
             <div className="absolute bottom-[20%] left-[20%] w-48 h-48 bg-primary/30 rounded-full blur-3xl z-10 animate-pulse-gold" />

          </div>
        </div>
      </section>

      {/* ─── Line Integration Highlight ─── */}
      <section id="line-app" className="relative z-10 py-24 bg-[#00B900]/5 overflow-hidden border-t border-[#00B900]/10">
        
        {/* Abstract Pattern background */}
        <div className="absolute right-0 top-0 w-[40vw] h-[40vw] bg-[#00B900]/10 rounded-bl-full -z-10" />

        {/* Mascot 13 (Peeking) reused here playfully */}
        <div className="absolute top-1/2 -left-12 transform -translate-y-1/2 w-48 opacity-100 pointer-events-none hidden lg:block z-10">
           <img src="/images/mascot-wink.png" alt="Mascot Deco" className="w-full h-auto drop-shadow-xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-30">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center justify-center mb-6">
                <Icons.Line size={64} />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                {t("landing.line.title")} <span className="text-[#00B900]">{t("landing.line.titleSub")}</span>
              </h2>
              <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                {t("landing.line.desc")} 
                <br/><br/>
                <span className="text-primary font-bold">{t("landing.line.footer")}</span>
              </p>
              
              {/* App link removed per request */}
            </div>

            {/* Mascot Showcase Right */}
            <div className="flex-1 relative w-full max-w-sm mx-auto flex items-center justify-center py-10">
               {/* Confident Mascot */}
               <div className="relative w-48 lg:w-64 animate-float z-20">
                  <img src="/images/mascot-jump.png" alt="Mascot Confident" className="w-full h-auto drop-shadow-2xl" />
               </div>
               {/* Floating elements behind */}
               <div className="absolute top-[20%] right-0 bg-white p-4 rounded-xl shadow-xl border border-slate-100 transform rotate-6 animate-float-delayed z-30">
                 <p className="text-sm font-bold text-slate-800">{t("landing.line.hintApp")}</p>
               </div>
               <div className="absolute bottom-[10%] left-[-10%] bg-white p-4 rounded-xl shadow-xl border border-slate-100 transform -rotate-3 animate-float z-30">
                 <p className="text-sm font-bold text-[#00B900]">{t("landing.line.hintLine")}</p>
               </div>
               <div className="absolute inset-0 bg-[#00B900]/20 rounded-full blur-3xl z-10 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Premium Partnership Section 🚀 ─── */}
      <section id="partnership" className="relative z-10 py-32 md:py-48 overflow-hidden bg-white">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -mr-96 -mt-96" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] -ml-48 -mb-48" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20 md:mb-28">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-xl shadow-slate-900/20">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              {t("landing.partnership.badge")}
            </div>
            <h3 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
               {t("landing.partnership.title")}<br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-primary-dark">{t("landing.partnership.titleSub")}</span>
            </h3>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
               {t("landing.partnership.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            
            {/* For Stores & Providers Card */}
            <div className="group relative">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl -z-10 rounded-[48px]" />
               <Card className="h-full p-10 md:p-14 bg-white border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] rounded-[48px] overflow-hidden flex flex-col transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_48px_80px_-16px_rgba(255,165,0,0.15)] group-hover:border-primary/20">
                  <div className="flex items-start justify-between mb-12">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-primary to-orange-500 text-white flex items-center justify-center shadow-2xl shadow-primary/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                       <Icons.Store size={40} strokeWidth={2.5} />
                    </div>
                    <div className="px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-black text-primary uppercase tracking-[0.1em] h-fit">
                       {t("landing.partnership.partner.badge")}
                    </div>
                  </div>
                  
                  <h4 className="text-4xl font-black text-slate-900 mb-6 group-hover:text-primary transition-colors">{t("landing.partnership.partner.title")}</h4>
                  <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                    {t("landing.partnership.partner.desc")}
                  </p>
                  
                  <div className="space-y-5 mb-14 flex-1">
                    {[
                      { icon: <Icons.CheckCircle className="text-primary" />, text: t("landing.partnership.partner.list.item1") },
                      { icon: <Icons.CheckCircle className="text-primary" />, text: t("landing.partnership.partner.list.item2") },
                      { icon: <Icons.CheckCircle className="text-primary" />, text: t("landing.partnership.partner.list.item3") }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 text-slate-600 font-bold group-hover:translate-x-1 transition-transform">
                         <div className="w-6 h-6 shrink-0">{item.icon}</div>
                         <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>

                   <Link 
                    href="/register/partner"
                    className="w-full py-6 bg-slate-900 text-white font-black text-center text-lg rounded-2xl hover:bg-primary transition-all duration-300 shadow-2xl shadow-slate-900/10 active:scale-[0.98] relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 uppercase tracking-widest">{t("landing.partnership.partner.cta")}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </Link>
               </Card>
            </div>

            {/* For Rubbers Card */}
            <div className="group relative">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl -z-10 rounded-[48px]" />
               <Card className="h-full p-10 md:p-14 bg-white border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] rounded-[48px] overflow-hidden flex flex-col transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_48px_80px_-16px_rgba(59,130,246,0.15)] group-hover:border-blue-500/20">
                  <div className="flex items-start justify-between mb-12">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                       <Icons.Bike size={40} strokeWidth={2.5} />
                    </div>
                    <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-black text-blue-500 uppercase tracking-[0.1em] h-fit">
                       {t("landing.partnership.rubber.badge")}
                    </div>
                  </div>
                  
                  <h4 className="text-4xl font-black text-slate-900 mb-6 group-hover:text-blue-600 transition-colors">{t("landing.partnership.rubber.title")}</h4>
                  <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                    {t("landing.partnership.rubber.desc")}
                  </p>
                  
                  <div className="space-y-5 mb-14 flex-1">
                    {[
                      { icon: <Icons.CheckCircle className="text-blue-500" />, text: t("landing.partnership.rubber.list.item1") },
                      { icon: <Icons.CheckCircle className="text-blue-500" />, text: t("landing.partnership.rubber.list.item2") },
                      { icon: <Icons.CheckCircle className="text-blue-500" />, text: t("landing.partnership.rubber.list.item3") }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 text-slate-600 font-bold group-hover:translate-x-1 transition-transform">
                         <div className="w-6 h-6 shrink-0">{item.icon}</div>
                         <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>

                   <Link 
                    href="/register/rubber"
                    className="w-full py-6 bg-slate-900 text-white font-black text-center text-lg rounded-2xl hover:bg-blue-600 transition-all duration-300 shadow-2xl shadow-slate-900/10 active:scale-[0.98] relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 uppercase tracking-widest">{t("landing.partnership.rubber.cta")}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </Link>
               </Card>
            </div>

          </div>
        </div>

        {/* Decorative Floating Elements */}
        <div className="absolute top-1/2 left-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse-delayed" />
      </section>

      {/* ─── How it Works ─── */}
      <section id="how-it-works" className="relative z-10 py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-16">
          
           {/* Section Left: Floating Mascot */}
           <div className="w-full lg:w-1/3 flex justify-center lg:justify-start">
             <div className="relative w-[350px] animate-float-delayed">
               <img 
                 src="/images/mascot-knock.png" 
                 alt="Rubjob Mascot Door to Door" 
                 className="w-full h-auto object-contain drop-shadow-2xl"
               />
               {/* Hovering widget */}
                <div className="absolute -top-10 -right-5 bg-white p-4 rounded-2xl shadow-xl z-30 flex items-center gap-3 border border-slate-100 transform rotate-6 hover:rotate-0 transition-transform duration-500">
                  <div className="text-3xl bg-primary/10 rounded-xl p-2 animate-bounce">🚚</div>
                  <div>
                     <p className="text-xs font-black text-slate-800">{t("landing.howItWorks.widgetTitle")}</p>
                     <p className="text-[10px] text-primary font-bold">{t("landing.howItWorks.widgetDesc")}</p>
                  </div>
                </div>
             </div>
           </div>

           {/* Section Right: Steps Details */}
           <div className="w-full lg:w-2/3">
              <div className="text-center lg:text-left mb-16">
                <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-3">{t("landing.howItWorks.badge")}</h2>
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">{t("landing.howItWorks.title")}<br/> {t("landing.howItWorks.titleSub")}</h3>
              </div>

             <div className="space-y-12 relative before:absolute before:inset-0 before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-transparent before:via-primary/30 before:to-transparent">
               
               {STEPS.map((step, i) => (
                 <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                   <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-white bg-primary/10 text-primary group-hover:text-white group-hover:bg-primary shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all duration-500 group-hover:scale-125 group-hover:shadow-primary/30 z-10 text-3xl font-black">
                     {step.number}
                   </div>
                   <div className="w-[calc(100%-6rem)] md:w-[calc(50%-4rem)] p-8 rounded-3xl bg-white border border-slate-100 shadow-sm group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500 group-hover:-translate-y-2 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1.5 h-0 bg-primary transition-all duration-500 group-hover:h-full" />
                     <h4 className="text-2xl font-black text-slate-800 mb-3 group-hover:text-primary transition-colors">{step.title}</h4>
                     <p className="text-slate-500 text-base leading-relaxed font-medium">{step.desc}</p>
                   </div>
                 </div>
               ))}
               
             </div>
           </div>

           {/* Standing Mascot 9 */}
           <div className="hidden lg:block absolute bottom-10 right-[5%] w-40 animate-float-delayed z-20">
             <img src="/images/mascot-peek.png" alt="Mascot Setup" className="w-full h-auto drop-shadow-xl" />
           </div>

        </div>
      </section>

      {/* ─── Premium Features ─── */}
      <section id="features" className="relative z-10 py-32 bg-[#fafbfd]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          <div className="flex flex-col lg:flex-row items-end justify-between gap-8 mb-16 relative">
            <div className="max-w-2xl">
              <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-3">{t("landing.features.badge")}</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">{t("landing.features.title")}<br/>{t("landing.features.titleSub")}</h3>
              <p className="text-slate-500 text-lg">{t("landing.features.subtitle")}</p>
            </div>
            
            {/* Mascot Decorating Features */}
            <div className="hidden lg:block relative w-[250px] animate-float right-0 bottom-0 z-20">
              <img 
                 src="/images/mascot-hanging.png" 
                 alt="Rubjob Mascot Hanging Clothes" 
                 className="w-full h-auto object-contain drop-shadow-xl"
               />
                <div className="absolute top-10 -left-10 bg-white p-3 rounded-xl shadow-xl border border-slate-100 transform -rotate-6">
                  <p className="text-xs font-bold text-primary">{t("landing.features.mascotHint")}</p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-8 bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center lg:items-start lg:text-left"
              >
                <div className="mb-8 group-hover:scale-110 transition-transform duration-500">
                  {f.icon}
                </div>
                <h4 className={`text-2xl font-black mb-4 transition-colors ${f.titleColor || 'text-slate-800'}`}>{f.title}</h4>
                <p className="text-slate-500 leading-relaxed text-sm font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="relative z-10 py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Left Text & Stats */}
          <div className="flex-1 text-center lg:text-left z-20">
            <div className="inline-block px-4 py-1.5 bg-primary/10 text-primary-dark font-black text-xs uppercase tracking-widest rounded-full mb-6">
              {t("landing.testimonials.badge")}
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-tight">
              {t("landing.testimonials.title")}<br/>
              <span className="text-primary">{t("landing.testimonials.titleSub")}</span>
            </h2>
            
            <p className="text-slate-500 text-lg mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              {t("landing.testimonials.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center justify-center lg:justify-start gap-8 sm:gap-16">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center text-3xl">
                  🚚
                </div>
                <div>
                  <h4 className="text-3xl font-black text-primary">10k+</h4>
                  <p className="text-sm font-bold text-slate-400 mt-1">{t("landing.testimonials.stats.orders")}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center text-3xl">
                  ⭐️
                </div>
                <div>
                  <h4 className="text-3xl font-black text-blue-500">4.9/5</h4>
                  <p className="text-sm font-bold text-slate-400 mt-1">{t("landing.testimonials.stats.rating")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Floating Cards */}
          <div className="flex-1 relative w-full lg:min-h-[500px] flex flex-col gap-6 items-center lg:items-end">
            
            {/* Ambient Background pattern for cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-slate-100/50 via-white to-white -z-10 rounded-full" />
            
            {TESTIMONIALS.map((review, i) => (
              <div 
                key={i} 
                className={`w-full max-w-md bg-white p-6 sm:p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-50 hover:-translate-y-1 transition-transform relative z-10 
                  ${i === 0 ? "lg:mr-10" : i === 1 ? "lg:mr-0 z-20 shadow-2xl shadow-primary/10" : "lg:mr-20"}
                `}
              >
                <div className="flex items-start gap-6">
                  {/* User Icon */}
                  <div className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-3xl ${review.iconColor}`}>
                    {review.icon}
                  </div>
                  
                  {/* Review Content */}
                  <div>
                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(review.rating)].map((_, starIdx) => (
                        <svg key={starIdx} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    
                    {/* Quote */}
                    <p className="text-slate-700 font-bold mb-4 leading-relaxed">
                      "{review.quote}"
                    </p>
                    
                    {/* Author Context */}
                    <p className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {review.author} <span className="text-slate-400 font-normal">/ {review.role}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section className="relative z-10 py-24 bg-white border-t border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 bg-primary/10 text-primary-dark font-black text-xs uppercase tracking-widest rounded-full mb-6">
              {t("landing.faq.badge")}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              {t("landing.faq.title")} <span className="text-primary">{t("landing.faq.titleSub")}</span>
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-12 lg:gap-20">
            {/* Left Column FAQs */}
            <div className="flex-1 flex flex-col">
              {FAQS.slice(0, Math.ceil(FAQS.length / 2)).map((faq, i) => (
                <FAQItem key={`left-${i}`} question={faq.q} answer={faq.a} />
              ))}
            </div>
            
            {/* Right Column FAQs */}
            <div className="flex-1 flex flex-col">
              {FAQS.slice(Math.ceil(FAQS.length / 2)).map((faq, i) => (
                <FAQItem key={`right-${i}`} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>

        </div>
      </section>





      {/* ─── Contact Channels ─── */}
      <section className="relative z-10 py-32 bg-[#fafbfd] overflow-hidden border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <div className="inline-block px-5 py-2 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-full mb-8">
            {t("landing.contact.badge")}
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-20 leading-tight">
            {t("landing.contact.title")} <span className="text-primary">{t("landing.contact.titleSub")}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {CONTACTS.map((contact, i) => (
              <div key={i} className="group bg-white p-10 rounded-[40px] shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-50 flex flex-col items-center">
                <div className={`flex items-center justify-center mb-8 group-hover:scale-110 transition-transform ${contact.bgClass || ""}`}>
                  {contact.icon}
                </div>
                <h4 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors mb-2">{contact.name}</h4>
                <p className="text-slate-400 font-bold text-sm">{contact.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t-4 border-primary bg-white pt-16 pb-6">
        
        {/* Chilling Mascot 10 */}
        <div className="absolute -top-[70px] left-1/2 transform -translate-x-1/2 sm:translate-x-0 sm:right-[15%] sm:left-auto w-28 animate-float z-20">
           <img src="/images/mascot-chill.png" alt="Mascot Resting" className="w-full h-auto drop-shadow-lg" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center relative z-30">
          <img 
            src="/images/rubjob-complete_Vertical-text-color.png" 
            alt="RUBJOB" 
            className="h-24 md:h-[120px] w-auto object-contain mb-4 transform scale-125" 
          />
          <p className="text-slate-500 max-w-sm mx-auto text-sm mb-6">
            {t("landing.footer.motto")}
          </p>

          <div className="w-full border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>© 2026 RUBJOB. All rights reserved.</span>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/privacy" className="hover:text-primary transition-colors">{t("landing.footer.privacy")}</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">{t("landing.footer.terms")}</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">{t("landing.footer.support")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
