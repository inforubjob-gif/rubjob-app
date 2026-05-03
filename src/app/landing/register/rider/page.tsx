"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function RiderRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    vehicleType: "bike",
    licensePlate: "",
    idNumber: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    idCardUrl: "",
    licenseUrl: "",
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
      const res = await fetch("/api/rider/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json() as any;

      if (res.ok) {
        router.push("/rider/login?registered=true");
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-primary/20">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full" />
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 shadow-sm">
             Rider Onboarding
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4">
             ร่วมทีม <span className="text-primary">RUBJOB</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg">สร้างรายได้ที่มั่นคง พร้อมอิสระในการใช้ชีวิต</p>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-center gap-3 mt-12">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                 <div className={`h-2 rounded-full transition-all duration-500 ${s <= step ? 'w-16 bg-primary shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'w-8 bg-slate-200'}`} />
                 <span className={`text-[8px] font-black uppercase tracking-tighter ${s <= step ? 'text-primary' : 'text-slate-300'}`}>Step {s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="bg-white/80 backdrop-blur-2xl border border-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] rounded-[40px] p-8 md:p-14 overflow-hidden relative">
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icons.User size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 leading-none">ข้อมูลพื้นฐาน</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">General Information</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล (ภาษาไทย)</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-300" placeholder="สมชาย รับจบ" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">อีเมล</label>
                    <input type="email" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all" placeholder="rider@rubjob.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
                      <input type="tel" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รหัสผ่าน</label>
                      <input type="password" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary focus:bg-white outline-none transition-all" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                      <Icons.Truck size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 leading-none">ข้อมูลพาหนะและยืนยันตัวตน</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Vehicle & Verification</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['bike', 'car'].map((v) => (
                    <button key={v} type="button" onClick={() => setFormData({...formData, vehicleType: v})} className={`p-8 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all duration-300 ${formData.vehicleType === v ? 'border-primary bg-primary/5 text-primary shadow-xl shadow-primary/10' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${formData.vehicleType === v ? 'bg-primary text-white' : 'bg-slate-100'}`}>
                        {v === 'bike' ? <Icons.Bike size={32} /> : <Icons.Truck size={32} />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">{v === 'bike' ? 'มอเตอร์ไซค์' : 'รถยนต์'}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขทะเบียนรถ</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary outline-none transition-all uppercase" placeholder="กข 1234 กทม." value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขบัตรประชาชน (13 หลัก)</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-primary outline-none transition-all font-mono" placeholder="X-XXXX-XXXXX-XX-X" value={formData.idNumber} onChange={(e) => setFormData({...formData, idNumber: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Icons.Wallet size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 leading-none">ช่องทางการรับเงิน</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Financial Payout</p>
                   </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกธนาคาร</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['KBank', 'SCB', 'BBL', 'PromptPay'].map((bank) => (
                        <button key={bank} type="button" onClick={() => setFormData({...formData, bankName: bank})} className={`py-4 rounded-xl border-2 font-black text-xs transition-all ${formData.bankName === bank ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขบัญชี / เบอร์พร้อมเพย์</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-2xl font-black focus:border-emerald-500 outline-none transition-all font-mono" value={formData.accountNumber} onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อบัญชี (ภาษาไทย)</label>
                    <input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4.5 text-lg font-bold focus:border-emerald-500 outline-none transition-all" value={formData.accountName} onChange={(e) => setFormData({...formData, accountName: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Icons.Shield size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 leading-none">อัปโหลดหลักฐานเอกสาร</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Document Verification</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รูปบัตรประชาชน (ID Card)</label>
                    <div className="relative aspect-[3/2] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center overflow-hidden hover:border-primary hover:bg-primary/5 transition-all group">
                      {formData.idCardUrl ? (
                        <img src={formData.idCardUrl} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Icons.Refresh size={20} className="text-slate-300 group-hover:text-primary" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tap to upload</span>
                        </>
                      )}
                      <input type="file" required className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'idCardUrl')} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รูปใบขับขี่ (Driver License)</label>
                    <div className="relative aspect-[3/2] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center overflow-hidden hover:border-blue-500 hover:bg-blue-50 transition-all group">
                      {formData.licenseUrl ? (
                        <img src={formData.licenseUrl} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Icons.ArrowRight size={20} className="text-slate-300 group-hover:text-blue-500" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tap to upload</span>
                        </>
                      )}
                      <input type="file" required className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'licenseUrl')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-500 text-xs font-black text-center animate-shake">
                {error}
              </div>
            )}

            <div className="flex items-center gap-4 pt-4">
              {step > 1 && (
                <button 
                  type="button" 
                  onClick={() => setStep(step - 1)} 
                  className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all active:scale-95"
                >
                  Back
                </button>
              )}
              <Button 
                type="submit" 
                fullWidth 
                size="lg" 
                isLoading={isLoading}
                className="bg-slate-900 text-white py-6 rounded-2xl font-black uppercase shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center justify-center gap-3">
                  <span>{step === 4 ? 'Confirm & Finish' : 'Next Step'}</span>
                  {step < 4 && <Icons.ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </div>
              </Button>
            </div>
          </form>
        </Card>

        <div className="text-center mt-12 space-y-4">
          <p className="text-sm font-bold text-slate-400">
            Have an account? <a href="/rider/login" className="text-primary hover:underline font-black">Sign In</a>
          </p>
          <div className="flex items-center justify-center gap-8 pt-8 opacity-30 grayscale">
            <Icons.Logo size={80} />
          </div>
        </div>
      </div>
    </div>
  );
}
