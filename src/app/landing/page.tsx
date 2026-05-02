"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";

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



const FEATURES = [
  { 
    icon: <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>, 
    title: "Wash & Iron", 
    desc: "การดูแลเสื้อผ้าที่ใส่ใจกว่าเดิม ด้วยระบบมาตรฐานที่เชื่อมต่อร้านซักในพื้นที่คุณ" 
  },
  { 
    icon: <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="15.5" cy="18.5" r="2.5"></circle><circle cx="5.5" cy="18.5" r="2.5"></circle><path d="M12 18H8m-2 0H3v-8h11l3-4h3l3 4v8h-2m-9 0V8"></path><line x1="1" y1="1" x2="23" y2="1" stroke="transparent"></line></svg>, 
    title: "Fast Delivery", 
    desc: "รับ-ส่งถึงที่ ด้วยไรเดอร์มืออาชีพ ประหยัดเวลา ไม่ต้องแบกตะกร้าซักไปเอง" 
  },
  { 
    icon: <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>, 
    title: "Live Tracking", 
    desc: "ติดตามสถานะการซักและตำแหน่งของไรเดอร์ได้แบบเรียลไทม์ผ่านขีดสุด" 
  },
  { 
    icon: <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>, 
    title: "LINE Integration", 
    desc: "ทำรายการ แชท และรับแจ้งเตือนได้ง่ายๆ ผ่าน LINE ของคุณ รวดเร็วตลอดเวลา" 
  },
  { 
    icon: <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>, 
    title: "Quality Insured", 
    desc: "คุ้มครองเสื้อผ้าทุกชิ้นด้วยความรอบคอบ หมดกังวลเรื่องผ้าสูญหาย" 
  },
  { 
    icon: <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>, 
    title: "Cashless Payment", 
    desc: "ทำธุรกรรมได้ปลอดภัย 100% เชื่อมต่อระบบชำระเงินดิจิทัลทันสมัย" 
  },
];

const STEPS = [
  { number: "01", title: "กดสั่งซัก", desc: "เข้าแอปผ่านไลน์ เลือกบริการที่ต้องการได้ทันที" },
  { number: "02", title: "ไรเดอร์ไปรับ", desc: "รอไรเดอร์มารับผ้าถึงหน้าบ้าน นำส่งไปร้านซัก" },
  { number: "03", title: "ตรวจเช็ค & ซัก", desc: "ร้านซักมืออาชีพดำเนินงาน คุณสามารถเช็กสถานะได้เสมอ" },
  { number: "04", title: "ส่งคืนสุดประทับใจ", desc: "รับผ้าที่หอมสะอาด กลับมาถึงมือคุณอย่างสมบูรณ์แบบ" },
];

const TESTIMONIALS = [
  {
    rating: 5,
    quote: "แค่มี LINE ก็หมดปัญหาเรื่องซักผ้า ประหยัดเวลาชีวิตไปได้เยอะมาก ๆ สะดวกสุด ๆ ค่า",
    author: "น้องฟ้า",
    role: "นิสิตมหาวิทยาลัย",
    iconColor: "bg-orange-100 text-orange-500",
    icon: "👩🏻",
  },
  {
    rating: 5,
    quote: "ไม่ต้องโหลดแอปเพิ่มให้เปลืองเมมฯ ระบบติดตามสถานะก็เป๊ะ ไรเดอร์มารับตรงเวลามาก",
    author: "คุณตั้ม",
    role: "พนักงานออฟฟิศ",
    iconColor: "bg-blue-100 text-blue-500",
    icon: "👨🏻‍💻",
  },
  {
    rating: 5,
    quote: "ผ้าหอมสะอาด แพ็คมาอย่างดี รู้สึกเหมือนมีคนช่วยจัดการชีวิตให้จริง ๆ ค่ะ วางใจได้เลย",
    author: "พี่แอน",
    role: "คุณแม่บ้าน",
    iconColor: "bg-emerald-100 text-emerald-500",
    icon: "👩🏻‍🍳",
  },
];

