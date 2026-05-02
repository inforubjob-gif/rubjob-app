"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function PartnerRegisterPage() {
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
      const data = await res.json();
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
      const data = await res.json();

      if (res.ok) {
        alert("ลงทะเบียนเรียบร้อย! เจ้าหน้าที่จะตรวจสอบข้อมูลภายใน 24 ชม.");
        router.push("/landing");
      } else {
        setError(data.error || "Failed to register");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
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
          onClick={() => router.push('/landing')}
          className="absolute top-8 left-6 md:top-12 md:left-0 group flex items-center gap-3 px-5 py-2.5 bg-white/50 backdrop-blur-md border border-white rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-primary transition-colors">
            <Icons.Back size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Back to Home</span>
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-2xl shadow-slate-900/20">
             Partner Onboarding
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4">
             ร่วมเป็น <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">พาร์ทเนอร์</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg">ขยายฐานลูกค้า และอัปเกรดธุรกิจสู่ระดับมืออาชีพ</p>
          
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
                      <h3 className="text-2xl font-black text-slate-900">ข้อมูลผู้สมัคร</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Basic Profile</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทพาร์ทเนอร์</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['store', 'specialist'].map((t) => (
                      <button 
                        key={t} type="button" onClick={() => setFormData({...formData, type: t as any})} 
                        className={`p-6 rounded-[32px] border-2 flex flex-col items-center gap-3 transition-all duration-500 ${formData.type === t ? 'border-primary bg-primary/5 text-primary shadow-xl shadow-primary/10' : 'border-slate-50 text-slate-400 hover:border-slate-100'}`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${formData.type === t ? 'bg-primary text-white' : 'bg-slate-50'}`}>
                          {t === 'store' ? <Icons.Store size={28} /> : <Icons.User size={28} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{t === 'store' ? 'ร้านค้า (Store)' : 'มืออาชีพ (Specialist)'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล</label>
                    <input type="text" required className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
                    <input type="tel" required className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">บัญชีผู้ใช้งาน (Email & Password)</label>
                   <input type="email" required className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all mb-4" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                   <input type="password" required className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
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
                      <h3 className="text-2xl font-black text-slate-900 leading-none">รายละเอียดบริการ</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Service & Location</p>
                   </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อร้าน / ชื่อแบรนด์บริการ</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-xl font-bold focus:border-primary outline-none transition-all" placeholder="RUBJOB Cleaning Service" value={formData.storeName} onChange={(e) => setFormData({...formData, storeName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ที่ตั้ง / พื้นที่ให้บริการ (ระบุโดยละเอียด)</label>
                    <textarea required rows={4} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4.5 text-lg font-bold focus:border-primary outline-none transition-all leading-relaxed" value={formData.storeAddress} onChange={(e) => setFormData({...formData, storeAddress: e.target.value})} />
                  </div>
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
                      <h3 className="text-2xl font-black text-slate-900 leading-none">ช่องทางรับรายได้</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Payout Settings</p>
                   </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ธนาคารปลายทาง</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['KBank', 'SCB', 'BBL', 'KTB'].map((bank) => (
                        <button key={bank} type="button" onClick={() => setFormData({...formData, bankName: bank})} className={`py-4 rounded-xl border-2 font-black text-xs transition-all ${formData.bankName === bank ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-500/10' : 'border-slate-50 text-slate-300 hover:border-slate-100'}`}>
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขบัญชีธนาคาร</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-2xl font-black focus:border-emerald-500 outline-none transition-all font-mono tracking-wider" value={formData.accountNumber} onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อเจ้าของบัญชี</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-emerald-500 outline-none transition-all" value={formData.accountName} onChange={(e) => setFormData({...formData, accountName: e.target.value})} />
                  </div>
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
                      <h3 className="text-2xl font-black text-slate-900 leading-none">เอกสารตรวจสอบธุรกิจ</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Verification Documents</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">บัตรประชาชนผู้สมัคร</label>
                    <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center overflow-hidden hover:border-primary hover:bg-primary/5 transition-all group">
                      {formData.idCardUrl ? (
                        <img src={formData.idCardUrl} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                             <Icons.User size={24} className="text-slate-200 group-hover:text-primary" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload ID Card</span>
                        </>
                      )}
                      <input type="file" required className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'idCardUrl')} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ใบทะเบียนการค้า / หนังสือรับรอง</label>
                    <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center overflow-hidden hover:border-violet-500 hover:bg-violet-50 transition-all group">
                      {formData.businessDocUrl ? (
                        <img src={formData.businessDocUrl} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                             <Icons.Payment size={24} className="text-slate-200 group-hover:text-violet-500" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Business Doc</span>
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
                <button type="button" onClick={() => setStep(step - 1)} className="px-10 py-5 bg-white border-2 border-slate-50 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all">Back</button>
              )}
              <Button 
                type="submit" 
                fullWidth 
                size="lg" 
                isLoading={isLoading}
                className="bg-slate-900 text-white py-6 rounded-2xl font-black uppercase shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:bg-primary hover:shadow-primary/30 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-center gap-3">
                  <span>{step === 4 ? 'Submit Application' : 'Continue to Next Step'}</span>
                  {step < 4 && <Icons.ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </div>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
