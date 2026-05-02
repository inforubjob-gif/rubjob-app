"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";

export default function ProvidersAdminPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/providers");
      const data = await res.json();
      if (data.providers) setProviders(data.providers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setProviders(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        showToast(t("admin.common.toast.updated", { item: "Provider" }), "success");
      }
    } catch (err) {
      showToast(t("admin.common.toast.error"), "error");
    }
  }

  const filtered = providers.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight lowercase">จัดการผู้ให้บริการ (Gigs)</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">อนุมัติและตรวจสอบเหล่า Freelancer ในระบบ</p>
        </div>
        
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm w-full md:w-80 group focus-within:ring-4 focus-within:ring-primary/10 transition-all">
          <div className="px-5 py-3 bg-slate-50 border-r border-slate-100 text-slate-400 group-focus-within:text-primary transition-colors flex items-center shrink-0">
            <Icons.Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ หรือ อีเมล..." 
            className="px-5 py-3 outline-none text-sm font-bold flex-1 bg-white" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <Card className="bg-white border border-slate-200/60 shadow-xl shadow-slate-200/20 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
               <Icons.User size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">ไม่พบผู้ให้บริการ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">ข้อมูลโปรไฟล์</th>
                  <th className="px-8 py-5">จำนวน Gig</th>
                  <th className="px-8 py-5">ลงทะเบียนเมื่อ</th>
                  <th className="px-8 py-5">สถานะ</th>
                  <th className="px-8 py-5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                          {p.pictureUrl ? <img src={p.pictureUrl} alt="" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-slate-300"><Icons.User size={24} /></div>}
                        </div>
                        <div>
                          <span className="font-black text-slate-900 block leading-tight">{p.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 block mt-1">{p.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-600 text-xs font-black rounded-lg border border-violet-100">
                        <Icons.Stars size={12} /> {p.gigCount} Gigs
                      </span>
                    </td>
                    <td className="px-8 py-6 text-slate-500 font-medium text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6">
                       <Badge variant={p.status === 'active' ? 'success' : p.status === 'suspended' ? 'danger' : 'warning'}>
                         {p.status === 'active' ? 'อนุมัติแล้ว' : p.status === 'suspended' ? 'ระงับชั่วคราว' : 'รอดำเนินการ'}
                       </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {p.status !== 'active' && (
                            <button 
                              onClick={() => updateStatus(p.id, 'active')}
                              className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                            >
                              Approve
                            </button>
                          )}
                          {p.status === 'active' && (
                            <button 
                              onClick={() => updateStatus(p.id, 'suspended')}
                              className="px-4 py-2 bg-rose-50 text-rose-500 border border-rose-100 text-[10px] font-black uppercase rounded-xl hover:bg-rose-100 transition-all"
                            >
                              Suspend
                            </button>
                          )}
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
