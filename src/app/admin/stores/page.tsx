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

  async function deleteStore(id: string) {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this store? This cannot be undone.")) return;
    
    try {
      const res = await fetch("/api/admin/stores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      
      if (!res.ok) throw new Error("Failed to delete");
      
      setStores(prev => prev.filter(s => s.id !== id));
      showToast("Store deleted permanently", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete store", "error");
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

      <Card className="bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Store</th>
                  <th className="px-6 py-4">Location & Contact</th>
                  <th className="px-6 py-4">Services</th>
                  <th className="px-6 py-4">Base Delivery</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map(store => (
                  <tr key={store.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Icons.Office size={20} />
                         </div>
                         <div className="font-bold text-slate-900">{store.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                             <Icons.MapPin size={12} className="text-slate-300" /> {store.address}
                          </p>
                          {store.phone && (
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 font-mono">
                               <Icons.Phone size={10} className="text-slate-300" /> {store.phone}
                            </p>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {store.services?.map((ss: any) => {
                             const svc = allServices.find(s => s.id === ss.serviceId);
                             return svc ? (
                               <span key={ss.serviceId} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded">
                                  {svc.name}
                               </span>
                             ) : null;
                          })}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-black text-slate-900">฿{store.baseDeliveryFee}</span>
                    </td>
                    <td className="px-6 py-4">
                       <Badge variant={
                         store.status === 'active' ? "success" : 
                         store.status === 'pending' ? "warning" : 
                         "danger"
                       }>
                          {store.status === 'active' ? 'Active' : 
                           store.status === 'pending' ? 'Pending Review' : 
                           'Suspended'}
                       </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Link 
                             href={`/admin/stores/${store.id}`}
                             className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                           >
                             <Icons.Edit size={16} />
                           </Link>
                           <button 
                             onClick={() => toggleStoreStatus(store.id, store.isActive)}
                             className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 ${store.isActive === 1 ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                           >
                             {store.status === 'active' ? 'Suspend' : store.status === 'pending' ? 'Review & Approve' : 'Activate' }
                           </button>
                           <button 
                             onClick={() => deleteStore(store.id)}
                             className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                             title="Delete Store"
                           >
                             <Icons.Trash size={16} />
                           </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
