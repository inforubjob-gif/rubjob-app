"use client";

import { useEffect, useState } from "react";

/** Resolve the app subdomain URL dynamically based on current hostname */
function getPortalUrl(subdomain: string): string {
  if (typeof window === "undefined") return "#";
  const host = window.location.host;
  const protocol = window.location.protocol;

  // Known root domains
  const roots = ["rubjob-all.com", "rubjob.com", "rubjob-app.pages.dev", "lvh.me"];
  for (const root of roots) {
    if (host.includes(root)) {
      const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
      return `${protocol}//${subdomain}.${root}${port}`;
    }
  }
  // Fallback: just use path-based routing
  return `/${subdomain === "app" ? "" : subdomain}`;
}

const PORTALS = [
  {
    name: "สำหรับลูกค้า",
    nameEn: "Customer App",
    desc: "สั่งซักผ้า เรียกไรเดอร์ ติดตามสถานะ",
    descEn: "Order laundry, call riders, track status",
    subdomain: "app",
    icon: "📱",
    gradient: "from-amber-400 to-orange-500",
    shadow: "shadow-orange-300/40",
  },
  {
    name: "สำหรับร้านซัก",
    nameEn: "Store Portal",
    desc: "จัดการออเดอร์ รับงาน ดูรายได้",
    descEn: "Manage orders, accept jobs, view earnings",
    subdomain: "store",
    icon: "🏪",
    gradient: "from-emerald-400 to-teal-500",
    shadow: "shadow-emerald-300/40",
  },
  {
    name: "สำหรับไรเดอร์",
    nameEn: "Rider Portal",
    desc: "รับงานส่ง ติดตามรายได้ จัดตารางงาน",
    descEn: "Accept deliveries, track earnings, schedule",
    subdomain: "rider",
    icon: "🛵",
    gradient: "from-blue-400 to-indigo-500",
    shadow: "shadow-blue-300/40",
  },
  {
    name: "สำหรับแอดมิน",
    nameEn: "Admin Portal",
    desc: "จัดการระบบทั้งหมด",
    descEn: "Full system management",
    subdomain: "admin",
    icon: "⚙️",
    gradient: "from-slate-500 to-slate-700",
    shadow: "shadow-slate-400/30",
  },
];

const FEATURES = [
  { icon: "🧺", title: "ซักอบรีด", titleEn: "Wash & Iron", desc: "บริการซักผ้าครบวงจร" },
  { icon: "🚚", title: "รับ-ส่งถึงบ้าน", titleEn: "Door-to-Door", desc: "ไรเดอร์รับส่งถึงหน้าบ้าน" },
  { icon: "📍", title: "ติดตามสด", titleEn: "Live Tracking", desc: "ติดตามสถานะแบบเรียลไทม์" },
  { icon: "💳", title: "ชำระง่าย", titleEn: "Easy Payment", desc: "จ่ายผ่าน LINE หรือบัตร" },
  { icon: "🛡️", title: "ประกันผ้า", titleEn: "Garment Insurance", desc: "คุ้มครองผ้าทุกชิ้น" },
  { icon: "⭐", title: "รีวิวจริง", titleEn: "Real Reviews", desc: "ระบบรีวิวจากลูกค้าจริง" },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-dvh bg-slate-950 text-white overflow-hidden relative">
      {/* ─── Ambient Background ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-[80px]" />
      </div>

      {/* ─── Navigation ─── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/images/rubjob-complete_logo-color.png"
            alt="RUBJOB"
            className="h-10 w-10 object-contain"
          />
          <span className="font-black text-lg tracking-tight">
            RUB<span className="text-primary">JOB</span>
          </span>
        </div>
        <a
          href={mounted ? getPortalUrl("app") : "#"}
          className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-slate-900 font-bold text-sm rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/30"
        >
          เข้าใช้งาน →
        </a>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 px-6 md:px-12 pt-16 md:pt-24 pb-20 max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold uppercase tracking-widest mb-8 transition-all duration-700 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            ผู้จัดการชีวิต — Life Operator
          </div>

          <h1
            className={`text-4xl sm:text-5xl md:text-7xl font-black leading-[1.1] tracking-tight mb-6 transition-all duration-700 delay-100 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            บริการซักผ้า
            <br />
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              ครบวงจร
            </span>
          </h1>

          <p
            className={`text-lg md:text-xl text-slate-400 max-w-xl mb-10 leading-relaxed transition-all duration-700 delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            รับ-ส่งผ้าถึงบ้าน ติดตามสถานะเรียลไทม์
            <br className="hidden sm:block" />
            ผ่าน LINE ง่ายๆ ในไม่กี่คลิก
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-300 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <a
              href={mounted ? getPortalUrl("app") : "#"}
              className="group px-8 py-4 bg-gradient-to-r from-primary to-amber-400 text-slate-900 font-black text-base rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              เริ่มใช้งานฟรี
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </a>
            <a
              href="#portals"
              className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold text-base rounded-2xl hover:bg-white/10 transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              ดูพอร์ทัลทั้งหมด
            </a>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative z-10 px-6 md:px-12 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            ทำไมต้อง <span className="text-primary">RUBJOB</span>?
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            แพลตฟอร์มครบวงจร เชื่อมลูกค้า ร้านซัก และไรเดอร์
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group p-5 md:p-6 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-sm md:text-base font-black mb-1">{f.title}</h3>
              <p className="text-xs text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Portal Cards ─── */}
      <section id="portals" className="relative z-10 px-6 md:px-12 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-black mb-3">เลือกพอร์ทัลของคุณ</h2>
          <p className="text-slate-400 text-sm md:text-base">
            เข้าถึงระบบเฉพาะสำหรับแต่ละบทบาท
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {PORTALS.map((portal) => (
            <a
              key={portal.subdomain}
              href={mounted ? getPortalUrl(portal.subdomain) : "#"}
              className={`group relative p-6 md:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden`}
            >
              {/* Gradient accent */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${portal.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              />

              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${portal.gradient} flex items-center justify-center text-2xl shrink-0 shadow-xl ${portal.shadow} group-hover:scale-110 transition-transform`}
                >
                  {portal.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-black mb-0.5">{portal.name}</h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    {portal.nameEn}
                  </p>
                  <p className="text-sm text-slate-400">{portal.desc}</p>
                </div>
                <div className="text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all mt-1">
                  →
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 md:px-12 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/rubjob-complete_logo-color.png"
              alt="RUBJOB"
              className="h-8 w-8 object-contain opacity-60"
            />
            <span className="text-sm text-slate-500 font-bold">
              © 2026 RUBJOB — ผู้จัดการชีวิต
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <a href="#" className="hover:text-primary transition-colors">
              นโยบายความเป็นส่วนตัว
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              เงื่อนไขการใช้งาน
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              ติดต่อเรา
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
