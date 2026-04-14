"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";
import Skeleton from "@/components/ui/Skeleton";

export default function RiderManagementAdminPage() {
  const { showToast } = useToast();
  const [riders, setRiders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRiders();
  }, []);

  async function fetchRiders() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/riders");
      const data = await res.json();
      if (data.riders) setRiders(data.riders);
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
      setRiders(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      showToast(`Rider ${newStatus} successfully`, "success");
    } catch (err) {
      console.error("Failed to update status", err);
      showToast("Failed to update rider status", "error");
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Fleet Directory</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">Manage delivery personnel, vehicles, and verification documents</p>
        </div>
        <Link 
          href="/admin/riders/new"
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Icons.Plus size={16} /> New Rider
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-white border border-slate-200/60 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Skeleton variant="circle" className="w-12 h-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-1/2 h-4" />
                    <Skeleton variant="text" className="w-1/4 h-3" />
                  </div>
                </div>
                <Skeleton variant="rect" className="w-full h-20 rounded-xl" />
              </Card>
            ))}
          </div>
        ) : riders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
               <Icons.Users size={40} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No riders registered yet.</p>
            <Link href="/admin/riders/new" className="mt-4 text-primary font-black text-sm uppercase tracking-tight hover:underline">Add first rider →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {riders.map(rider => (
              <Card key={rider.id} className="bg-white border border-slate-200/60 shadow-sm overflow-hidden flex flex-col hover:border-primary/40 transition-colors group">
                 <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-lg shadow-slate-200">
                          {rider.name?.[0]?.toUpperCase() || 'R'}
                       </div>
                       <div>
                          <h2 className="font-black text-slate-900 leading-none mb-1">{rider.name}</h2>
                          <Badge variant={rider.status === 'active' ? "success" : "danger"}>
                             {rider.status === 'active' ? "Active" : "Suspended"}
                          </Badge>
                       </div>
                    </div>
                    <div className="flex gap-1">
                       <Link 
                         href={`/admin/riders/${rider.id}`}
                         className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                       >
                          <Icons.Edit size={18} />
                       </Link>
                    </div>
                 </div>
                 
                 <div className="p-5 space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                             {rider.vehicleType === 'bike' ? <Icons.Bike size={14} className="text-indigo-500" /> : <Icons.Car size={14} className="text-indigo-500" />}
                             <span className="capitalize">{rider.vehicleType}</span>
                          </div>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plate</p>
                          <p className="text-xs font-mono font-black text-slate-900 underline decoration-indigo-200 decoration-2">{rider.licensePlate || "N/A"}</p>
                       </div>
                    </div>
                    
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Documents Status</p>
                       <div className="flex gap-1.5 flex-wrap">
                          {['id_card', 'license', 'insurance'].map(type => {
                             const doc = rider.documents?.find((d: any) => d.type === type);
                             return (
                                <span key={type} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                   doc?.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                   doc?.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                   'bg-slate-50 text-slate-400 border border-slate-100'
                                }`}>
                                   {type.replace('_', ' ')}
                                </span>
                             );
                          })}
                       </div>
                    </div>
                 </div>
                 
                 <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Icons.Phone size={12} className="text-slate-300" />
                       <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{rider.phone || "No phone"}</span>
                    </div>
                    <Link href={`/admin/riders/${rider.id}`} className="text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Profile →</Link>
                 </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
