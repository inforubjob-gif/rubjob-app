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

  async function deleteRider(id: string) {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this rider? This cannot be undone.")) return;
    
    try {
      const res = await fetch("/api/admin/riders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      
      if (!res.ok) throw new Error("Failed to delete");
      
      setRiders(prev => prev.filter(r => r.id !== id));
      showToast("Rider deleted permanently", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete rider", "error");
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

      <Card className="bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Rider</th>
                  <th className="px-6 py-4">ID / Vehicle</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riders.map(rider => (
                  <tr key={rider.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden font-black">
                            {rider.name?.[0]?.toUpperCase() || 'R'}
                         </div>
                         <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{rider.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{rider.email}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-primary uppercase">{rider.displayId || rider.id.slice(0, 8)}</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 capitalize">
                             {rider.vehicleType === 'bike' ? <Icons.Bike size={10} /> : <Icons.Car size={10} />}
                             <span>{rider.vehicleType} • {rider.licensePlate || "N/A"}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex gap-1.5 transform group-hover:scale-110 origin-left transition-transform">
                          {['id_card', 'license', 'insurance'].map(type => {
                             const doc = rider.documents?.find((d: any) => d.type === type);
                             return (
                                <div 
                                  key={type} 
                                  title={`${type.replace('_', ' ').toUpperCase()}: ${doc?.status || 'none'}`}
                                  className={`w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ${
                                    doc?.status === 'verified' ? 'bg-emerald-500 ring-emerald-100' :
                                    doc?.status === 'pending' ? 'bg-amber-500 ring-amber-100' :
                                    'bg-slate-200 ring-slate-100'
                                  }`}
                                />
                             );
                          })}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-bold text-slate-600 font-mono">{rider.phone || "No phone"}</span>
                    </td>
                     <td className="px-6 py-4">
                        <Badge variant={
                          rider.status === 'active' ? "success" : 
                          rider.status === 'pending' ? "warning" : 
                          "danger"
                        }>
                           {rider.status === 'active' ? 'Active' : 
                            rider.status === 'pending' ? 'Pending Review' : 
                            'Suspended'}
                        </Badge>
                     </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Link 
                             href={`/admin/riders/${rider.id}`}
                             className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                           >
                             <Icons.Edit size={16} />
                           </Link>
                           <button 
                             onClick={() => toggleStatus(rider.id, rider.status)}
                             className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 ${rider.status === 'active' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                           >
                             {rider.status === 'active' ? 'Suspend' : rider.status === 'pending' ? 'Review Application' : 'Activate'}
                           </button>
                           <button 
                             onClick={() => deleteRider(rider.id)}
                             className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                             title="Delete Rider"
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
