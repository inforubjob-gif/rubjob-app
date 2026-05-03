"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/providers/LanguageProvider";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";
import Skeleton from "@/components/ui/Skeleton";

export default function RiderManagementAdminPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [riders, setRiders] = useState<any[]>([]);
  const [filteredRiders, setFilteredRiders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFilteredRiders(
      riders.filter(r => 
        r.name?.toLowerCase().includes(term) || 
        r.email?.toLowerCase().includes(term) ||
        r.displayId?.toLowerCase().includes(term)
      )
    );
  }, [search, riders]);

  async function fetchRiders() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/riders");
      const data = await res.json() as any;
      if (data.riders) {
        setRiders(data.riders);
        setFilteredRiders(data.riders);
      }
    } catch (err) {
      console.error("Failed to fetch riders:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await fetch("/api/admin/riders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      showToast(newStatus === 'active' ? t('admin.riders.form.verified') : t('admin.riders.form.suspended'), "success");
    } catch (err) {
      console.error("Failed to update status", err);
      showToast(t('admin.common.toast.error'), "error");
    }
  }

  async function deleteRider(id: string) {
    if (!window.confirm(t('admin.common.confirmDelete', { item: t('admin.common.rider') }))) return;
    
    try {
      const res = await fetch("/api/admin/riders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      
      if (!res.ok) throw new Error("Failed to delete");
      
      setRiders(prev => prev.filter(r => r.id !== id));
      showToast(t('admin.common.toast.deleted', { item: t('admin.common.rider') }), "success");
    } catch (err) {
      console.error(err);
      showToast(t('admin.common.toast.error'), "error");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight lowercase">{t('admin.riders.list.title')}</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">{t('admin.riders.list.subtitle')}</p>
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
            href="/admin/riders/new"
            className="px-8 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto shrink-0"
          >
            <Icons.Plus size={16} /> {t('admin.riders.list.newBtn')}
          </Link>
        </div>
      </header>

      <Card className="bg-white border border-slate-200/60 shadow-xl shadow-slate-200/20 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredRiders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
               <Icons.Search size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{search ? t('admin.users.noUsers') : t('admin.riders.list.empty')}</p>
            {search ? (
              <button onClick={() => setSearch("")} className="mt-4 text-primary font-bold text-xs hover:underline decoration-2 underline-offset-4">{t('admin.users.clearSearch')}</button>
            ) : (
              <Link href="/admin/riders/new" className="mt-4 text-primary font-black text-sm uppercase tracking-tight hover:underline">{t('admin.riders.list.emptyAction')}</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">{t('admin.riders.list.table.rider')}</th>
                  <th className="px-8 py-5">{t('admin.riders.list.table.vehicle')}</th>
                  <th className="px-8 py-5">{t('admin.riders.form.docs')}</th>
                  <th className="px-8 py-5">{t('admin.riders.list.table.contact')}</th>
                  <th className="px-8 py-5">{t('admin.riders.list.table.status')}</th>
                  <th className="px-8 py-5 text-right">{t('admin.riders.list.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRiders.map(rider => (
                  <tr key={rider.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden font-black ring-4 ring-white relative group/avatar">
                            {rider.pictureUrl ? (
                               <img 
                                 src={rider.pictureUrl.startsWith('data:') ? rider.pictureUrl : `/api/admin/documents/${rider.pictureUrl}`} 
                                 alt={rider.name} 
                                 className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110" 
                               />
                            ) : (
                               rider.name?.[0]?.toUpperCase() || 'R'
                            )}
                         </div>
                         <div className="flex flex-col">
                            <span className="font-black text-slate-900 tracking-tight">{rider.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">{rider.email}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-black text-primary uppercase">{rider.displayId || rider.id.slice(0, 8)}</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 capitalize">
                             {rider.vehicleType === 'bike' ? <Icons.Bike size={10} /> : <Icons.Car size={10} />}
                             <span>{rider.vehicleType} • {rider.licensePlate || "N/A"}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex gap-2 transform group-hover:translate-x-1 transition-transform">
                          {[
                            { type: 'id_card', icon: <Icons.User size={10} />, label: 'ID' },
                            { type: 'license', icon: <Icons.Shield size={10} />, label: 'DL' },
                            { type: 'vehicle_front', icon: <Icons.Bike size={10} />, label: 'VH' }
                          ].map(docCfg => {
                             const doc = rider.documents?.find((d: any) => d.type === docCfg.type);
                             return (
                                <div 
                                  key={docCfg.type} 
                                  title={`${docCfg.label}: ${doc?.status || 'missing'}`}
                                  className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                                    doc?.status === 'verified' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' :
                                    doc?.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-500' :
                                    'bg-slate-50 border-slate-100 text-slate-300'
                                  }`}
                                >
                                   {docCfg.icon}
                                </div>
                             );
                          })}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-xs font-black text-slate-600 font-mono italic">{rider.phone || "No phone"}</span>
                    </td>
                     <td className="px-8 py-6">
                        <Badge variant={
                          rider.status === 'active' ? "success" : 
                          rider.status === 'pending' ? "warning" : 
                          "danger"
                        }>
                           {rider.status === 'active' ? t('admin.riders.form.verified') : 
                            rider.status === 'pending' ? t('admin.riders.form.pendingReview') : 
                            t('admin.riders.form.rejected')}
                        </Badge>
                     </td>
                    <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <Link 
                             href={`/admin/riders/${rider.id}`}
                             className="w-10 h-10 bg-slate-100 hover:bg-primary hover:text-white text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95"
                           >
                             <Icons.Edit size={18} />
                           </Link>
                            <button 
                              onClick={() => toggleStatus(rider.id, rider.status)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border ${rider.status === 'active' ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}
                            >
                              {rider.status === 'active' ? t('common.suspend') : rider.status === 'pending' ? t('common.review') : t('common.activate')}
                            </button>
                            <button 
                              onClick={() => deleteRider(rider.id)}
                              className="w-10 h-10 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all group-hover:bg-rose-50/50"
                              title={t('common.delete')}
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
