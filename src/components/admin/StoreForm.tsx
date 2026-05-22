"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import dynamic from "next/dynamic";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/providers/ToastProvider";

const MapPicker = dynamic(() => import("@/components/ui/GoogleMapPicker"), { 
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
  
  // Cost Matrix State
  const [washerCosts, setWasherCosts] = useState<{sizeKg: string; sizeLabel: string; priceCold: string; priceWarm: string; priceHot: string}[]>([]);
  const [dryerCosts, setDryerCosts] = useState<{sizeKg: string; sizeLabel: string; price: string; durationMinutes: string; extraPricePerMinute: string}[]>([]);
  const [isCostMatrixSaving, setIsCostMatrixSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    ownerId: initialData?.ownerId || "auto",
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

  // Custom (manual) services state
  const [customServices, setCustomServices] = useState<{id: string; name: string; category: string; price: string}[]>(() => {
    // Restore custom services from initialData if editing
    const saved = initialData?.services || [];
    return saved
      .filter((s: any) => s.isCustom)
      .map((s: any) => ({ id: s.serviceId, name: s.customName || s.serviceId, category: s.customCategory || 'custom', price: s.price?.toString() || '' }));
  });
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [newCustomPrice, setNewCustomPrice] = useState('');

  // Helper: translate known service names by ID
  const getServiceName = (svcId: string, fallbackName: string) => {
    const key = `admin.stores.form.serviceNames.${svcId}` as any;
    const translated = t(key);
    // If key resolves to itself (missing key), fall back to DB name
    return translated && translated !== key ? translated : fallbackName;
  };

  useEffect(() => {
    fetchServices();
    if (isEdit && initialData?.id) fetchCostMatrix(initialData.id);
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

  async function fetchCostMatrix(storeId: string) {
    try {
      const res = await fetch(`/api/admin/stores/cost-matrix?storeId=${storeId}`);
      const data = await res.json() as any;
      if (data.washers) {
        setWasherCosts(data.washers.map((w: any) => ({
          sizeKg: w.sizeKg?.toString() || "",
          sizeLabel: w.sizeLabel || "",
          priceCold: w.priceCold?.toString() || "",
          priceWarm: w.priceWarm?.toString() || "",
          priceHot: w.priceHot?.toString() || "",
        })));
      }
      if (data.dryers) {
        setDryerCosts(data.dryers.map((d: any) => ({
          sizeKg: d.sizeKg?.toString() || "",
          sizeLabel: d.sizeLabel || "",
          price: d.price?.toString() || "",
          durationMinutes: d.durationMinutes?.toString() || "",
          extraPricePerMinute: d.extraPricePerMinute?.toString() || "",
        })));
      }
    } catch (err) {
      console.error("Failed to fetch cost matrix:", err);
    }
  }

  async function handleSaveCostMatrix() {
    if (!initialData?.id) return;
    setIsCostMatrixSaving(true);
    try {
      const res = await fetch("/api/admin/stores/cost-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: initialData.id,
          washers: washerCosts.filter(w => w.sizeKg && w.priceCold).map(w => ({
            sizeKg: parseFloat(w.sizeKg) || 0,
            sizeLabel: w.sizeLabel || null,
            priceCold: parseFloat(w.priceCold) || 0,
            priceWarm: parseFloat(w.priceWarm) || 0,
            priceHot: parseFloat(w.priceHot) || 0,
          })),
          dryers: dryerCosts.filter(d => d.sizeKg && d.price).map(d => ({
            sizeKg: parseFloat(d.sizeKg) || 0,
            sizeLabel: d.sizeLabel || null,
            price: parseFloat(d.price) || 0,
            durationMinutes: parseInt(d.durationMinutes) || null,
            extraPricePerMinute: parseFloat(d.extraPricePerMinute) || null,
          })),
        }),
      });
      if (res.ok) {
        showToast("บันทึกตารางต้นทุนเรียบร้อย", "success");
      } else {
        showToast("Failed to save cost matrix", "error");
      }
    } catch (err) {
      console.error("Cost matrix save failed:", err);
      showToast("Network error", "error");
    } finally {
      setIsCostMatrixSaving(false);
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
    
    // Merge custom services into formData.services before saving
    const mergedServices = [
      ...formData.services.filter((s: any) => !s.isCustom),
      ...customServices
        .filter(cs => cs.name.trim())
        .map(cs => ({
          serviceId: cs.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          price: parseFloat(cs.price) || null,
          isCustom: true,
          customName: cs.name,
          customCategory: cs.category || 'custom'
        }))
    ];
    if (!formData.name.trim()) return showToast("Store Name is required", "error");
    if (!formData.address.trim()) return showToast("Physical Address is required", "error");
    if (!formData.email.trim()) return showToast("Store Login Email is required", "error");
    if (!isEdit && !formData.password.trim()) return showToast("Initial Password is required", "error");
    if (mergedServices.length === 0) return showToast("Please select at least one service", "error");

    setIsSaving(true);
    
    const payload = {
      ...formData,
      services: mergedServices,
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
                    <div className="mt-4">
                       <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Google Maps Coordinates</label>
                          <input 
                            type="text"
                            value={formData.lat && formData.lng ? `${formData.lat}, ${formData.lng}` : ''}
                            onChange={e => {
                              const val = e.target.value.trim();
                              // Parse "lat, lng" or "lat,lng" format
                              const parts = val.split(',').map(s => s.trim());
                              if (parts.length === 2) {
                                const lat = parseFloat(parts[0]);
                                const lng = parseFloat(parts[1]);
                                if (!isNaN(lat) && !isNaN(lng)) {
                                  setFormData({...formData, lat: lat.toFixed(6), lng: lng.toFixed(6)});
                                  return;
                                }
                              }
                              // If single value or incomplete, store raw for editing
                              setFormData({...formData, lat: val, lng: ''});
                            }}
                            onPaste={e => {
                              e.preventDefault();
                              const pasted = e.clipboardData.getData('text').trim();
                              const parts = pasted.split(',').map(s => s.trim());
                              if (parts.length === 2) {
                                const lat = parseFloat(parts[0]);
                                const lng = parseFloat(parts[1]);
                                if (!isNaN(lat) && !isNaN(lng)) {
                                  setFormData({...formData, lat: lat.toFixed(6), lng: lng.toFixed(6)});
                                }
                              }
                            }}
                            placeholder="วาง lat, lng จาก Google Maps เช่น 16.46347, 102.82743"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono font-black text-slate-700 focus:outline-none focus:border-primary/50 transition-all placeholder:font-medium placeholder:text-slate-300 placeholder:text-xs"
                          />
                          {formData.lat && formData.lng && (
                            <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                              ✓ Lat: {formData.lat} / Lng: {formData.lng}
                            </p>
                          )}
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
                  {['business_license'].map(docType => {
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
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {allServices.map(svc => {
                          const isSelected = formData.services.some(s => s.serviceId === svc.id);
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
                                         <p className="text-sm font-black text-slate-900">{getServiceName(svc.id, svc.name)}</p>
                                         <p className="text-[10px] text-slate-400 font-bold uppercase">{svc.category}</p>
                                      </div>
                                   </label>
                                </td>
                             </tr>
                          );
                       })}

                       {/* Custom (Manual) Services */}
                       {customServices.map((cs, idx) => (
                         <tr key={`custom-${idx}`} className="bg-amber-50/30 transition-colors">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <div className="w-5 h-5 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                                 <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                               </div>
                               <div className="flex-1 min-w-0">
                                 <input
                                   type="text"
                                   value={cs.name}
                                   onChange={e => {
                                     const n = [...customServices];
                                     n[idx] = { ...n[idx], name: e.target.value };
                                     setCustomServices(n);
                                   }}
                                   placeholder={t('admin.stores.form.customServicePlaceholder')}
                                   className="w-full text-sm font-black text-slate-900 bg-transparent border-b border-amber-200 focus:border-amber-500 outline-none py-0.5 transition-colors"
                                 />
                                 <input
                                   type="text"
                                   value={cs.category}
                                   onChange={e => {
                                     const n = [...customServices];
                                     n[idx] = { ...n[idx], category: e.target.value };
                                     setCustomServices(n);
                                   }}
                                   placeholder={t('admin.stores.form.customCategoryLabel')}
                                   className="w-full text-[10px] font-bold text-slate-400 bg-transparent border-none outline-none mt-1"
                                 />
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Custom</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <input
                                 type="number"
                                 value={cs.price}
                                 onChange={e => {
                                   const n = [...customServices];
                                   n[idx] = { ...n[idx], price: e.target.value };
                                   setCustomServices(n);
                                 }}
                                 placeholder={t('admin.stores.form.customServicePricePlaceholder')}
                                 className="w-24 bg-white border-2 border-amber-200 rounded-xl px-3 py-2 text-sm font-black text-amber-600 text-right focus:outline-none focus:border-amber-400"
                               />
                               <button
                                 type="button"
                                 onClick={() => setCustomServices(prev => prev.filter((_, i) => i !== idx))}
                                 className="w-8 h-8 rounded-lg bg-white border border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-all text-xs font-black shrink-0"
                                 title={t('admin.stores.form.removeService')}
                               >
                                 ✕
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}

                       {/* Add Custom Service Row */}
                       <tr className="bg-slate-50/50">
                         <td colSpan={3} className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <input
                               type="text"
                               value={newCustomName}
                               onChange={e => setNewCustomName(e.target.value)}
                               onKeyDown={e => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   if (!newCustomName.trim()) return;
                                   setCustomServices(prev => [...prev, {
                                     id: `custom_${Date.now()}`,
                                     name: newCustomName.trim(),
                                     category: newCustomCategory.trim() || 'custom',
                                     price: newCustomPrice
                                   }]);
                                   setNewCustomName('');
                                   setNewCustomCategory('');
                                   setNewCustomPrice('');
                                 }
                               }}
                               placeholder={t('admin.stores.form.customServicePlaceholder')}
                               className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-primary/50 focus:outline-none transition-all placeholder:text-slate-300"
                             />
                             <input
                               type="number"
                               value={newCustomPrice}
                               onChange={e => setNewCustomPrice(e.target.value)}
                               placeholder="฿"
                               className="w-20 bg-white border-2 border-dashed border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-indigo-600 text-right focus:border-primary/50 focus:outline-none transition-all placeholder:text-slate-300"
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 if (!newCustomName.trim()) return;
                                 setCustomServices(prev => [...prev, {
                                   id: `custom_${Date.now()}`,
                                   name: newCustomName.trim(),
                                   category: newCustomCategory.trim() || 'custom',
                                   price: newCustomPrice
                                 }]);
                                 setNewCustomName('');
                                 setNewCustomCategory('');
                                 setNewCustomPrice('');
                               }}
                               className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark active:scale-95 transition-all shrink-0 shadow-sm shadow-primary/20"
                             >
                               {t('admin.stores.form.addCustomService')}
                             </button>
                           </div>
                         </td>
                       </tr>
                    </tbody>
                 </table>
               </div>
            </Card>

            {/* Cost Matrix — ตารางต้นทุนเครื่องซัก/อบ */}
            {isEdit && (
            <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                     <Icons.Wallet size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">ตารางต้นทุนเครื่องซัก / อบ</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Matrix — ราคาจริงที่ Rubber จ่ายให้ร้าน</p>
                  </div>
               </div>

               {/* Washer Costs Table */}
               <div className="mt-6 mb-8">
                  <div className="flex items-center justify-between mb-3">
                     <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        🫧 เครื่องซัก (Washer)
                     </h3>
                     <button
                       type="button"
                       onClick={() => setWasherCosts(prev => [...prev, { sizeKg: "", sizeLabel: "", priceCold: "", priceWarm: "", priceHot: "" }])}
                       className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-1"
                     >
                       <Icons.Plus size={12} /> เพิ่มขนาด
                     </button>
                  </div>

                  <div className="overflow-hidden border border-slate-100 rounded-xl">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">ขนาด (kg)</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">ชื่อ</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-blue-400 tracking-widest text-center">น้ำเย็น (Cold)</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-amber-500 tracking-widest text-center">น้ำอุ่น (Warm)</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-rose-400 tracking-widest text-center">น้ำร้อน (Hot)</th>
                              <th className="px-4 py-3 w-10"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {washerCosts.map((w, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-4 py-3">
                                    <input type="number" value={w.sizeKg} onChange={e => { const n = [...washerCosts]; n[i] = {...n[i], sizeKg: e.target.value}; setWasherCosts(n); }}
                                      placeholder="14" className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-black text-center focus:border-primary focus:outline-none transition-all" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <input type="text" value={w.sizeLabel} onChange={e => { const n = [...washerCosts]; n[i] = {...n[i], sizeLabel: e.target.value}; setWasherCosts(n); }}
                                      placeholder="Standard" className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:border-primary focus:outline-none transition-all" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-slate-300 text-xs">฿</span>
                                      <input type="number" value={w.priceCold} onChange={e => { const n = [...washerCosts]; n[i] = {...n[i], priceCold: e.target.value}; setWasherCosts(n); }}
                                        placeholder="50" className="w-16 bg-blue-50 border border-blue-100 rounded-lg px-2 py-2 text-sm font-black text-blue-600 text-center focus:border-blue-400 focus:outline-none transition-all" />
                                    </div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-slate-300 text-xs">฿</span>
                                      <input type="number" value={w.priceWarm} onChange={e => { const n = [...washerCosts]; n[i] = {...n[i], priceWarm: e.target.value}; setWasherCosts(n); }}
                                        placeholder="50" className="w-16 bg-amber-50 border border-amber-100 rounded-lg px-2 py-2 text-sm font-black text-amber-600 text-center focus:border-amber-400 focus:outline-none transition-all" />
                                    </div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-slate-300 text-xs">฿</span>
                                      <input type="number" value={w.priceHot} onChange={e => { const n = [...washerCosts]; n[i] = {...n[i], priceHot: e.target.value}; setWasherCosts(n); }}
                                        placeholder="50" className="w-16 bg-rose-50 border border-rose-100 rounded-lg px-2 py-2 text-sm font-black text-rose-600 text-center focus:border-rose-400 focus:outline-none transition-all" />
                                    </div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <button type="button" onClick={() => setWasherCosts(prev => prev.filter((_, idx) => idx !== i))}
                                      className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center transition-all">
                                      <Icons.Trash size={14} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                           {washerCosts.length === 0 && (
                              <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-slate-300 uppercase">ยังไม่มีข้อมูล — กด "เพิ่มขนาด" เพื่อเริ่มตั้งค่า</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Dryer Costs Table */}
               <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                     <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        🌀 เครื่องอบ (Dryer)
                     </h3>
                     <button
                       type="button"
                       onClick={() => setDryerCosts(prev => [...prev, { sizeKg: "", sizeLabel: "", price: "", durationMinutes: "", extraPricePerMinute: "" }])}
                       className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-100 hover:bg-orange-100 transition-all flex items-center gap-1"
                     >
                       <Icons.Plus size={12} /> เพิ่มขนาด
                     </button>
                  </div>

                  <div className="overflow-hidden border border-slate-100 rounded-xl">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">ขนาด (kg)</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">ชื่อ</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">ราคา/รอบ</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">นาที/รอบ</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">฿/ต่อเวลา</th>
                              <th className="px-4 py-3 w-10"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {dryerCosts.map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-4 py-3">
                                    <input type="number" value={d.sizeKg} onChange={e => { const n = [...dryerCosts]; n[i] = {...n[i], sizeKg: e.target.value}; setDryerCosts(n); }}
                                      placeholder="15" className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-black text-center focus:border-primary focus:outline-none transition-all" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <input type="text" value={d.sizeLabel} onChange={e => { const n = [...dryerCosts]; n[i] = {...n[i], sizeLabel: e.target.value}; setDryerCosts(n); }}
                                      placeholder="Standard" className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:border-primary focus:outline-none transition-all" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-slate-300 text-xs">฿</span>
                                      <input type="number" value={d.price} onChange={e => { const n = [...dryerCosts]; n[i] = {...n[i], price: e.target.value}; setDryerCosts(n); }}
                                        placeholder="50" className="w-16 bg-orange-50 border border-orange-100 rounded-lg px-2 py-2 text-sm font-black text-orange-600 text-center focus:border-orange-400 focus:outline-none transition-all" />
                                    </div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <input type="number" value={d.durationMinutes} onChange={e => { const n = [...dryerCosts]; n[i] = {...n[i], durationMinutes: e.target.value}; setDryerCosts(n); }}
                                      placeholder="24" className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold text-center focus:border-primary focus:outline-none transition-all mx-auto block" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-slate-300 text-xs">฿</span>
                                      <input type="number" value={d.extraPricePerMinute} onChange={e => { const n = [...dryerCosts]; n[i] = {...n[i], extraPricePerMinute: e.target.value}; setDryerCosts(n); }}
                                        placeholder="10" className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold text-center focus:border-primary focus:outline-none transition-all" />
                                    </div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <button type="button" onClick={() => setDryerCosts(prev => prev.filter((_, idx) => idx !== i))}
                                      className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center transition-all">
                                      <Icons.Trash size={14} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                           {dryerCosts.length === 0 && (
                              <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-slate-300 uppercase">ยังไม่มีข้อมูล — กด "เพิ่มขนาด" เพื่อเริ่มตั้งค่า</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Save Cost Matrix Button */}
               <button
                 type="button"
                 onClick={handleSaveCostMatrix}
                 disabled={isCostMatrixSaving}
                 className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {isCostMatrixSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icons.Check size={16} />}
                 {isCostMatrixSaving ? "กำลังบันทึก..." : "บันทึกตารางต้นทุน"}
               </button>
            </Card>
            )}
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
              </div>
           </Card>

           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                    <Icons.Wallet size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.rubbers.form.payoutInfo')}</h2>
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
