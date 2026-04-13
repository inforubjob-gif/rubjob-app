"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, stores: 0, orders: 0, revenue: 0 });
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
            revenue: data.revenue || 0
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
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-slate-500 font-medium">Real-time metrics and platform health</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Icons.User size={24} />
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
               <h2 className="text-3xl font-black text-slate-900">{stats.users.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                  <Icons.Office size={24} />
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Stores</p>
               <h2 className="text-3xl font-black text-slate-900">{stats.stores.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Icons.FileText size={24} />
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
               <h2 className="text-3xl font-black text-slate-900">{stats.orders.toLocaleString()}</h2>
            </Card>

            <Card className="p-6 bg-slate-900 text-white shadow-xl shadow-slate-900/20">
               <div className="w-12 h-12 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Icons.Wallet size={24} />
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gross Revenue</p>
               <h2 className="text-3xl font-black tracking-tighter">
                 <span className="text-xl text-slate-400 font-bold mr-1">฿</span>
                 {stats.revenue.toLocaleString()}
               </h2>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <Card className="col-span-2 p-6 bg-white border border-slate-200/60 shadow-sm">
               <h3 className="text-lg font-black text-slate-900 mb-6">Revenue Growth (Simulated)</h3>
               <div className="h-64 flex items-end justify-between gap-2">
                  {[40, 60, 45, 80, 55, 90, 100, 75, 110, 85, 120, 95].map((h, i) => (
                    <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group">
                       <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all duration-500 hover:bg-primary-dark" style={{ height: `${h}%` }} />
                    </div>
                  ))}
               </div>
            </Card>
            
            <Card className="p-6 bg-white border border-slate-200/60 shadow-sm">
               <h3 className="text-lg font-black text-slate-900 mb-6">Quick Actions</h3>
               <div className="space-y-3">
                  <button className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center justify-between transition-colors">
                     Process Payouts (3 Pending)
                     <Icons.ArrowRight size={18} />
                  </button>
                  <button className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center justify-between transition-colors">
                     Review New Store Registrations
                     <Icons.ArrowRight size={18} />
                  </button>
                  <button className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center justify-between transition-colors">
                     System Maintenance
                     <Icons.ArrowRight size={18} />
                  </button>
               </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
