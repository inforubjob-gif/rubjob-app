"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import dynamic from "next/dynamic";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/providers/ToastProvider";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center font-bold text-slate-400">Initializing Map Picker...</div>
});

interface StoreFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function StoreForm({ initialData, isEdit }: StoreFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [allServices, setAllServices] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    ownerId: initialData?.ownerId || "system",
    email: initialData?.email || "",
    password: initialData?.password || "",
    address: initialData?.address || "",
    lat: initialData?.lat?.toString() || "13.7563",
    lng: initialData?.lng?.toString() || "100.5018",
    serviceRadiusKm: initialData?.serviceRadiusKm?.toString() || "5.0",
    baseDeliveryFee: initialData?.baseDeliveryFee?.toString() || "0",
    extraFeePerKm: initialData?.extraFeePerKm?.toString() || "10",
    phone: initialData?.phone || "",
    bankName: initialData?.bankName || "",
    accountNumber: initialData?.accountNumber || "",
    accountName: initialData?.accountName || "",
    status: initialData?.status || "active",
    services: initialData?.services || [] as any[], // [{ serviceId, price }]
    documents: initialData?.documents || [] as any[] // [{ type, url, status, notes }]
  });

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      const res = await fetch("/api/services");
      const data = await res.json() as any;
      if (data.services) setAllServices(data.services);
    } catch (err) {
      console.error(err);
    }
  }

  const handlePriceChange = (serviceId: string, price: string) => {
    setFormData(prev => {
      const existing = prev.services.find((s: any) => s.serviceId === serviceId);
      let newServices;
      if (existing) {
        if (price === "" && !existing.selected) { // Cleanup if empty and not selected (though handled by toggle)
            newServices = prev.services.filter((s: any) => s.serviceId !== serviceId);
        } else {
            newServices = prev.services.map((s: any) => 
                s.serviceId === serviceId ? { ...s, price: price === "" ? null : parseFloat(price) } : s
            );
        }
      } else {
        newServices = [...prev.services, { serviceId, price: parseFloat(price) || null }];
      }
      return { ...prev, services: newServices };
    });
  };

  const handleDocChange = (type: string, field: string, value: string) => {
    setFormData(prev => {
      const existing = prev.documents.find((d: any) => d.type === type);
      let newDocs;
      if (existing) {
        newDocs = prev.documents.map((d: any) => d.type === type ? { ...d, [field]: value } : d);
      } else {
        newDocs = [...prev.documents, { type, status: 'pending', url: '', notes: '', [field]: value }];
      }
      return { ...prev, documents: newDocs };
    });
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => {
      const isSelected = prev.services.some((s: any) => s.serviceId === serviceId);
      if (isSelected) {
        return { ...prev, services: prev.services.filter((s: any) => s.serviceId !== serviceId) };
      } else {
        return { ...prev, services: [...prev.services, { serviceId, price: null }] };
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🛡️ Final Validation
    if (!formData.name.trim()) return showToast("Store Name is required", "error");
    if (!formData.address.trim()) return showToast("Physical Address is required", "error");
    if (!formData.email.trim()) return showToast("Store Login Email is required", "error");
    if (!isEdit && !formData.password.trim()) return showToast("Initial Password is required", "error");
    if (formData.services.length === 0) return showToast("Please select at least one service", "error");

    setIsSaving(true);
    
    const payload = {
      ...formData,
      lat: parseFloat(formData.lat) || 0,
      lng: parseFloat(formData.lng) || 0,
      serviceRadiusKm: parseFloat(formData.serviceRadiusKm) || 5,
      baseDeliveryFee: parseFloat(formData.baseDeliveryFee) || 0,
      extraFeePerKm: parseFloat(formData.extraFeePerKm) || 0,
      id: initialData?.id
    };

    try {
      const res = await fetch("/api/admin/stores", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json() as any;

      if (res.ok) {
        showToast(isEdit ? "Branch updated successfully" : "New branch established!", "success");
        setTimeout(() => {
          router.push("/admin/stores");
          router.refresh();
        }, 1500);
      } else {
        showToast(data.error || "Failed to save branch. Ensure the Owner ID exists.", "error");
      }
    } catch (err) {
      console.error("Save failed", err);
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialData.id, status: 'active', isActive: 1 })
      });
      if (res.ok) {
        showToast("Branch Authorized! It is now visible to customers.", "success");
        router.push("/admin/stores");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {initialData?.status === 'pending' && (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-primary/5">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white animate-pulse">
                 <Icons.Shield size={24} />
              </div>
              <div>
                 <h3 className="font-black text-slate-900 uppercase tracking-tight">{t('admin.stores.form.pendingApplication')}</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase">Review business documentation before activation</p>
              </div>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                {isSaving ? t('common.processing') : t('admin.stores.form.verifyBtn')}
              </button>
           </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Basic Info & Map */}
        <div className="lg:col-span-2 space-y-8">
           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <Icons.Office size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.stores.form.branchIdentity')}</h2>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2 ml-1">{t('admin.stores.form.storeName')}</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Rubjob Sukhumvit Primary"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all shadow-inner shadow-slate-200/20"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2 ml-1">{t('admin.stores.form.pinMap')}</label>
                    <MapPicker 
                      lat={parseFloat(formData.lat)} 
                      lng={parseFloat(formData.lng)} 
                      onChange={(lat, lng) => setFormData({...formData, lat: lat.toFixed(6), lng: lng.toFixed(6)})}
                    />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Latitude</span>
                          <span className="text-sm font-mono font-black text-slate-700">{formData.lat}</span>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Longitude</span>
                          <span className="text-sm font-mono font-black text-slate-700">{formData.lng}</span>
                       </div>
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2 ml-1">{t('admin.stores.form.addressDetail')}</label>
                    <textarea 
                      required
                      rows={3}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      placeholder="Street number, building name, floor, district..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2 ml-1">{t('admin.stores.form.phone')}</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="e.g. 081-234-5678"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                    />
                 </div>
              </div>
           </Card>

           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                     <Icons.Shield size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.stores.form.docs')}</h2>
               </div>
               
               <div className="space-y-6">
                  {['business_license', 'owner_id', 'storefront'].map(docType => {
                     const doc = formData.documents.find((d: any) => d.type === docType) || { status: 'none', url: '', notes: '' };
                     return (
                        <div key={docType} className="p-6 rounded-xl border-2 border-slate-50 bg-slate-50/20 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{docType.replace('_', ' ').toUpperCase()}</span>
                              <select 
                                 value={doc.status}
                                 onChange={e => handleDocChange(docType, 'status', e.target.value)}
                                 className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border-2 focus:outline-none ${
                                    doc.status === 'verified' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                    doc.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                    'bg-white border-slate-100 text-slate-400'
                                 }`}
                              >
                                 <option value="none">Not Submitted</option>
                                 <option value="pending">Pending Review</option>
                                 <option value="verified">Verified Official</option>
                                 <option value="rejected">Rejected / Invalid</option>
                              </select>
                           </div>
                           
                           {doc.url && (
                             <div className="aspect-[16/7] rounded-xl overflow-hidden border-2 border-slate-100">
                                <img src={doc.id ? `/api/admin/documents/${doc.id}` : doc.url} alt={docType} className="w-full h-full object-cover" />
                             </div>
                           )}
                           
                           <div>
                              <label className="text-[9px] uppercase font-black text-slate-400 block mb-1 ml-1">Internal Review Notes</label>
                              <textarea 
                                rows={2}
                                value={doc.notes}
                                onChange={e => handleDocChange(docType, 'notes', e.target.value)}
                                placeholder="Audit findings..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-indigo-400 transition-all"
                              />
                           </div>
                        </div>
                     );
                  })}
               </div>
            </Card>
           
           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Icons.Ticket size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.stores.form.servicesPricing')}</h2>
              </div>
              
              <div className="overflow-hidden border border-slate-100 rounded-xl">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.stores.form.service')}</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.stores.form.masterPrice')}</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">{t('admin.stores.form.storePrice')}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {allServices.map(svc => {
                          const storeSvc = formData.services.find(s => s.serviceId === svc.id);
                          const isSelected = !!storeSvc;
                          
                          return (
                             <tr key={svc.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                                <td className="px-6 py-5">
                                   <label className="flex items-center gap-3 cursor-pointer">
                                      <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleService(svc.id)}
                                        className="w-5 h-5 rounded-lg text-indigo-600 border-2 border-slate-200 focus:ring-indigo-500"
                                      />
                                      <div>
                                         <p className="text-sm font-black text-slate-900">{svc.name}</p>
                                         <p className="text-[10px] text-slate-400 font-bold uppercase">{svc.category}</p>
                                      </div>
                                   </label>
                                </td>
                                <td className="px-6 py-5">
                                   <span className="text-xs font-bold text-slate-400 italic">฿{svc.basePrice}</span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                   {isSelected ? (
                                      <div className="flex justify-end">
                                         <input 
                                           type="number"
                                           value={storeSvc.price !== null ? storeSvc.price : ""}
                                           onChange={e => handlePriceChange(svc.id, e.target.value)}
                                           placeholder={svc.basePrice.toString()}
                                           className="w-24 bg-white border-2 border-indigo-100 rounded-xl px-3 py-2 text-sm font-black text-indigo-600 text-right focus:outline-none focus:border-indigo-400"
                                         />
                                      </div>
                                   ) : (
                                      <span className="text-[10px] font-black text-slate-300 uppercase italic">{t('admin.stores.form.notAuthorized')}</span>
                                   )}
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>
        
        {/* Right Column: Fees & Operational Settings */}
        <div className="space-y-8">
           <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Icons.Navigation size={20} />
                 </div>
                 <h2 className="text-xl font-black uppercase tracking-tight">{t('admin.stores.form.logistics')}</h2>
              </div>
              
              <div className="space-y-8">
                 <div>
                    <div className="flex justify-between items-center mb-4">
                       <label className="text-[10px] uppercase font-black text-white/50 tracking-widest">{t('admin.stores.form.radius')}</label>
                       <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-black">{formData.serviceRadiusKm} km</span>
                    </div>
                    <input 
                      type="range" min="1" max="50" step="0.5"
                      value={formData.serviceRadiusKm}
                      onChange={e => setFormData({...formData, serviceRadiusKm: e.target.value})}
                      className="w-full accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
                 
                 <div className="grid grid-cols-1 gap-6">
                    <div>
                       <label className="text-[10px] uppercase font-black text-white/50 tracking-widest block mb-2">{t('admin.stores.form.baseFee')}</label>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-black">฿</span>
                          <input 
                            type="number"
                            value={formData.baseDeliveryFee}
                            onChange={e => setFormData({...formData, baseDeliveryFee: e.target.value})}
                            className="w-full bg-white/10 border-2 border-white/10 rounded-xl px-10 py-4 text-sm font-bold focus:outline-none focus:border-white/30 transition-all"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] uppercase font-black text-white/50 tracking-widest block mb-2">{t('admin.stores.form.extraFee')}</label>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-black">฿</span>
                          <input 
                            type="number"
                            value={formData.extraFeePerKm}
                            onChange={e => setFormData({...formData, extraFeePerKm: e.target.value})}
                            className="w-full bg-white/10 border-2 border-white/10 rounded-xl px-10 py-4 text-sm font-bold focus:outline-none focus:border-white/30 transition-all"
                          />
                       </div>
                    </div>
                 </div>
              </div>
           </Card>

           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                    <Icons.Wallet size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.riders.form.payoutInfo')}</h2>
              </div>
              
              <div className="space-y-5">
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Bank Name</label>
                    <select 
                      value={formData.bankName}
                      onChange={e => setFormData({...formData, bankName: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                    >
                       <option value="">Select Bank / PromptPay</option>
                       <option value="PromptPay">PromptPay (Mobile/ID)</option>
                       <option value="KBank">Kasikorn (KBank)</option>
                       <option value="SCB">Siam Commercial (SCB)</option>
                       <option value="BBL">Bangkok Bank (BBL)</option>
                       <option value="KTB">Krungthai (KTB)</option>
                       <option value="Krungsri">Krungsri (BAY)</option>
                       <option value="TTB">TMBThanachart (TTB)</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Account Number / PromptPay ID</label>
                    <input 
                      value={formData.accountNumber}
                      onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                      placeholder="000-0-00000-0"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">Account Holder Name</label>
                    <input 
                      value={formData.accountName}
                      onChange={e => setFormData({...formData, accountName: e.target.value})}
                      placeholder="As shown in bank book"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                    />
                 </div>
              </div>
           </Card>

           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                     <Icons.Lock size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Store Credentials</h2>
               </div>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2 ml-1">Login Email</label>
                     <input 
                       required
                       type="email"
                       value={formData.email}
                       onChange={e => setFormData({...formData, email: e.target.value})}
                       placeholder="branch-email@rubjob.com"
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2 ml-1">
                        {isEdit ? "New Password (Leave blank to keep current)" : "Initial Password"}
                     </label>
                     <input 
                       required={!isEdit}
                       type="text"
                       value={formData.password}
                       onChange={e => setFormData({...formData, password: e.target.value})}
                       placeholder="••••••••"
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                     />
                  </div>
               </div>
               <p className="text-[10px] text-slate-400 font-medium mt-6 leading-relaxed">
                  These credentials will allow the branch manager to login to the **Merchant Portal** to manage incoming orders and laundry operations.
               </p>
            </Card>

           <div className="pt-4">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-slate-900 text-white py-6 rounded-xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? t('admin.stores.form.syncing') : isEdit ? t('admin.stores.form.updateBtn') : t('admin.stores.form.establishBtn')}
              </button>
              <button 
                type="button"
                onClick={() => router.back()}
                className="w-full mt-4 bg-white border border-slate-200 text-slate-400 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-all"
              >
                {t('admin.stores.form.discard')}
              </button>
           </div>
        </div>
      </div>
    </form>
  );
}