const FAQS = [
  {
    q: "ใช้งานแพลตฟอร์มนี้ต้องโหลดแอปพลิเคชันไหม?",
    a: "ไม่จำเป็นเลยครับ! คุณสามารถทำทุกอย่างตั้งแต่กดสั่งซัก เช็กสถานะ ไปจนถึงการชำระเงินผ่านทาง LINE ของเราได้ทั้งหมด ช่วยประหยัดพื้นที่ในโทรศัพท์ของคุณได้เต็มที่"
  },
  {
    q: "ราคาค่าบริการซักผ้าคิดอย่างไร?",
    a: "ราคาจะถูกคำนวณตามแพ็กเกจที่คุณเลือกและมาตรฐานของร้านซักในละแวกของคุณ โดยระบบจะแสดงราคาให้ทราบล่วงหน้าอย่างชัดเจนก่อนที่คุณจะกดยืนยันออเดอร์"
  },
  {
    q: "ใช้เวลาซักและจัดส่งนานเท่าไหร่?",
    a: "ระยะเวลาขึ้นอยู่กับประเภทบริการที่คุณเลือก โดยมีตั้งแต่แบบด่วนพิเศษ (เสร็จภายใน 24 ชม.) ไปจนถึงแบบปกติ คุณสามารถติดตามสถานะแบบเรียลไทม์ได้ตลอดจากใน LINE"
  },
  {
    q: "หากเสื้อผ้าเกิดความเสียหาย มีการรับประกันไหม?",
    a: "แน่นอนครับ RUBJOB มีนโยบายรับประกันความเสียหายและสูญหาย เพื่อให้คุณมั่นใจได้ว่าเสื้อผ้าทุกชิ้นจะได้รับการดูแลเป็นอย่างดีโดยพาร์ทเนอร์ร้านมืออาชีพของเรา"
  },
  {
    q: "จะเปลี่ยนที่อยู่รับ-ส่งผ้าต้องทำอย่างไร?",
    a: "คุณสามารถแก้ไขหรือเปลี่ยนที่อยู่ใหม่ผ่านหน้าจอระบบบัญชีส่วนตัวบน LINE ได้เลยในขั้นตอนก่อนที่จะกดยืนยันเรียกไรเดอร์เข้ารับผ้าครับ"
  },
  {
    q: "สามารถจ่ายเงินผ่านช่องทางไหนได้บ้าง?",
    a: "รองรับการชำระเงินดิจิทัลเต็มรูปแบบ ไม่ว่าจะเป็น PromptPay, บัตรเครดิต/เดบิต, หรือตัดผ่านระบบสะสมคะแนน สะดวกและปลอดภัย 100%"
  }
];

