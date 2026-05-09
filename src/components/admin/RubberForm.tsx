"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import AdminDocumentUpload from "./AdminDocumentUpload";
import GlobalInput from "@/components/ui/GlobalInput";
import GlobalTextarea from "@/components/ui/GlobalTextarea";
import GlobalSelect from "@/components/ui/GlobalSelect";
import { useToast } from "@/components/providers/ToastProvider";

interface RubberFormProps {
  initialData?: any;
  isEdit?: boolean;
}

const DOCUMENT_TYPES = [
  { id: 'profile_photo', label: 'Rubber Profile Photo', icon: <Icons.User size={18} /> },
  { id: 'id_card', label: 'ID Card / National Identity', icon: <Icons.User size={18} /> },
  { id: 'license', label: 'Driver License', icon: <Icons.Shield size={18} /> },
  { id: 'insurance', label: 'Vehicle Insurance / Act', icon: <Icons.Settings size={18} /> },
  { id: 'vehicle_front', label: 'Vehicle: Front View', icon: <Icons.Bike size={18} /> },
  { id: 'vehicle_back', label: 'Vehicle: Rear View', icon: <Icons.Bike size={18} /> },
  { id: 'vehicle_left', label: 'Vehicle: Left Side', icon: <Icons.Bike size={18} /> },
  { id: 'vehicle_right', label: 'Vehicle: Right Side', icon: <Icons.Bike size={18} /> },
];

