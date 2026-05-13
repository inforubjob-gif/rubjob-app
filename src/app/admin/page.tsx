"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

// Mini donut chart component (pure SVG)
function DonutChart({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[], size?: number }) {
 const total = segments.reduce((s, seg) => s + seg.value, 0);
 if (total === 0) return <div className="w-full flex items-center justify-center py-4"><span className="text-xs text-slate-300 font-bold">ไม่มีข้อมูล</span></div>;
 const r = 40, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
 let offset = 0;
 return (
  <svg viewBox="0 0 120 120" width={size} height={size} className="drop-shadow-sm">
   {segments.map((seg, i) => {
    const pct = seg.value / total;
    const dash = circumference * pct;
    const gap = circumference - dash;
    const o = offset;
    offset += dash;
    return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="16" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-o} strokeLinecap="round" className="transition-all duration-1000" style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }} />;
   })}
   <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900 text-[10px] font-black">฿{total.toLocaleString()}</text>
   <text x={cx} y={cy + 10} textAnchor="middle" className="fill-slate-400 text-[6px] font-bold uppercase tracking-widest">รายได้รวม</text>
  </svg>
 );
}

// Mini bar chart for KPI visual
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
 const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
 return (
  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
   <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
  </div>
 );
}

export default function AdminDashboard() {
 const { t } = useTranslation();
 const [stats, setStats] = useState({ 
  users: 0, rawUsers: 0, stores: 0, activeStores: 0, 
  orders: 0, revenue: 0, earnings: 0, 
  gpStore: 10, gpRubber: 15,
  totalRubbers: 0, activeRubbers: 0,
  tables: [] as string[],
  inventory: {} as Record<string, number>,
  connection: "WAITING",
  rubberWalletBalance: 0, storeWalletBalance: 0,
  revenueBreakdown: { totalLaundry: 0, totalDelivery: 0, storeGP: 0, rubberGP: 0, platformFee: 0, storeNetEarnings: 0, rubberNetEarnings: 0 },
  topServices: [] as any[],
  topLocations: [] as any[],
 });
 const [isLoading, setIsLoading] = useState(true);
 const [errorCount, setErrorCount] = useState(0);
 const [apiError, setApiError] = useState<string | null>(null);

 useEffect(() => {
  async function fetchStats() {
   try {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });

    // Guard: if server returns HTML instead of JSON (e.g. error page, login redirect)
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      setErrorCount(prev => prev + 1);
      setApiError(`Server Error: ${res.status} (ระบบตอบกลับผิดรูปแบบ)`);
      return;
    }

    const data = await res.json() as any;

    if (!res.ok || data.error) {
      setErrorCount(prev => prev + 1);
      setApiError(data.error || `Server Error: ${res.status}`);
    } else {
      setStats({
      users: data.users || 0,
      rawUsers: data.rawUsers || 0,
      stores: data.stores || 0,
      activeStores: data.activeStores || 0,
      orders: data.orders || 0,
      revenue: data.revenue || 0,
      earnings: data.earnings || 0,
      gpStore: data.gpStore ?? 10,
      gpRubber: data.gpRubber ?? 15,
      totalRubbers: data.totalRubbers || 0,
      activeRubbers: data.activeRubbers || 0,
      tables: data.tables || [],
      inventory: data.inventory || {},
      connection: data.connection || "CONNECTED",
      rubberWalletBalance: data.rubberWalletBalance || 0,
      storeWalletBalance: data.storeWalletBalance || 0,
      revenueBreakdown: data.revenueBreakdown || { totalLaundry: 0, totalDelivery: 0, storeGP: 0, rubberGP: 0, platformFee: 0, storeNetEarnings: 0, rubberNetEarnings: 0 },
      topServices: data.topServices || [],
      topLocations: data.topLocations || [],
     });
    }
   } catch (err: unknown) {
    console.error("Failed to fetch admin stats:", err);
    setErrorCount(prev => prev + 1);
    setApiError(((err instanceof Error) ? err.message : "") || "Network Error or Invalid Response");
   } finally {
    setIsLoading(false);
   }
  }
  fetchStats();
  const interval = setInterval(fetchStats, 30000);
  return () => clearInterval(interval);
 }, []);

 const bd = stats.revenueBreakdown;

 return (
  <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
   {/* ─── Header ─── */}
   <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-100">
    <div>
     <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t("admin.dashboard.title")}</h1>
     <p className="text-slate-400 text-sm font-medium mt-1">{t("admin.dashboard.noc")}</p>
    </div>
    <div className="flex items-center gap-3">
     <div className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-100">
      GP: {stats.gpStore}% ร้าน / {stats.gpRubber}% Rubber + ฿15
     </div>
     {errorCount > 0 ? (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-100 animate-pulse">
       <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Error
      </div>
     ) : (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-100">
       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
      </div>
     )}
    </div>
   </header>

   {apiError && (
    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0"><Icons.Lock size={20} /></div>
      <div>
       <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest mb-0.5">{t("admin.dashboard.sysException")}</p>
       <p className="text-sm font-bold text-rose-800">{apiError}</p>
      </div>
    </div>
   )}

   {isLoading ? (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
     <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
     <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">{t("admin.dashboard.syncing")}</p>
    </div>
   ) : (
    <>
     {/* ═══════════ SECTION 1: KPI Cards ═══════════ */}
     <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Users */}
      <Link href="/admin/users" className="group">
       <Card className="p-5 h-full bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
         <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Icons.User size={18} /></div>
         <span className="text-[9px] font-black text-slate-300 uppercase">Users</span>
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.users.toLocaleString()}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-1">{t("admin.dashboard.totalUsers")}</p>
       </Card>
      </Link>

      {/* Rubbers */}
      <Link href="/admin/rubbers" className="group">
       <Card className="p-5 h-full bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
         <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Icons.Car size={18} /></div>
         <div className="flex items-center gap-1 text-emerald-600">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black">{stats.activeRubbers} online</span>
         </div>
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalRubbers}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-1">{t("admin.dashboard.totalRubbers")}</p>
        <MiniBar value={stats.activeRubbers} max={stats.totalRubbers} color="#10b981" />
       </Card>
      </Link>

      {/* Stores */}
      <Link href="/admin/stores" className="group">
       <Card className="p-5 h-full bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
         <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icons.Office size={18} /></div>
         <div className="flex items-center gap-1 text-primary">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-[9px] font-black">{stats.activeStores} online</span>
         </div>
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.stores}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-1">{t("admin.nav.stores")}</p>
        <MiniBar value={stats.activeStores} max={stats.stores} color="#FF9F1C" />
       </Card>
      </Link>

      {/* Orders */}
      <Link href="/admin/orders" className="group">
       <Card className="p-5 h-full bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
         <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Icons.FileText size={18} /></div>
         <span className="text-[9px] font-black text-slate-300 uppercase">Orders</span>
        </div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.orders.toLocaleString()}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-1">{t("admin.dashboard.totalOrders")}</p>
       </Card>
      </Link>
     </section>

     {/* ═══════════ SECTION 2: Revenue Overview ═══════════ */}
     <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Platform Earnings — Hero */}
      <Card className="lg:col-span-1 p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden">
       <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20" />
       <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center backdrop-blur-md border border-primary/30">
          <Icons.Wallet size={20} />
         </div>
         <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t("admin.dashboard.platformEarnings")}</p>
        </div>
        <h2 className="text-4xl font-black tracking-tighter mb-1 text-primary">
         <span className="text-lg text-primary/60 mr-1">฿</span>{Number(stats.earnings).toLocaleString()}
        </h2>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t("admin.dashboard.netCommission")}</p>
        
        {/* Mini breakdown */}
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
         <div className="flex justify-between text-[10px]">
          <span className="text-white/40">GP ร้าน ({stats.gpStore}%)</span>
          <span className="font-black text-white/70">฿{Number(bd.storeGP).toLocaleString()}</span>
         </div>
         <div className="flex justify-between text-[10px]">
          <span className="text-white/40">GP Rubber ({stats.gpRubber}%)</span>
          <span className="font-black text-white/70">฿{Number(bd.rubberGP).toLocaleString()}</span>
         </div>
         <div className="flex justify-between text-[10px]">
          <span className="text-white/40">ค่าบริการ (฿15/ออเดอร์)</span>
          <span className="font-black text-white/70">฿{Number(bd.platformFee).toLocaleString()}</span>
         </div>
        </div>
       </div>
      </Card>

      {/* Revenue Split Chart */}
      <Card className="lg:col-span-1 p-6 bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center">
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">สัดส่วนรายได้</p>
       <DonutChart size={140} segments={[
        { value: Number(bd.storeNetEarnings), color: "#8b5cf6", label: "ร้านซัก" },
        { value: Number(bd.rubberNetEarnings), color: "#10b981", label: "Rubber" },
        { value: Number(stats.earnings), color: "#FF9F1C", label: "แพลตฟอร์ม" },
       ]} />
       <div className="flex flex-wrap justify-center gap-4 mt-4">
        {[
         { color: "#8b5cf6", label: "ร้านซัก", value: bd.storeNetEarnings },
         { color: "#10b981", label: "Rubber", value: bd.rubberNetEarnings },
         { color: "#FF9F1C", label: "แพลตฟอร์ม", value: stats.earnings },
        ].map(l => (
         <div key={l.label} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
          <span className="text-[10px] font-bold text-slate-500">{l.label}</span>
          <span className="text-[10px] font-black text-slate-700">฿{Number(l.value).toLocaleString()}</span>
         </div>
        ))}
       </div>
      </Card>

      {/* Gross Revenue + Breakdown */}
      <Card className="lg:col-span-1 p-6 bg-white border border-slate-100 shadow-sm">
       <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Icons.Finance size={20} /></div>
        <div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.dashboard.grossRevenue")}</p>
         <p className="text-2xl font-black text-slate-900 tracking-tight"><span className="text-sm text-slate-300 mr-1">฿</span>{Number(stats.revenue).toLocaleString()}</p>
        </div>
       </div>

       {/* Revenue bars */}
       <div className="space-y-4">
        {[
         { label: "ค่าซัก (Laundry)", value: bd.totalLaundry, color: "#8b5cf6", max: stats.revenue },
         { label: "ค่าจัดส่ง (Delivery)", value: bd.totalDelivery, color: "#10b981", max: stats.revenue },
        ].map(bar => (
         <div key={bar.label}>
          <div className="flex justify-between mb-1.5">
           <span className="text-[10px] font-bold text-slate-500">{bar.label}</span>
           <span className="text-[10px] font-black text-slate-700 tabular-nums">฿{Number(bar.value).toLocaleString()}</span>
          </div>
          <div className="w-full h-6 bg-slate-50 rounded-lg overflow-hidden relative">
           <div className="h-full rounded-lg transition-all duration-1000 ease-out flex items-center justify-end pr-2" style={{ width: `${bar.max > 0 ? Math.max((Number(bar.value) / bar.max) * 100, 4) : 0}%`, backgroundColor: bar.color }}>
            <span className="text-[8px] font-black text-white/80">{bar.max > 0 ? ((Number(bar.value) / bar.max) * 100).toFixed(0) : 0}%</span>
           </div>
          </div>
         </div>
        ))}
       </div>

       {/* Divider and breakdown list */}
       <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
        {[
         { label: `ร้านซักได้รับ (${100 - stats.gpStore}%)`, value: bd.storeNetEarnings, dot: "#8b5cf6" },
         { label: `Rubber ได้รับ`, value: bd.rubberNetEarnings, dot: "#10b981" },
         { label: `แพลตฟอร์มได้รับ`, value: stats.earnings, dot: "#FF9F1C" },
        ].map(row => (
         <div key={row.label} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: row.dot }} />
           <span className="text-[10px] font-bold text-slate-500">{row.label}</span>
          </div>
          <span className="text-[10px] font-black text-slate-800 tabular-nums">฿{Number(row.value).toLocaleString()}</span>
         </div>
        ))}
       </div>
      </Card>
     </section>

     {/* ═══════════ SECTION 3: Top Insights ═══════════ */}
     <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Services */}
      <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-xl">
       <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
         <Icons.Star size={16} />
        </div>
        <div>
         <h3 className="text-sm font-black text-slate-900">บริการยอดฮิต</h3>
         <p className="text-[10px] font-bold text-slate-400">บริการที่ลูกค้านิยมสั่งมากที่สุด</p>
        </div>
       </div>
       <div className="space-y-3">
        {stats.topServices.length > 0 ? stats.topServices.map((svc, i) => (
         <div key={i} className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
           <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black bg-slate-50 text-slate-400 group-hover:bg-pink-50 group-hover:text-pink-500 transition-colors">
            {i + 1}
           </div>
           <span className="text-xs font-bold text-slate-700">{svc.name}</span>
          </div>
          <div className="text-[10px] font-black bg-slate-50 px-2 py-1 rounded-md text-slate-500">
           {svc.count} <span className="font-bold text-slate-400 font-mono">ครั้ง</span>
          </div>
         </div>
        )) : (
         <div className="text-center py-4 text-xs font-bold text-slate-400">ยังไม่มีข้อมูล</div>
        )}
       </div>
      </Card>

      {/* Top Locations */}
      <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-xl">
       <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
         <Icons.MapPin size={16} />
        </div>
        <div>
         <h3 className="text-sm font-black text-slate-900">ย่านยอดฮิต</h3>
         <p className="text-[10px] font-bold text-slate-400">บริเวณที่ลูกค้าเรียกใช้บริการบ่อยที่สุด</p>
        </div>
       </div>
       <div className="space-y-3">
        {stats.topLocations.length > 0 ? stats.topLocations.map((loc, i) => (
         <div key={i} className="flex items-center justify-between group">
          <div className="flex items-center gap-3 overflow-hidden">
           <div className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] font-black bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
            {i + 1}
           </div>
           <span className="text-xs font-bold text-slate-700 truncate" title={loc.name}>{loc.name}</span>
          </div>
          <div className="text-[10px] shrink-0 font-black bg-slate-50 px-2 py-1 rounded-md text-slate-500 ml-2">
           {loc.count} <span className="font-bold text-slate-400 font-mono">ครั้ง</span>
          </div>
         </div>
        )) : (
         <div className="text-center py-4 text-xs font-bold text-slate-400">ยังไม่มีข้อมูล</div>
        )}
       </div>
      </Card>
     </section>

     {/* ═══════════ SECTION 4: Quick Actions ═══════════ */}
     <section>
      <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-xl">
       <h3 className="text-sm font-black text-slate-900 mb-5 flex items-center gap-2">
        <div className="w-1.5 h-5 bg-primary rounded-full" />
        {t("admin.dashboard.quickActions")}
       </h3>
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
         { href: "/admin/finance", icon: <Icons.Wallet size={18} />, label: t("admin.dashboard.processPayouts"), color: "bg-primary/5 text-primary hover:bg-primary/10 border-primary/10" },
         { href: "/admin/stores", icon: <Icons.Office size={18} />, label: t("admin.dashboard.reviewStores"), color: "bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-100" },
         { href: "/admin/settings", icon: <Icons.Settings size={18} />, label: t("admin.dashboard.maintenance"), color: "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-100" },
        ].map(action => (
         <Link key={action.href} href={action.href} className={`py-4 px-5 rounded-xl flex items-center gap-3 font-bold text-sm transition-all active:scale-[0.98] border ${action.color}`}>
          {action.icon}
          <span className="text-xs font-black">{action.label}</span>
         </Link>
        ))}
       </div>
      </Card>
     </section>
    </>
   )}
  </div>
 );
}