const CONTACTS = [
  {
    name: "Facebook",
    desc: "อัปเดตข่าวสารและโปรโมชัน",
    icon: "📘",
    bgClass: "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
  },
  {
    name: "LINE Official",
    desc: "ทักแชทสอบถาม แอดมินตอบไว",
    icon: "💬",
    bgClass: "bg-gradient-to-br from-[#00B900] to-[#009b00] text-white"
  },
  {
    name: "Call Center",
    desc: "ติดต่อแจ้งปัญหาฉุกเฉิน",
    icon: "📞",
    bgClass: "bg-gradient-to-br from-orange-400 to-primary text-white"
  }
];

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
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
        <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply opacity-70 animate-pulse-gold" />
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-200/40 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-orange-100/60 blur-[100px] mix-blend-multiply opacity-80" />
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
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#line-app" className="hover:text-primary transition-colors">Line App</a>
          </div>

          {/* App link removed as per request to decouple website from app */}
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 pt-36 pb-12 md:pt-48 md:pb-16 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left Text Column */}
          <div className="flex-1 text-center lg:text-left z-20">
            <div
              className={`inline-flex items-center gap-2 px-5 py-2 bg-primary/10 rounded-full text-primary-dark font-black text-sm uppercase tracking-widest border border-primary/20 mb-8 shadow-sm transition-all duration-700 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
              ผู้จัดการชีวิต — Life Operator 👌🏻
            </div>

            <h1
              className={`text-6xl lg:text-7xl xl:text-[88px] font-black leading-[1.05] tracking-tight text-slate-900 mb-6 transition-all duration-700 delay-100 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
               รับจบทุกเรื่อง
              <br />
              <span className="relative inline-block pb-2">
                แทนคุณ
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
               ไม่ต้องคิด ไม่ต้องกังวล บริการซักอบรีดที่เหมือนมีคนจัดการชีวิตแทนคุณ ปล่อยให้เป็นหน้าที่เรา
            </p>

            <div
              className={`flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 transition-all duration-700 delay-300 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <a href="#how-it-works" className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 group">
                  <img src="/images/mascot-peek.png" alt="" className="w-5 h-5 object-contain group-hover:-translate-y-1 transition-transform" />
                  ดูฟีเจอร์การใช้งาน
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
               <div className="absolute -top-10 -right-5 bg-white p-4 rounded-2xl shadow-xl z-30 flex items-center gap-3 border border-slate-100 transform rotate-6">
                  <div className="text-3xl bg-amber-50 rounded-xl p-2">🚚</div>
                  <div>
                     <p className="text-xs font-bold text-slate-800">ถึงหน้าบ้านคุณ</p>
                     <p className="text-[10px] text-slate-400">ไม่ต้องยกตะกร้าให้เหนื่อย</p>
                  </div>
               </div>
             </div>
           </div>

           {/* Section Right: Steps Details */}
           <div className="w-full lg:w-2/3">
             <div className="text-center lg:text-left mb-16">
               <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-3">How it works</h2>
               <h3 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">ไม่ต้องคิด ไม่ต้องกังวล<br/> เราจัดการให้</h3>
             </div>

             <div className="space-y-8 relative before:absolute before:inset-0 before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
               
               {STEPS.map((step, i) => (
                 <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                   <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-white bg-slate-50 text-slate-400 group-hover:text-primary group-hover:bg-primary-light group-hover:border-primary shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all duration-300 group-hover:scale-110 z-10 text-2xl font-black">
                     {step.number}
                   </div>
                   <div className="w-[calc(100%-6rem)] md:w-[calc(50%-4rem)] p-6 rounded-3xl bg-white border border-slate-100 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
                     <h4 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h4>
                     <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
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
              <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-3">Core Features</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">ความมืออาชีพ<br/>ที่คุณวางใจได้</h3>
              <p className="text-slate-500 text-lg">รวบรวมเทคโนโลยีและการจัดการที่ดีที่สุดไว้เพื่อยกระดับวงการซักรีด ปลอดภัยและทันสมัยที่สุด</p>
            </div>
            
            {/* Mascot Decorating Features */}
            <div className="hidden lg:block relative w-[250px] animate-float right-0 bottom-0 z-20">
              <img 
                 src="/images/mascot-hanging.png" 
                 alt="Rubjob Mascot Hanging Clothes" 
                 className="w-full h-auto object-contain drop-shadow-xl"
               />
               <div className="absolute top-10 -left-10 bg-white p-3 rounded-xl shadow-xl border border-slate-100 transform -rotate-6">
                 <p className="text-xs font-bold text-primary">ดูแลอย่างทะนุถนอม ✨</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary text-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-3">{f.title}</h4>
                <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
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
              Testimonials
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-tight">
              ความไว้วางใจจาก<br/>
              <span className="text-primary">ผู้ใช้จริงของเรา</span>
            </h2>
            
            <p className="text-slate-500 text-lg mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              RUBJOB เปลี่ยนเรื่องซักผ้าที่ยุ่งยากให้กลายเป็นเรื่องง่าย สะดวก รวดเร็ว และไม่ต้องกังวลเรื่องเวลาอีกต่อไป พิสูจน์แล้วจากผู้ใช้งานจริง
            </p>

            <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center justify-center lg:justify-start gap-8 sm:gap-16">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center text-3xl">
                  🚚
                </div>
                <div>
                  <h4 className="text-3xl font-black text-primary">10k+</h4>
                  <p className="text-sm font-bold text-slate-400 mt-1">ออเดอร์จัดส่งแล้ว</p>
                </div>
              </div>
              
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center text-3xl">
                  ⭐️
                </div>
                <div>
                  <h4 className="text-3xl font-black text-blue-500">4.9/5</h4>
                  <p className="text-sm font-bold text-slate-400 mt-1">คะแนนความพึงพอใจ</p>
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
              Frequently Asked Question
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              ข้อสงสัย <span className="text-primary">ที่พบบ่อย?</span>
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00B900] text-white text-3xl shadow-xl shadow-[#00B900]/30 mb-6">
                💬
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                ใช้งานผ่าน <span className="text-[#00B900]">LINE</span><br/>ไม่ต้องโหลดแอปให้เปลืองพื้นที่
              </h2>
              <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                เพราะความจริงแล้ว <span className="font-bold text-slate-900">RUBJOB</span> คือระบบ Life Operator ที่เตรียมให้บริการคุณหลากหลายด้านมากกว่าแค่เรื่องซักผ้า และทุกอย่างอัดแน่นรวมอยู่ใน LINE แชทที่คุณคุ้นเคย 
                <br/><br/>
                <span className="text-primary font-bold">รับจบทุกเรื่องแทนคุณของจริง! 👌🏻</span>
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
                 <p className="text-sm font-bold text-slate-800">ไม่ต้องโหลดแอป 🚫📲</p>
               </div>
               <div className="absolute bottom-[10%] left-[-10%] bg-white p-4 rounded-xl shadow-xl border border-slate-100 transform -rotate-3 animate-float z-30">
                 <p className="text-sm font-bold text-[#00B900]">มีแค่ LINE ก็พอ 💬✅</p>
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
              Empowering Partners
            </div>
            <h3 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
               ร่วมขับเคลื่อนอนาคต<br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-primary-dark">ไปกับ RUBJOB</span>
            </h3>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
               เปิดโอกาสการสร้างรายได้ที่ไร้ขีดจำกัด ไม่ว่าคุณจะเป็นร้านค้ามืออาชีพ หรือไรเดอร์ที่ต้องการอิสระ เรามีระบบที่พร้อมซัพพอร์ตคุณในทุกก้าว
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
                       Store & Provider
                    </div>
                  </div>
                  
                  <h4 className="text-4xl font-black text-slate-900 mb-6 group-hover:text-primary transition-colors">สำหรับร้านค้า<br/>และมืออาชีพ</h4>
                  <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                    เปลี่ยนธุรกิจของคุณให้เป็นระบบดิจิทัล 100% เพิ่มฐานลูกค้าในพื้นที่ และจัดการทุกอย่างผ่านระบบหลังบ้านที่ทรงพลังที่สุด
                  </p>
                  
                  <div className="space-y-5 mb-14 flex-1">
                    {[
                      { icon: <Icons.CheckCircle className="text-primary" />, text: "เพิ่มฐานลูกค้าและออเดอร์จาก LINE" },
                      { icon: <Icons.CheckCircle className="text-primary" />, text: "ระบบจัดการรายรับและถอนเงินรายวัน" },
                      { icon: <Icons.CheckCircle className="text-primary" />, text: "เครื่องมือวิเคราะห์ยอดขายและคูปอง" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 text-slate-600 font-bold group-hover:translate-x-1 transition-transform">
                         <div className="w-6 h-6 shrink-0">{item.icon}</div>
                         <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <a 
                    href="/landing/register/partner"
                    className="w-full py-6 bg-slate-900 text-white font-black text-center text-lg rounded-2xl hover:bg-primary transition-all duration-300 shadow-2xl shadow-slate-900/10 active:scale-[0.98] relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 uppercase tracking-widest">สมัครเป็นพาร์ทเนอร์</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </a>
               </Card>
            </div>

            {/* For Riders Card */}
            <div className="group relative">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl -z-10 rounded-[48px]" />
               <Card className="h-full p-10 md:p-14 bg-white border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] rounded-[48px] overflow-hidden flex flex-col transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_48px_80px_-16px_rgba(59,130,246,0.15)] group-hover:border-blue-500/20">
                  <div className="flex items-start justify-between mb-12">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                       <Icons.Bike size={40} strokeWidth={2.5} />
                    </div>
                    <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-black text-blue-500 uppercase tracking-[0.1em] h-fit">
                       Delivery Hero
                    </div>
                  </div>
                  
                  <h4 className="text-4xl font-black text-slate-900 mb-6 group-hover:text-blue-600 transition-colors">สำหรับไรเดอร์<br/>ฮีโร่รับ-ส่ง</h4>
                  <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                    รับงานอิสระ รายได้ดี มีงานต่อเนื่องในพื้นที่ที่คุณคุ้นเคย พร้อมระบบนำทางที่แม่นยำและโบนัสพิเศษ
                  </p>
                  
                  <div className="space-y-5 mb-14 flex-1">
                    {[
                      { icon: <Icons.CheckCircle className="text-blue-500" />, text: "ค่ารอบที่เป็นธรรมและโบนัส Surge" },
                      { icon: <Icons.CheckCircle className="text-blue-500" />, text: "ประกันอุบัติเหตุและความคุ้มครอง" },
                      { icon: <Icons.CheckCircle className="text-blue-500" />, text: "อิสระในการเลือกเวลาทำงานเอง" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 text-slate-600 font-bold group-hover:translate-x-1 transition-transform">
                         <div className="w-6 h-6 shrink-0">{item.icon}</div>
                         <span className="text-sm">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <a 
                    href="/landing/register/rider"
                    className="w-full py-6 bg-slate-900 text-white font-black text-center text-lg rounded-2xl hover:bg-blue-600 transition-all duration-300 shadow-2xl shadow-slate-900/10 active:scale-[0.98] relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 uppercase tracking-widest">สมัครเป็นไรเดอร์</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </a>
               </Card>
            </div>

          </div>
        </div>

        {/* Decorative Floating Elements */}
        <div className="absolute top-1/2 left-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse-delayed" />
      </section>

      {/* ─── Contact Channels ─── */}
      <section className="relative z-10 py-32 bg-[#fafbfd] overflow-hidden border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <div className="inline-block px-5 py-2 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-full mb-8">
            Connect with us
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-20 leading-tight">
            เราพร้อมให้ <span className="text-primary">คำปรึกษา</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CONTACTS.map((contact, i) => (
              <div key={i} className="group bg-white p-10 rounded-[40px] shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-50 flex flex-col items-center">
                <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center text-3xl shadow-xl mb-8 group-hover:scale-110 transition-transform ${contact.bgClass}`}>
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
      <footer className="relative z-10 border-t border-slate-200 bg-white pt-16 pb-6">
        
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
            ผู้จัดการชีวิต (Life Operator) 👋🏼
          </p>

          <div className="w-full border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>© 2026 RUBJOB. All rights reserved.</span>
            <div className="flex items-center gap-4 sm:gap-6">
              <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="/contact" className="hover:text-primary transition-colors">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
