"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";

export default function CouponsAdminPage() {
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
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Coupon Management</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">Create marketing codes and wallet-based promotions</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Icons.Plus size={16} /> New Coupon
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
             <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-slate-100 italic text-slate-400">
             No coupons found. Create your first one to boost sales!
          </div>
        ) : (
          coupons.map(coupon => (
            <Card key={coupon.id} className={`bg-white border shadow-sm overflow-hidden flex flex-col group transition-all ${coupon.isVisible === 1 ? 'border-indigo-100 ring-2 ring-indigo-50/50' : 'border-slate-200/60'}`}>
               <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-lg font-black text-slate-900 tracking-tight">{coupon.code}</span>
                       <Badge variant={coupon.isActive === 1 ? "success" : "danger"}>
                          {coupon.isActive === 1 ? "Active" : "Disabled"}
                       </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                       {coupon.isVisible === 1 ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded">
                             <Icons.Check size={10} /> Public in Wallet
                          </span>
                       ) : (
                          <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded">
                             <Icons.Lock size={10} /> Private Code
                          </span>
                       )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                     <button 
                       onClick={() => toggleVisibility(coupon.id, coupon.isVisible)}
                       title={coupon.isVisible === 1 ? "Hide from customer wallet" : "Show in customer wallet"}
                       className={`p-2 rounded-lg transition-colors ${coupon.isVisible === 1 ? 'text-indigo-500 bg-indigo-50' : 'text-slate-400 hover:bg-slate-50'}`}
                     >
                        {coupon.isVisible === 1 ? <Icons.Check size={18} /> : <Icons.Settings size={18} />}
                     </button>
                     <button 
                       onClick={() => toggleStatus(coupon.id, coupon.isActive)}
                       className={`p-2 rounded-lg transition-colors ${coupon.isActive === 1 ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                     >
                        {coupon.isActive === 1 ? <Icons.Lock size={18} /> : <Icons.Refresh size={18} />}
                     </button>
                     <button 
                       onClick={() => handleDelete(coupon.id, coupon.code)}
                       className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                     >
                        <Icons.Trash size={18} />
                     </button>
                  </div>
               </div>
               
               <div className="p-5 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                     <span className="text-slate-400">Discount</span>
                     <span className="text-indigo-600 font-black">{coupon.type === 'percentage' ? `${coupon.value}%` : `฿${coupon.value}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                     <span className="text-slate-400">Min. Order</span>
                     <span className="text-slate-900 font-bold">฿{coupon.minOrder || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                     <span className="text-slate-400">Claims</span>
                     <span className="text-slate-900 font-bold">{coupon.usedCount || 0} / {coupon.usageLimit || "∞"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium pt-1 border-t border-slate-50 mt-2">
                     <span className="text-slate-400">Expires</span>
                     <span className="text-slate-900 font-bold">{coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : "Never"}</span>
                  </div>
               </div>
               
               <div className={`px-5 py-3 border-t flex items-center justify-center text-[10px] uppercase font-black tracking-widest italic transition-colors ${coupon.isVisible === 1 ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  {coupon.isVisible === 1 ? "Customer Wallet Visible" : "Exclusive Private Promo"}
               </div>
            </Card>
          ))
        )}
      </div>

      {/* New Coupon Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Marketing Coupon">
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
                     <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Public Wallet Visibility</span>
                     <span className="text-[10px] text-slate-500 font-medium">If enabled, this coupon will show up in every customer's coupon list.</span>
                  </div>
               </label>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Coupon Code</label>
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
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Discount Type</label>
                     <select 
                       value={formData.type}
                       onChange={e => setFormData({...formData, type: e.target.value})}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                     >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (฿)</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Value</label>
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
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Min order setup ฿</label>
                     <input 
                       type="number"
                       value={formData.minOrder}
                       onChange={e => setFormData({...formData, minOrder: e.target.value})}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Max uses (Overall)</label>
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
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Expiration Date</label>
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
              {isSaving ? "Syncing Promo..." : "Deploy Promotional Code"}
            </button>
         </form>
      </Modal>
    </div>
  );
}
