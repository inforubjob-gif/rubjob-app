"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ 
    users: 0, rawUsers: 0, stores: 0, activeStores: 0, 
    orders: 0, revenue: 0, earnings: 0, 
    gpStore: 20, gpRider: 10,
    totalRiders: 0, activeRiders: 0,
    tables: [] as string[],
    inventory: {} as Record<string, number>,
    connection: "WAITING"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
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
            gpStore: data.gpStore || 20,
            gpRider: data.gpRider || 10,
            totalRiders: data.totalRiders || 0,
            activeRiders: data.activeRiders || 0,
            tables: data.tables || [],
            inventory: data.inventory || {},
            connection: data.connection || "CONNECTED"
          });
        }
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
        setErrorCount(prev => prev + 1);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
    // Refresh every 30 seconds if successful
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in relative">
       {/* Ambient Background Mascot */}
      <div className="absolute -top-10 -right-20 w-[400px] opacity-[0.03] pointer-events-none select-none -z-10 blur-sm overflow-hidden hidden lg:block">
        <img src="/images/มาสคอต-เงิน.png" alt="" className="scale-125 rotate-12" />
      </div>

      <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 pb-8 bg-white/50 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            {t("admin.dashboard.title")}
          </h1>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black uppercase tracking-wider border border-primary/20">
               {t("admin.dashboard.gpLabel")}: {stats.gpStore}% / {stats.gpRider}%
             </div>
             <p className="text-slate-400 text-sm font-bold tracking-tight">
               {t("admin.dashboard.noc")}
             </p>
          </div>
        </div>
        {errorCount > 0 ? (
          <div className="w-fit bg-rose-50 text-rose-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 italic shadow-sm flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-rose-500 rounded-full" />
            {t("admin.dashboard.connAlert")}
          </div>
        ) : (
          <div className="w-fit bg-white text-emerald-500 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm flex items-center gap-2 group hover:border-emerald-200 transition-colors">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse group-hover:scale-125 transition-transform" />
            {t("admin.dashboard.liveSync")}
          </div>
        )}
      </header>

      {apiError && (
        <div className="mb-8 p-6 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-5 animate-fade-in shadow-xl shadow-rose-900/5">
           <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
              <Icons.Lock size={24} />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest leading-none mb-1">{t("admin.dashboard.sysException")}</p>
              <p className="text-sm font-bold text-rose-900">{apiError}</p>
           </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-lg" />
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">{t("admin.dashboard.syncing")}</p>
        </div>
      ) : (
        <div className="stagger">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="md:col-span-2 lg:col-span-1 group">
              <Card className="h-full relative overflow-hidden bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-900/20 group-hover:-translate-y-1 transition-all duration-500">
                <div className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-primary backdrop-blur-sm border border-white/10">
                      <Icons.User size={24} />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/5 px-2 py-1 rounded-md border border-white/5 italic">
                      Operator Live
                    </div>
                  </div>
                  <p className="text-[11px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">
                    {t("admin.dashboard.totalUsers")}
                  </p>
                  <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-black tracking-tight">{stats.users.toLocaleString()}</h3>
                    <span className="text-[10px] font-bold text-emerald-400 mb-2 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                      Active
                    </span>
                  </div>
                </div>
                {/* Background Illustration */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 opacity-15 grayscale brightness-200 pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-700">
                   <img src="/images/มาสคอต-เงิน.png" alt="" />
                </div>
              </Card>
            </div>

            {/* Riders Card */}
            <Card className="p-7 bg-white border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-100/50 transition-colors" />
               <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                  <Icons.Car size={28} />
               </div>
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t("admin.dashboard.totalRiders")}</p>
                 <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/10">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black">{Number(stats.activeRiders)} {t("admin.dashboard.liveSync").split(' ')[0]}</span>
                 </div>
               </div>
               <h2 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">
                 {Number(stats.activeRiders)}<span className="text-slate-300 text-2xl font-bold mx-1">/</span>{Number(stats.totalRiders)}
               </h2>
               <div className="mt-4 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${(Number(stats.activeRiders) / (Number(stats.totalRiders) || 1)) * 100}%` }} />
               </div>
            </Card>

            {/* Stores Card */}
            <Card className="p-7 bg-white border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
               <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                  <Icons.Office size={28} />
               </div>
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t("admin.nav.stores")}</p>
                 <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    <span className="text-[9px] font-black">{Number(stats.activeStores)} {t("admin.dashboard.liveSync").split(' ')[0]}</span>
                 </div>
               </div>
               <h2 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">
                 {Number(stats.activeStores)}<span className="text-slate-300 text-2xl font-bold mx-1">/</span>{Number(stats.stores)}
               </h2>
               <div className="mt-4 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,159,28,0.4)]" style={{ width: `${(Number(stats.activeStores) / (Number(stats.stores) || 1)) * 100}%` }} />
               </div>
            </Card>

            {/* Orders Card */}
            <Card className="p-7 bg-white border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-amber-100/50 transition-colors" />
               <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                  <Icons.FileText size={28} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{t("admin.dashboard.totalOrders")}</p>
               <h2 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">{Number(stats.orders).toLocaleString()}</h2>
               <div className="mt-4 flex items-center gap-1.5 font-bold text-[10px] text-slate-300">
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  {t("admin.dashboard.processedVol")}
               </div>
            </Card>

            {/* Gross Revenue Card */}
            <Card className="p-7 bg-white border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-slate-100 transition-colors" />
               <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                  <Icons.Finance size={28} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{t("admin.dashboard.grossRevenue")}</p>
               <h2 className="text-3xl font-black text-slate-900 leading-none tracking-tighter">
                 <span className="text-sm font-black text-slate-300 mr-1.5">฿</span>
                 {Number(stats.revenue).toLocaleString()}
               </h2>
               <div className="mt-4 flex items-center gap-1.5 font-bold text-[10px] text-slate-300">
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  {t("admin.dashboard.overallSales")}
               </div>
            </Card>

            {/* Platform Earnings Card - PREMIUM CI REDESIGN */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-2 p-8 bg-gradient-to-br from-primary to-primary-dark text-white shadow-2xl shadow-primary/30 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500 rounded-xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/30 transition-all duration-700" />
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-24 -mb-24" />
               
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md border border-white/30">
                       <Icons.Wallet size={28} />
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border border-white/20 shadow-sm">
                      {t("admin.dashboard.gpShare").replace("{store}", String(stats.gpStore)).replace("{rider}", String(stats.gpRider))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[11px] font-black text-primary-light/80 uppercase tracking-[0.2em] mb-2">{t("admin.dashboard.platformEarnings")}</p>
                    <h2 className="text-5xl font-black tracking-tighter flex items-end gap-2">
                      <span className="text-2xl text-white/50 font-bold mb-1">฿</span>
                      {Number(stats.earnings).toLocaleString()}
                    </h2>
                    <p className="mt-4 text-primary-light/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                       <Icons.Logo size={12} variant="white" className="opacity-50" />
                       {t("admin.dashboard.netCommission")}
                    </p>
                  </div>
               </div>
            </Card>

            {/* Quick Insights Placeholder */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 p-8 bg-slate-50/50 border border-slate-100 border-dashed rounded-xl flex flex-col items-center justify-center text-center group hover:bg-white hover:border-solid hover:shadow-card transition-all duration-500">
               <div className="w-16 h-16 bg-white rounded-xl shadow-sm text-slate-200 flex items-center justify-center mb-6 group-hover:text-primary group-hover:scale-110 transition-all">
                  <Icons.Finance size={32} />
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-2">{t("admin.dashboard.analytics")}</h3>
               <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto tracking-tight">{t("admin.dashboard.analyticsSub")}</p>
            </Card>
            
            {/* Quick Actions Card */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-2 p-8 bg-white border border-slate-100 shadow-card rounded-xl">
               <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                  <div className="w-2 h-6 bg-primary rounded-full" />
                  {t("admin.dashboard.quickActions")}
               </h3>
               <div className="space-y-4">
                  <Link href="/admin/finance" className="w-full py-5 px-6 bg-slate-50 hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] text-slate-700 hover:text-primary font-black rounded-xl flex items-center justify-between transition-all group border border-transparent hover:border-primary/20">
                     <span className="flex items-center gap-4">
                        <Icons.Wallet size={20} className="text-slate-400 group-hover:text-primary" />
                        {t("admin.dashboard.processPayouts")}
                     </span>
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link href="/admin/stores" className="w-full py-5 px-6 bg-slate-50 hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] text-slate-700 hover:text-primary font-black rounded-xl flex items-center justify-between transition-all group border border-transparent hover:border-primary/20">
                     <span className="flex items-center gap-4">
                        <Icons.Office size={20} className="text-slate-400 group-hover:text-primary" />
                        {t("admin.dashboard.reviewStores")}
                     </span>
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link href="/admin/settings" className="w-full py-5 px-6 bg-slate-50 hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] text-slate-700 hover:text-primary font-black rounded-xl flex items-center justify-between transition-all group border border-transparent hover:border-primary/20">
                     <span className="flex items-center gap-4">
                        <Icons.Settings size={20} className="text-slate-400 group-hover:text-primary" />
                        {t("admin.dashboard.maintenance")}
                     </span>
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
               </div>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