export default function RubberForm({ initialData, isEdit }: RubberFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "", // Only for new rubbers
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
      const res = await fetch("/api/admin/rubbers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: initialData?.id })
      });
      
      if (res.ok) {
        showToast(isEdit ? t('admin.rubbers.form.errors.updateSuccess') : t('admin.rubbers.form.errors.approveSuccess'), "success");
        router.push("/admin/rubbers");
        router.refresh();
      } else {
          const err = await res.json();
          showToast(err.error || t('admin.rubbers.form.errors.saveFailed'), "error");
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
      const res = await fetch("/api/admin/rubbers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialData.id, status: 'active' })
      });
      if (res.ok) {
        showToast(t('admin.rubbers.form.errors.approveSuccess'), "success");
        router.push("/admin/rubbers");
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
                 <h3 className="font-black text-amber-900 uppercase tracking-tight">{t('admin.rubbers.form.pendingApplication')}</h3>
                 <p className="text-xs font-bold text-amber-700/60 uppercase">{t('admin.rubbers.form.reviewDesc')}</p>
              </div>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
              >
                {isSaving ? t('common.processing') : t('admin.rubbers.form.approve')}
              </button>
              <button 
                type="button"
                className="flex-1 sm:flex-none px-8 py-3 bg-white border-2 border-amber-200 text-amber-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all"
              >
                {t('admin.rubbers.form.reject')}
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
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.rubbers.form.personnelIdentity')}</h2>
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
                       <GlobalInput
                         label={t('admin.rubbers.form.fullName')}
                         required
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         placeholder={t('admin.rubbers.form.placeholders.fullName')}
                         className="font-mono tracking-tight"
                       />
                    </div>
                    
                    <div>
                       <GlobalInput
                         label={t('admin.rubbers.form.email')}
                         required
                         disabled={isEdit}
                         value={formData.email}
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         placeholder={t('admin.rubbers.form.placeholders.email')}
                       />
                    </div>
                    
                    {!isEdit && (
                       <div>
                          <GlobalInput
                            label={t('admin.rubbers.form.password')}
                            required
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder={t('admin.rubbers.form.placeholders.password')}
                          />
                       </div>
                    )}
                 </div>
              </div>
                 
                 <div>
                    <GlobalInput
                      label={t('admin.rubbers.form.idNumber')}
                      value={formData.idNumber}
                      onChange={e => setFormData({...formData, idNumber: e.target.value})}
                      placeholder={t('admin.rubbers.form.placeholders.idNumber')}
                      className="font-mono"
                    />
                 </div>
                 
                 <div>
                    <GlobalInput
                      label={t('admin.rubbers.form.phone')}
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder={t('admin.rubbers.form.placeholders.phone')}
                      className="font-mono"
                    />
                 </div>

                 <div className="md:col-span-2">
                    <GlobalTextarea 
                      label={t('admin.rubbers.form.address')}
                      rows={3}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: (e.target as HTMLTextAreaElement).value})}
                      placeholder={t('admin.rubbers.form.placeholders.address')}
                    />
                 </div>
           </Card>
           
           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Icons.Shield size={20} />
                 </div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.rubbers.form.docs')}</h2>
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
                             <GlobalSelect 
                                value={doc.status}
                                onChange={e => handleDocChange(docType.id, 'status', e.target.value)}
                                fullWidth={false}
                                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border-2 focus:outline-none !py-1 !px-2 ${
                                   doc.status === 'verified' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                   doc.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                   'bg-white border-slate-100 text-slate-400'
                                }`}
                                options={[
                                   { value: 'none', label: t('admin.rubbers.form.notSubmitted') },
                                   { value: 'pending', label: t('admin.rubbers.form.pendingReview') },
                                   { value: 'verified', label: t('admin.rubbers.form.verified') },
                                   { value: 'rejected', label: t('admin.rubbers.form.rejected') },
                                ]}
                             />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <AdminDocumentUpload 
                               label={t('admin.rubbers.form.docs')}
                               value={doc.id || doc.url}
                               onChange={(val) => handleDocChange(docType.id, 'url', val)}
                             />
                             <div>
                                <GlobalTextarea 
                                  label={t('admin.rubbers.form.internalNotes')}
                                  rows={4}
                                  value={doc.notes}
                                  onChange={e => handleDocChange(docType.id, 'notes', (e.target as HTMLTextAreaElement).value)}
                                  placeholder={t('admin.rubbers.form.placeholders.notes')}
                                  className="text-xs"
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
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('admin.rubbers.form.visualInspection')}</h2>
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
                 <h2 className="text-xl font-black uppercase tracking-tight">{t('admin.rubbers.form.vehicleSetup')}</h2>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <GlobalSelect 
                      label={t('admin.rubbers.form.authorizedVehicle')}
                      value={formData.vehicleType}
                      onChange={e => setFormData({...formData, vehicleType: e.target.value})}
                      className="bg-white/10 border-white/10 text-white [&>option]:text-slate-900"
                      options={[
                         { value: 'bike', label: 'Motorbike (Flash/Standard)' },
                         { value: 'car', label: 'Car (Express/Suites)' },
                         { value: 'truck', label: 'Truck (L-Bulk/Corporate)' },
                      ]}
                    />
                 </div>
                 <div>
                    <GlobalInput 
                      label={t('admin.rubbers.form.licensePlate')}
                      value={formData.licensePlate}
                      onChange={e => setFormData({...formData, licensePlate: e.target.value})}
                      placeholder={t('admin.rubbers.form.placeholders.licensePlate')}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/20 uppercase"
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
                    <GlobalSelect 
                      label={t('admin.rubbers.form.bankName')}
                      value={formData.bankName}
                      onChange={e => setFormData({...formData, bankName: e.target.value})}
                      className="font-mono"
                      options={[
                         { value: '', label: 'Select Bank / PromptPay' },
                         { value: 'PromptPay', label: 'PromptPay (Mobile/ID)' },
                         { value: 'KBank', label: 'Kasikorn (KBank)' },
                         { value: 'SCB', label: 'Siam Commercial (SCB)' },
                         { value: 'BBL', label: 'Bangkok Bank (BBL)' },
                         { value: 'KTB', label: 'Krungthai (KTB)' },
                         { value: 'Krungsri', label: 'Krungsri (BAY)' },
                         { value: 'TTB', label: 'TMBThanachart (TTB)' },
                      ]}
                    />
                 </div>
                 <div>
                    <GlobalInput 
                      label={t('admin.rubbers.form.accountNumber')}
                      value={formData.accountNumber}
                      onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                      placeholder={t('admin.rubbers.form.placeholders.bankAccount')}
                      className="font-mono"
                    />
                 </div>
                 <div>
                    <GlobalInput 
                      label={t('admin.rubbers.form.accountName')}
                      value={formData.accountName}
                      onChange={e => setFormData({...formData, accountName: e.target.value})}
                      placeholder={t('admin.rubbers.form.placeholders.accountName')}
                      className="font-mono"
                    />
                 </div>
              </div>
           </Card>

           <Card className="p-8 bg-white border border-slate-200/60 shadow-sm">
              <GlobalInput 
                label={t('admin.rubbers.form.emergencyContact')}
                value={formData.emergencyContact}
                onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                placeholder={t('admin.rubbers.form.placeholders.emergency')}
                className="text-slate-600"
              />
           </Card>

           <div className="pt-4">
              <button 
                disabled={isSaving}
                className="w-full bg-primary text-white py-6 rounded-xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? t('admin.rubbers.form.syncing') : isEdit ? t('admin.rubbers.form.updateBtn') : t('admin.rubbers.form.authorizeBtn')}
              </button>
              <button 
                type="button"
                onClick={() => router.back()}
                className="w-full mt-4 bg-white border border-slate-200 text-slate-400 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-all"
              >
                {t('admin.rubbers.form.exitProfiling')}
              </button>
           </div>
           
           {isEdit && (
              <div className="mt-8 p-6 bg-slate-50 rounded-xl space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin.rubbers.form.statusControl')}</p>
                 <GlobalSelect 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className={`text-xs font-black uppercase tracking-tight border-2 focus:outline-none ${
                      formData.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}
                    options={[
                       { value: 'active', label: t('admin.rubbers.form.operational') },
                       { value: 'suspended', label: t('admin.rubbers.form.suspended') },
                    ]}
                 />
              </div>
           )}

           {isEdit && (
              <Card className="mt-6 p-6 bg-white border border-rose-100 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                       <Icons.Shield size={20} />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase">รีเซ็ต PIN กระเป๋าเงิน</h3>
                       <p className="text-[10px] font-medium text-slate-400">ใช้เมื่อ Rubber แจ้งลืมรหัส PIN 6 หลัก</p>
                    </div>
                 </div>
                 <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    เมื่อกดรีเซ็ต PIN จะถูกลบออก และ Rubber จะต้องตั้ง PIN ใหม่ในครั้งถัดไปที่เปิดหน้ากระเป๋าเงิน
                 </p>
                 <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("ยืนยันรีเซ็ต PIN ของ Rubber คนนี้?")) return;
                      try {
                        const res = await fetch("/api/user/pin", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "reset", type: "rubber", userId: initialData?.id })
                        });
                        const data = await res.json() as any;
                        if (data.success) {
                          showToast("รีเซ็ต PIN สำเร็จแล้ว", "success");
                        } else {
                          showToast(data.error || "เกิดข้อผิดพลาด", "error");
                        }
                      } catch (err) {
                        showToast("ไม่สามารถรีเซ็ต PIN ได้", "error");
                      }
                    }}
                    className="w-full py-3 bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98]"
                 >
                    🔓 รีเซ็ต PIN
                 </button>
              </Card>
           )}
        </div>
      </div>
    </form>
  );
}
