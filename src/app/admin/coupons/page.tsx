"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function CouponsAdminPage() {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage", // percentage, fixed
    value: "",
    minOrder: "0",
    maxDiscount: "",
    expiryDate: "",
    usageLimit: "",
    isVisible: false
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json() as any;
      if (data.coupons) setCoupons(data.coupons);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ code: "", type: "percentage", value: "", minOrder: "0", maxDiscount: "", expiryDate: "", usageLimit: "", isVisible: false });
        fetchCoupons();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create coupon");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setIsSaving(false);
    }
  };

  async function toggleStatus(id: string, currentStatus: number) {
    try {
      await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: currentStatus === 1 ? 0 : 1 })
      });
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive: currentStatus === 1 ? 0 : 1 } : c));
    } catch (err) {
      console.error("Toggle failed", err);
    }
  }

  async function toggleVisibility(id: string, currentVisibility: number) {
    try {
      await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isVisible: currentVisibility === 1 ? 0 : 1 })
      });
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, isVisible: currentVisibility === 1 ? 0 : 1 } : c));
    } catch (err) {
      console.error("Toggle visibility failed", err);
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete coupon ${code}?`)) return;
    try {
      await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{t('admin.coupons.title')}</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">{t('admin.coupons.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Icons.Plus size={16} /> {t('admin.coupons.newBtn')}
        </button>
      </header>

      <Card className="bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 italic text-slate-400">
             {t('admin.coupons.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">{t('admin.coupons.table.promoCode')}</th>
                  <th className="px-6 py-4">{t('admin.coupons.table.discount')}</th>
                  <th className="px-6 py-4">{t('admin.coupons.table.usage')}</th>
                  <th className="px-6 py-4">{t('admin.coupons.table.expiry')}</th>
                  <th className="px-6 py-4">{t('admin.coupons.table.status')}</th>
                  <th className="px-6 py-4 text-right">{t('admin.coupons.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 tracking-tight">{coupon.code}</span>
                            {coupon.isVisible === 1 && (
                               <span className="text-[8px] font-black text-indigo-500 uppercase bg-indigo-50 px-1 py-0.5 rounded leading-none">{t('admin.coupons.status.wallet')}</span>
                            )}
                         </div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {coupon.isVisible === 1 ? t('admin.coupons.status.public') : t('admin.coupons.status.exclusive')}
                         </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-black text-indigo-600">
                          {coupon.type === 'percentage' ? `${coupon.value}%` : `฿${coupon.value}`}
                       </span>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                          Min ฿{coupon.minOrder || 0}
                       </p>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900 text-xs">{coupon.usedCount || 0} / {coupon.usageLimit || "∞"}</span>
                          <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-primary" 
                                style={{ width: coupon.usageLimit ? `${Math.min(100, (coupon.usedCount / coupon.usageLimit) * 100)}%` : '0%' }}
                             />
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-xs text-slate-500">
                       {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : t('admin.coupons.noExpiry')}
                    </td>
                    <td className="px-6 py-4">
                       <Badge variant={coupon.isActive === 1 ? "success" : "danger"}>
                          {coupon.isActive === 1 ? t('admin.coupons.status.active') : t('admin.coupons.status.disabled')}
                       </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => toggleVisibility(coupon.id, coupon.isVisible)}
                            title={coupon.isVisible === 1 ? "Hide from customer wallet" : "Show in customer wallet"}
                            className={`p-1.5 rounded-lg transition-colors border ${coupon.isVisible === 1 ? 'text-indigo-500 border-indigo-100 bg-indigo-50' : 'text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                          >
                            {coupon.isVisible === 1 ? <Icons.Check size={16} /> : <Icons.Settings size={16} />}
                          </button>
                          <button 
                            onClick={() => toggleStatus(coupon.id, coupon.isActive)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 ${coupon.isActive === 1 ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                          >
                            {coupon.isActive === 1 ? t('admin.coupons.lock') : t('admin.coupons.unlock')}
                          </button>
                          <button 
                            onClick={() => handleDelete(coupon.id, coupon.code)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
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

      {/* New Coupon Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('admin.coupons.modal.title')}>
         <form onSubmit={handleCreate} className="space-y-6 pt-2 h-[80vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="p-4 bg-indigo-50 rounded-3xl border border-indigo-100">
               <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.isVisible ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                     <input 
                       type="checkbox"
                       checked={formData.isVisible}
                       onChange={e => setFormData({...formData, isVisible: e.target.checked})}
                       className="hidden"
                     />
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isVisible ? 'left-7' : 'left-1'}`} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{t('admin.coupons.modal.visibilityTitle')}</span>
                     <span className="text-[10px] text-slate-500 font-medium">{t('admin.coupons.modal.visibilitySub')}</span>
                  </div>
               </label>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.coupons.modal.code')}</label>
                  <input 
                    required
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="e.g. RUBJOB2026"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.coupons.modal.type')}</label>
                     <select 
                       value={formData.type}
                       onChange={e => setFormData({...formData, type: e.target.value})}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                     >
                        <option value="percentage">{t('admin.coupons.modal.typePercent')}</option>
                        <option value="fixed">{t('admin.coupons.modal.typeFixed')}</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.coupons.modal.value')}</label>
                     <input 
                       required type="number"
                       value={formData.value}
                       onChange={e => setFormData({...formData, value: e.target.value})}
                       placeholder={formData.type === 'percentage' ? "10" : "150"}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                     />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.coupons.modal.minOrder')}</label>
                     <input 
                       type="number"
                       value={formData.minOrder}
                       onChange={e => setFormData({...formData, minOrder: e.target.value})}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.coupons.modal.maxUses')}</label>
                     <input 
                       type="number"
                       value={formData.usageLimit}
                       onChange={e => setFormData({...formData, usageLimit: e.target.value})}
                       placeholder="Unlimited"
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                     />
                  </div>
               </div>

               <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.coupons.modal.expiration')}</label>
                  <input 
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                  />
               </div>
            </div>

            <button 
              disabled={isSaving}
              className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? t('admin.coupons.modal.syncing') : t('admin.coupons.modal.deploy')}
            </button>
         </form>
      </Modal>
    </div>
  );
}
