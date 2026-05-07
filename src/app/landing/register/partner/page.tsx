"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import GlobalInput from "@/components/ui/GlobalInput";
import GlobalTextarea from "@/components/ui/GlobalTextarea";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function PartnerRegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    type: "store", 
    storeName: "",
    storeAddress: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    idCardUrl: "",
    businessDocUrl: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const upData = new FormData();
    upData.append("file", file);

    try {
      const res = await fetch("/api/public/upload", {
        method: "POST",
        body: upData,
      });
      const data = await res.json() as any;
      if (data.url) {
        setFormData({ ...formData, [field]: data.url });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/store/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json() as any;

      if (res.ok) {
        setShowSuccessModal(true);
      } else {
        setError(data.error || t("common.error"));
      }
    } catch (err) {
      setError(t("common.errorDesc"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 selection:bg-primary/20">
      {/* Abstract Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-violet-500/5 to-transparent blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20 md:py-32">
        {/* Back Button */}
        <button 
          onClick={() => router.push('/')}
          className="absolute top-8 left-6 md:top-12 md:left-0 group flex items-center gap-3 px-5 py-2.5 bg-white/50 backdrop-blur-md border border-white rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-primary transition-colors">
            <Icons.Back size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{t("register.partner.backButton")}</span>
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl shadow-slate-900/20">
             {t("register.partner.title")}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4">
             {t("register.partner.subtitle").split(",")[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">{t("register.partner.subtitle").split(",")[1] || ""}</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg">{t("register.partner.subtitle")}</p>
          
          {/* Timeline Progress */}
          <div className="flex items-center justify-center gap-4 mt-12">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                 <div className={`h-2.5 rounded-full transition-all duration-700 ${s <= step ? 'w-16 bg-primary shadow-lg shadow-primary/30' : 'w-6 bg-slate-100'}`} />
                 <span className={`text-[9px] font-black uppercase tracking-tighter ${s <= step ? 'text-primary' : 'text-slate-300'}`}>0{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-white/90 backdrop-blur-3xl border border-slate-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] rounded-[56px] p-8 md:p-16 overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-2">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900">{t("register.partner.step1Title")}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t("register.partner.step1Header")}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("register.partner.typeLabel")}</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['store', 'specialist'].map((t_key) => (
                      <button 
                        key={t_key} type="button" onClick={() => setFormData({...formData, type: t_key as any})} 
                        className={`p-6 rounded-[32px] border-2 flex flex-col items-center gap-3 transition-all duration-500 ${formData.type === t_key ? 'border-primary bg-primary/5 text-primary shadow-xl shadow-primary/10' : 'border-slate-50 text-slate-400 hover:border-slate-100'}`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${formData.type === t_key ? 'bg-primary text-white' : 'bg-slate-50'}`}>
                          {t_key === 'store' ? <Icons.Store size={28} /> : <Icons.User size={28} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{t_key === 'store' ? t("register.partner.typeStore") : t("register.partner.typeSpecialist")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlobalInput 
                    label={t("register.partner.nameLabel")}
                    required
                    variant="large"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <GlobalInput 
                    label={t("register.partner.phoneLabel")}
                    type="tel"
                    required
                    variant="large"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("register.partner.accountLabel")}</label>
                   <GlobalInput 
                     type="email"
                     required
                     placeholder={t("common.email")}
                     value={formData.email}
                     onChange={(e) => setFormData({...formData, email: e.target.value})}
                   />
                   <GlobalInput 
                     type="password"
                     required
                     variant="large"
                     placeholder={t("common.password")}
                     value={formData.password}
                     onChange={(e) => setFormData({...formData, password: e.target.value})}
                   />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Icons.Store size={28} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-none">{t("register.partner.step2Title")}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t("register.partner.step2Header")}</p>
                   </div>
                </div>
                <div className="space-y-6">
                  <GlobalInput 
                    label={t("register.partner.storeNameLabel")}
                    required
                    variant="large"
                    placeholder={t("register.partner.storeNameLabel")}
                    value={formData.storeName}
                    onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                  />
                  <GlobalTextarea 
                    label={t("register.partner.locationLabel")}
                    required
                    rows={4}
                    value={formData.storeAddress}
                    onChange={(e) => setFormData({...formData, storeAddress: e.target.value})}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Icons.Wallet size={28} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-none">{t("register.partner.step3Title")}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t("register.partner.step3Header")}</p>
                   </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("register.partner.bankLabel")}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['KBank', 'SCB', 'BBL', 'KTB'].map((bank) => (
                        <button key={bank} type="button" onClick={() => setFormData({...formData, bankName: bank})} className={`py-4 rounded-xl border-2 font-black text-xs transition-all ${formData.bankName === bank ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-500/10' : 'border-slate-50 text-slate-300 hover:border-slate-100'}`}>
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>
                  <GlobalInput 
                    label={t("register.partner.accountNumberLabel")}
                    required
                    variant="large"
                    className="font-mono tracking-wider"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                  />
                  <GlobalInput 
                    label={t("register.partner.accountNameLabel")}
                    required
                    variant="large"
                    value={formData.accountName}
                    onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Icons.Shield size={28} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-none">{t("register.partner.step4Title")}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t("register.partner.step4Header")}</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("register.partner.idCardLabel")}</label>
                    <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center overflow-hidden hover:border-primary hover:bg-primary/5 transition-all group">
                      {formData.idCardUrl ? (
                        <img src={formData.idCardUrl} alt="ID Card" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                             <Icons.User size={24} className="text-slate-200 group-hover:text-primary" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("register.partner.uploadIdCard")}</span>
                        </>
                      )}
                      <input type="file" required className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'idCardUrl')} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("register.partner.businessDocLabel")}</label>
                    <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center overflow-hidden hover:border-violet-500 hover:bg-violet-50 transition-all group">
                      {formData.businessDocUrl ? (
                        <img src={formData.businessDocUrl} alt="Business Doc" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                             <Icons.Payment size={24} className="text-slate-200 group-hover:text-violet-500" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("register.partner.uploadBusinessDoc")}</span>
                        </>
                      )}
                      <input type="file" required className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'businessDocUrl')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 text-rose-500 text-sm font-black text-center animate-shake">
                {error}
              </div>
            )}

            <div className="flex items-center gap-6 pt-6">
              {step > 1 && (
                <button type="button" onClick={() => setStep(step - 1)} className="px-10 py-5 bg-white border-2 border-slate-50 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all">{t("register.partner.backButton")}</button>
              )}
              <Button 
                type="submit" 
                fullWidth 
                size="lg" 
                isLoading={isLoading}
                className="bg-slate-900 text-white py-6 rounded-2xl font-black uppercase shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:bg-primary hover:shadow-primary/30 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-center gap-3">
                  <span>{step === 4 ? t("register.partner.submitButton") : t("register.partner.nextButton")}</span>
                  {step < 4 && <Icons.ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </div>
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <ConfirmModal 
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push("/");
        }}
        title={t("register.partner.submitSuccess")}
        message={t("register.partner.submitSuccess")}
        type="success"
      />
    </div>
  );
}
