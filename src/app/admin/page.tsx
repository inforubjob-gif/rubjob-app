"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ 
    users: 0, stores: 0, activeStores: 0, 
    orders: 0, revenue: 0, earnings: 0, 
    gpStore: 20, gpRider: 10,
    totalRiders: 0, activeRiders: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json() as any;
        if (!data.error) {
          setStats({
            users: data.users || 0,
            stores: data.stores || 0,
            activeStores: data.activeStores || 0,
            orders: data.orders || 0,
            revenue: data.revenue || 0,
            earnings: data.earnings || 0,
            gpStore: data.gpStore || 20,
            gpRider: data.gpRider || 10,
            totalRiders: data.totalRiders || 0,
            activeRiders: data.activeRiders || 0
          });
        }
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t("admin.dashboard.title")}</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium tracking-tight">
            {t("admin.dashboard.gpLabel")}: {t("admin.nav.stores")} {stats.gpStore}% / {t("admin.nav.riders")} {stats.gpRider}%
          </p>
        </div>
        <div className="w-fit bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 italic shadow-sm flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           {t("admin.dashboard.liveSync")}
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
               <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Icons.User size={24} />
               </div>
               <div className="flex items-center justify-between mb-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.dashboard.totalUsers")}</p>
                 <span className="text-[9px] font-bold text-slate-300">Total</span>
               </div>
               <h2 className="text-3xl font-black text-slate-900 leading-none">{stats.users.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
               <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Icons.Car size={24} />
               </div>
               <div className="flex items-center justify-between mb-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.dashboard.totalRiders")}</p>
                 <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full ring-1 ring-emerald-100">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black">{stats.activeRiders} {t("admin.dashboard.liveSync").split(' ')[0]}</span>
                 </div>
               </div>
               <h2 className="text-3xl font-black text-slate-900 leading-none">
                 {stats.activeRiders}<span className="text-slate-200 text-xl font-bold mx-1">/</span>{stats.totalRiders}
               </h2>
               <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-1000" style={{ width: `${(stats.activeRiders / (stats.totalRiders || 1)) * 100}%` }} />
            </Card>

            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
               <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                  <Icons.Office size={24} />
               </div>
               <div className="flex items-center justify-between mb-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("admin.nav.stores")}</p>
                 <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full ring-1 ring-emerald-100">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black">{stats.activeStores} {t("admin.dashboard.liveSync").split(' ')[0]}</span>
                 </div>
               </div>
               <h2 className="text-3xl font-black text-slate-900 leading-none">
                 {stats.activeStores}<span className="text-slate-200 text-xl font-bold mx-1">/</span>{stats.stores}
               </h2>
               <div className="absolute bottom-0 left-0 h-1 bg-orange-500 transition-all duration-1000" style={{ width: `${(stats.activeStores / (stats.stores || 1)) * 100}%` }} />
            </Card>

            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Icons.FileText size={24} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("admin.dashboard.totalOrders")}</p>
               <h2 className="text-3xl font-black text-slate-900 leading-none">{stats.orders.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full blur-3xl -mr-10 -mt-10" />
               <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 relative z-10">
                  <Icons.Finance size={24} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">{t("admin.dashboard.grossRevenue")}</p>
               <h2 className="text-2xl font-black text-slate-900 leading-none relative z-10">
                 <span className="text-sm font-bold text-slate-300 mr-1">฿</span>
                 {stats.revenue.toLocaleString()}
               </h2>
            </Card>

            <Card className="p-6 bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
               <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center mb-4 relative z-10 shadow-lg">
                  <Icons.Wallet size={24} />
               </div>
               <div className="relative z-10 flex items-center justify-between mb-1">
                 <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">{t("admin.dashboard.platformEarnings")}</p>
                 <div className="bg-white/20 px-2 py-0.5 rounded-md text-[9px] font-black tracking-tighter uppercase">
                   GP: S-{stats.gpStore}% / R-{stats.gpRider}%
                 </div>
               </div>
               <h2 className="text-3xl font-black tracking-tighter relative z-10">
                 <span className="text-xl text-white/50 font-bold mr-1">฿</span>
                 {stats.earnings.toLocaleString()}
               </h2>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <Card className="col-span-2 p-8 bg-white border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                  <Icons.Finance size={32} />
               </div>
               <h3 className="text-lg font-black text-slate-900 mb-2">{t("admin.dashboard.analytics")}</h3>
               <p className="text-slate-500 text-sm max-w-xs mx-auto">{t("admin.dashboard.analyticsSub")}</p>
            </Card>
            
            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm">
               <h3 className="text-lg font-black text-slate-900 mb-6">{t("admin.dashboard.quickActions")}</h3>
               <div className="space-y-3">
                  <Link href="/admin/finance" className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] text-slate-700 font-bold rounded-xl flex items-center justify-between transition-all group">
                     {t("admin.dashboard.processPayouts")}
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link href="/admin/stores" className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] text-slate-700 font-bold rounded-xl flex items-center justify-between transition-all group">
                     {t("admin.dashboard.reviewStores")}
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link href="/admin/settings" className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] text-slate-700 font-bold rounded-xl flex items-center justify-between transition-all group">
                     {t("admin.dashboard.maintenance")}
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
               </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
