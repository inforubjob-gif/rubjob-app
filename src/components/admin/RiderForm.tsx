"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import AdminDocumentUpload from "./AdminDocumentUpload";

interface RiderFormProps {
  initialData?: any;
  isEdit?: boolean;
}

const DOCUMENT_TYPES = [
  { id: 'profile_photo', label: 'Rider Profile Photo', icon: <Icons.User size={18} /> },
  { id: 'id_card', label: 'ID Card / National Identity', icon: <Icons.User size={18} /> },
  { id: 'license', label: 'Driver License', icon: <Icons.Shield size={18} /> },
  { id: 'insurance', label: 'Vehicle Insurance / Act', icon: <Icons.Settings size={18} /> },
  { id: 'vehicle_front', label: 'Vehicle: Front View', icon: <Icons.Bike size={18} /> },
  { id: 'vehicle_back', label: 'Vehicle: Rear View', icon: <Icons.Bike size={18} /> },
  { id: 'vehicle_left', label: 'Vehicle: Left Side', icon: <Icons.Bike size={18} /> },
  { id: 'vehicle_right', label: 'Vehicle: Right Side', icon: <Icons.Bike size={18} /> },
];

export default function RiderForm({ initialData, isEdit }: RiderFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "", // Only for new riders
    phone: initialData?.phone || "",
    vehicleType: initialData?.vehicleType || "bike",
    address: initialData?.address || "",
    idNumber: initialData?.idNumber || "",
    licensePlate: initialData?.licensePlate || "",
    emergencyContact: initialData?.emergencyContact || "",
    bankName: initialData?.bankName || "",
    accountNumber: initialData?.accountNumber || "",
    accountName: initialData?.accountName || "",
    status: initialData?.status || "active",
    pictureUrl: initialData?.pictureUrl || "",
    documents: initialData?.documents || [] as any[] // [{ type, url, status, notes }]
  });

  const handleDocChange = (type: string, field: string, value: string) => {
    setFormData(prev => {
      const existing = prev.documents.find((d: any) => d.type === type);
      let newDocs;
      if (existing) {
        newDocs = prev.documents.map((d: any) => d.type === type ? { ...d, [field]: value } : d);
      } else {
        newDocs = [...prev.documents, { type, status: 'pending', url: '', notes: '', [field]: value }];
      }
      
      // Sync pictureUrl if type is profile_photo
      const updates: any = { documents: newDocs };
      if (type === 'profile_photo' && field === 'url') {
        updates.pictureUrl = value;
      }
      
      return { ...prev, ...updates };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/admin/riders", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: initialData?.id })
      });
      
      if (res.ok) {
        router.push("/admin/riders");
        router.refresh();
      } else {
          const err = await res.json();
          alert(err.error || "Failed to save rider");
      }
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialData.id, status: 'active' })
      });
      if (res.ok) {
        showToast("Application Approved! Rider is now active.", "success");
        router.push("/admin/riders");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {initialData?.status === 'pending' && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-amber-500/5">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white animate-pulse">
                 <Icons.Shield size={24} />
              </div>
              <div>
                 <h3 className="font-black text-amber-900 uppercase tracking-tight">{t('admin.riders.form.pendingApplication')}</h3>
                 <p className="text-xs font-bold text-amber-700/60 uppercase">{t('admin.riders.form.reviewDesc')}</p>
              </div>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
              >
                {isSaving ? t('common.processing') : t('admin.riders.form.approve')}
              </button>
              <button 
                type="button"
                className="flex-1 sm:flex-none px-8 py-3 bg-white border-2 border-amber-200 text-amber-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all"
              >
                {t('admin.riders.form.reject')}
              </button>
           </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Personal & Credentials */}
        <div className="lg:col-span-2 space-y-8">
           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <Icons.User size={20} />
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.riders.form.personnelIdentity')}</h2>
                   {initialData?.displayId && (
                     <p className="text-[10px] font-black text-primary uppercase tracking-widest">{initialData.displayId}</p>
                   )}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                 <div className="md:col-span-1">
                    <AdminDocumentUpload 
                       variant="square"
                       label="Profile Photo"
                       value={formData.documents.find((d: any) => d.type === 'profile_photo')?.id || formData.documents.find((d: any) => d.type === 'profile_photo')?.url}
                       onChange={(val) => handleDocChange('profile_photo', 'url', val)}
                    />
                 </div>
                 
                 <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.fullName')}</label>
                       <input 
                         required
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         placeholder="e.g. Somchai Laundry"
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono tracking-tight"
                       />
                    </div>
                    
                    <div>
                       <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.email')}</label>
                       <input 
                         required
                         disabled={isEdit}
                         value={formData.email}
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         placeholder="rider@rubjob.com"
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50"
                       />
                    </div>
                    
                    {!isEdit && (
                       <div>
                          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.password')}</label>
                          <input 
                            required
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all px-10 relative"
                          />
                       </div>
                    )}
                 </div>
              </div>
                 
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.idNumber')}</label>
                    <input 
                      value={formData.idNumber}
                      onChange={e => setFormData({...formData, idNumber: e.target.value})}
                      placeholder="X-XXXX-XXXXX-XX-X"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                    />
                 </div>
                 
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.phone')}</label>
                    <input 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="08X-XXX-XXXX"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                    />
                 </div>

                 <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.address')}</label>
                    <textarea 
                      rows={3}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      placeholder="Detailed address as per ID card..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                    />
                 </div>
           </Card>
           
           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Icons.Shield size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.riders.form.docs')}</h2>
              </div>
              
              <div className="space-y-6">
                 {DOCUMENT_TYPES.map(docType => {
                    const doc = formData.documents.find((d: any) => d.type === docType.id) || { status: 'none', url: '', notes: '' };
                    return (
                       <div key={docType.id} className="p-6 rounded-xl border-2 border-slate-50 bg-slate-50/20 space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400">
                                   {docType.icon}
                                </div>
                                <span className="text-sm font-black text-slate-900">{docType.label}</span>
                             </div>
                             <select 
                                value={doc.status}
                                onChange={e => handleDocChange(docType.id, 'status', e.target.value)}
                                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border-2 focus:outline-none ${
                                   doc.status === 'verified' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                   doc.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                   'bg-white border-slate-100 text-slate-400'
                                }`}
                             >
                                <option value="none">{t('admin.riders.form.notSubmitted')}</option>
                                <option value="pending">{t('admin.riders.form.pendingReview')}</option>
                                <option value="verified">{t('admin.riders.form.verified')}</option>
                                <option value="rejected">{t('admin.riders.form.rejected')}</option>
                             </select>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <AdminDocumentUpload 
                               label="Document Photo"
                               value={doc.id || doc.url}
                               onChange={(val) => handleDocChange(docType.id, 'url', val)}
                             />
                             <div>
                                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1 ml-1">{t('admin.riders.form.internalNotes')}</label>
                                <textarea 
                                  rows={4}
                                  value={doc.notes}
                                  onChange={e => handleDocChange(docType.id, 'notes', e.target.value)}
                                  placeholder="e.g. Checked with DLT database"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-indigo-400 transition-all font-medium"
                                />
                             </div>
                          </div>
                       </div>
                    );
                 })}
              </div>
           </Card>

           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icons.Camera size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.riders.form.visualInspection')}</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {['vehicle_front', 'vehicle_back', 'vehicle_left', 'vehicle_right'].map((type) => (
                   <AdminDocumentUpload 
                     key={type}
                     label={type.replace('vehicle_', '').toUpperCase()}
                     value={formData.documents.find((d: any) => d.type === type)?.id || formData.documents.find((d: any) => d.type === type)?.url}
                     onChange={(val) => handleDocChange(type, 'url', val)}
                   />
                 ))}
              </div>
           </Card>
        </div>
        
        {/* Right Column: Vehicle & Status */}
        <div className="space-y-8">
           <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Icons.Bike size={20} />
                 </div>
                 <h2 className="text-xl font-black uppercase tracking-tight">{t('admin.riders.form.vehicleSetup')}</h2>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] uppercase font-black text-white/50 tracking-widest block mb-2 ml-1">{t('admin.riders.form.authorizedVehicle')}</label>
                    <select 
                      value={formData.vehicleType}
                      onChange={e => setFormData({...formData, vehicleType: e.target.value})}
                      className="w-full bg-white/10 border-2 border-white/10 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-white/30 transition-all"
                    >
                       <option value="bike">Motorbike (Flash/Standard)</option>
                       <option value="car">Car (Express/Suites)</option>
                       <option value="truck">Truck (L-Bulk/Corporate)</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-black text-white/50 tracking-widest block mb-2 ml-1">{t('admin.riders.form.licensePlate')}</label>
                    <input 
                      value={formData.licensePlate}
                      onChange={e => setFormData({...formData, licensePlate: e.target.value})}
                      placeholder="กข 1234 กทม"
                      className="w-full bg-white/10 border-2 border-white/10 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-white/30 transition-all uppercase placeholder:text-white/20"
                    />
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
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.bankName')}</label>
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
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.accountNumber')}</label>
                    <input 
                      value={formData.accountNumber}
                      onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                      placeholder="000-0-00000-0"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-1.5 ml-1">{t('admin.riders.form.accountName')}</label>
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
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block mb-2 ml-1">{t('admin.riders.form.emergencyContact')}</label>
              <input 
                value={formData.emergencyContact}
                onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                placeholder="Name & Relationship (Phone)"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all text-slate-600"
              />
           </Card>

           <div className="pt-4">
              <button 
                disabled={isSaving}
                className="w-full bg-slate-900 text-white py-6 rounded-xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? t('admin.riders.form.syncing') : isEdit ? t('admin.riders.form.updateBtn') : t('admin.riders.form.authorizeBtn')}
              </button>
              <button 
                type="button"
                onClick={() => router.back()}
                className="w-full mt-4 bg-white border border-slate-200 text-slate-400 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-all"
              >
                {t('admin.riders.form.exitProfiling')}
              </button>
           </div>
           
           {isEdit && (
              <div className="mt-8 p-6 bg-slate-50 rounded-xl space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.riders.form.statusControl')}</p>
                 <select 
                   value={formData.status}
                   onChange={e => setFormData({...formData, status: e.target.value})}
                   className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-tight border-2 focus:outline-none ${
                     formData.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                   }`}
                 >
                    <option value="active">{t('admin.riders.form.operational')}</option>
                    <option value="suspended">{t('admin.riders.form.suspended')}</option>
                 </select>
              </div>
           )}
        </div>
      </div>
    </form>
  );
}
