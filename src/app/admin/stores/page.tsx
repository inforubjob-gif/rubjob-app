"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";
import Skeleton from "@/components/ui/Skeleton";

export default function StoresAdminPage() {
  const { showToast } = useToast();
  const [stores, setStores] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
    fetchServices();
  }, []);

  async function fetchStores() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/stores");
      const data = await res.json() as any;
      if (data.stores) setStores(data.stores);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchServices() {
    try {
      const res = await fetch("/api/services");
      const data = await res.json() as any;
      if (data.services) setAllServices(data.services);
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleStoreStatus(id: string, currentStatus: number) {
    try {
      await fetch("/api/admin/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: currentStatus === 1 ? 0 : 1 })
      });
      setStores(prev => prev.map(s => s.id === id ? { ...s, isActive: currentStatus === 1 ? 0 : 1 } : s));
      showToast(`Store ${currentStatus === 1 ? 'suspended' : 'activated'} successfully`, "success");
    } catch (err) {
      console.error("Failed to toggle status", err);
      showToast("Failed to update store status", "error");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Partner Stores</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">Manage physical store locations and their specialized services</p>
        </div>
        <Link 
          href="/admin/stores/new"
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Icons.Plus size={16} /> New Store
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 bg-white border border-slate-200/60 shadow-sm flex items-center gap-6">
                <Skeleton variant="rect" className="w-16 h-16 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton variant="text" className="w-1/3 h-6" />
                  <Skeleton variant="text" className="w-2/3 h-4" />
                </div>
              </Card>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
               <Icons.Office size={40} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No stores registered yet.</p>
            <Link href="/admin/stores/new" className="mt-4 text-primary font-black text-sm uppercase tracking-tight hover:underline">Register first branch →</Link>
          </div>
        ) : (
          stores.map(store => (
            <Card key={store.id} className="p-6 bg-white border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/40 transition-colors">
              <div className="flex items-start md:items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-lg shadow-slate-100">
                    <Icons.Office size={28} />
                 </div>
                 <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-black text-slate-900">{store.name}</h2>
                      <Badge variant={store.isActive === 1 ? "success" : "danger"}>
                        {store.isActive === 1 ? 'Active' : 'Suspended'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mb-2">
                      <Icons.MapPin size={14} className="text-primary" /> {store.address}
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {store.services?.map((ss: any) => {
                          const svc = allServices.find(s => s.id === ss.serviceId);
                          return svc ? (
                            <div key={ss.serviceId} className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md">
                               <span className="text-[9px] font-black uppercase text-slate-500">{svc.name}</span>
                               {ss.price && (
                                  <span className="text-[9px] font-bold text-indigo-500 border-l border-slate-300 pl-1.5">฿{ss.price}</span>
                               )}
                            </div>
                          ) : null;
                       })}
                       {(!store.services || store.services.length === 0) && (
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic">No services assigned</span>
                       )}
                    </div>
                 </div>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:border-l border-slate-100 md:pl-8 pt-4 md:pt-0 border-t md:border-t-0 mt-4 md:mt-0">
                 <div className="text-left md:text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Delivery</p>
                    <p className="text-xl font-black text-slate-900">฿{store.baseDeliveryFee}</p>
                 </div>
                 <div className="flex gap-2">
                    <Link 
                      href={`/admin/stores/${store.id}`}
                      className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <Icons.Edit size={18} />
                    </Link>
                    <button 
                      onClick={() => toggleStoreStatus(store.id, store.isActive)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95 ${store.isActive === 1 ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                      {store.isActive === 1 ? 'Suspend' : 'Activate'}
                    </button>
                 </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
