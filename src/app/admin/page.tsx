"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    users: 0, stores: 0, orders: 0, revenue: 0, earnings: 0, 
    gpStore: 20, gpRider: 10 
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
            orders: data.orders || 0,
            revenue: data.revenue || 0,
            earnings: data.earnings || 0,
            gpStore: data.gpStore || 20,
            gpRider: data.gpRider || 10
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
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium tracking-tight">Financial formulas: Store {stats.gpStore}% / Rider {stats.gpRider}%</p>
        </div>
        <div className="w-fit bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 italic shadow-sm flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           Live Sync Active
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Icons.User size={24} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
               <h2 className="text-3xl font-black text-slate-900 leading-none">{stats.users.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                  <Icons.Office size={24} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Stores</p>
               <h2 className="text-3xl font-black text-slate-900 leading-none">{stats.stores.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Icons.FileText size={24} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
               <h2 className="text-3xl font-black text-slate-900 leading-none">{stats.orders.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full blur-3xl -mr-10 -mt-10" />
               <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 relative z-10">
                  <Icons.Finance size={24} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Gross Revenue</p>
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
                 <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Platform Earnings</p>
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
               <h3 className="text-lg font-black text-slate-900 mb-2">Detailed Analytics</h3>
               <p className="text-slate-500 text-sm max-w-xs mx-auto">Real-time charts will appear here as you process more orders through the system.</p>
            </Card>
            
            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm">
               <h3 className="text-lg font-black text-slate-900 mb-6">Quick Actions</h3>
               <div className="space-y-3">
                  <Link href="/admin/finance" className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] text-slate-700 font-bold rounded-xl flex items-center justify-between transition-all group">
                     Process Payouts
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link href="/admin/stores" className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] text-slate-700 font-bold rounded-xl flex items-center justify-between transition-all group">
                     Review Store Registrations
                     <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                  <Link href="/admin/settings" className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] text-slate-700 font-bold rounded-xl flex items-center justify-between transition-all group">
                     System Maintenance
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
