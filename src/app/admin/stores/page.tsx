"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/providers/LanguageProvider";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";
import Skeleton from "@/components/ui/Skeleton";

export default function StoresAdminPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [stores, setStores] = useState<any[]>([]);
  const [filteredStores, setFilteredStores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [allServices, setAllServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
    fetchServices();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFilteredStores(
      stores.filter(s => 
        s.name?.toLowerCase().includes(term) || 
        s.address?.toLowerCase().includes(term) ||
        s.phone?.toLowerCase().includes(term)
      )
    );
  }, [search, stores]);

  async function fetchStores() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/stores");
      const data = await res.json() as any;
      if (data.stores) {
        setStores(data.stores);
        setFilteredStores(data.stores);
      }
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
      showToast(currentStatus === 1 ? t('admin.riders.form.suspended') : t('admin.riders.form.verified'), "success");
    } catch (err) {
      console.error("Failed to toggle status", err);
      showToast("Failed to update store status", "error");
    }
  }

  async function deleteStore(id: string) {
    if (!window.confirm(t('common.confirm'))) return;
    
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
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight lowercase">{t('admin.stores.list.title')}</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">{t('admin.stores.list.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm w-full md:w-80 group focus-within:ring-4 focus-within:ring-primary/10 transition-all">
            <div className="px-5 py-3 bg-slate-50 border-r border-slate-100 text-slate-400 group-focus-within:text-primary transition-colors flex items-center shrink-0">
              <Icons.Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder={t('admin.users.searchPlaceholder')} 
              className="px-5 py-3 outline-none text-sm font-bold flex-1 bg-white" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link 
            href="/admin/stores/new"
            className="px-8 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto shrink-0"
          >
            <Icons.Plus size={16} /> {t('admin.stores.list.newBtn')}
          </Link>
        </div>
      </header>

      <Card className="bg-white border border-slate-200/60 shadow-xl shadow-slate-200/20 rounded-2xl overflow-hidden">
          <div className="flex justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
               <Icons.Search size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{search ? t('admin.users.noUsers') : t('admin.stores.list.empty')}</p>
            {search ? (
              <button onClick={() => setSearch("")} className="mt-4 text-primary font-bold text-xs hover:underline decoration-2 underline-offset-4">{t('admin.users.clearSearch')}</button>
            ) : (
              <Link href="/admin/stores/new" className="mt-4 text-primary font-black text-sm uppercase tracking-tight hover:underline">{t('admin.stores.list.emptyAction')}</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">{t('admin.stores.list.table.store')}</th>
                  <th className="px-8 py-5">{t('admin.stores.list.table.location')}</th>
                  <th className="px-8 py-5 text-center">{t('admin.stores.list.table.services')}</th>
                  <th className="px-8 py-5">{t('admin.stores.list.table.delivery')}</th>
                  <th className="px-8 py-5">{t('admin.stores.list.table.status')}</th>
                  <th className="px-8 py-5 text-right">{t('admin.stores.list.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStores.map(store => (
                  <tr key={store.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-white">
                            <Icons.Office size={24} />
                         </div>
                         <div className="flex flex-col">
                            <span className="font-black text-slate-900 tracking-tight block">{store.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">{store.id.substring(0, 8)}...</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                             <Icons.MapPin size={14} className="text-primary/40" /> {store.address}
                          </p>
                          {store.phone && (
                            <p className="text-[10px] font-black text-slate-400 flex items-center gap-2 font-mono ml-0.5">
                               <Icons.Phone size={12} className="text-slate-300" /> {store.phone}
                            </p>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[240px] mx-auto">
                          {store.services?.map((ss: any) => {
                             const svc = allServices.find(s => s.id === ss.serviceId);
                             return svc ? (
                               <span key={ss.serviceId} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200/50">
                                  {svc.name}
                               </span>
                             ) : null;
                          })}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-1.5 font-black text-slate-900">
                          <span className="text-primary/40 italic">฿</span>
                          <span>{store.baseDeliveryFee}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <Badge variant={
                         store.status === 'active' ? "success" : 
                         store.status === 'pending' ? "warning" : 
                         "danger"
                       }>
                          {store.status === 'active' ? t('admin.riders.form.verified') : 
                           store.status === 'pending' ? t('admin.riders.form.pendingReview') : 
                           t('admin.riders.form.rejected')}
                       </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <Link 
                             href={`/admin/stores/${store.id}`}
                             className="w-10 h-10 bg-slate-100 hover:bg-primary hover:text-white text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
                           >
                             <Icons.Edit size={18} />
                           </Link>
                           <button 
                             onClick={() => toggleStoreStatus(store.id, store.isActive)}
                             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border ${store.isActive === 1 ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}
                           >
                             {store.status === 'active' ? 'Suspend' : store.status === 'pending' ? 'Review & Approve' : 'Activate' }
                           </button>
                           <button 
                             onClick={() => deleteStore(store.id)}
                             className="w-10 h-10 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all group-hover:bg-rose-50/50"
                             title="Delete Store"
                           >
                             <Icons.Trash size={18} />
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
