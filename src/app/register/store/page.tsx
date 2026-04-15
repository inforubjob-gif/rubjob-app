"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { 
  ssr: false,
  loading: () => <div className="h-[250px] w-full bg-slate-900 animate-pulse rounded-3xl flex items-center justify-center font-bold text-slate-700">Loading Intelligence...</div>
});

export default function StoreRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    lat: 13.7563,
    lng: 100.5018,
    bankName: "",
    accountNumber: "",
    accountName: "",
    documents: [] as { type: string; url: string }[]
  });

  const handleFileChange = async (type: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData(prev => {
        const filtered = prev.documents.filter(d => d.type !== type);
        return { ...prev, documents: [...filtered, { type, url: base64 }] };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/register/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setStep(4); // Success step
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit store details");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocPreview = (type: string) => {
    return formData.documents.find(d => d.type === type)?.url;
  };

  if (step === 4) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center text-slate-900 mb-8 shadow-2xl shadow-primary/20 animate-in zoom-in duration-500">
          <Icons.Store size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter">Welcome to the Network</h1>
        <p className="text-slate-500 font-bold mb-8 max-w-xs leading-relaxed">
          Your store application is under executive review. We will contact you at <span className="text-primary">{formData.phone}</span> shortly.
        </p>
        <Button onClick={() => router.push("/")} className="bg-slate-900 text-white rounded-2xl px-12 py-5 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-300 transform transition-transform hover:scale-105 active:scale-95">
          Exit to Main Site
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20 overflow-hidden relative">
      <nav className="relative z-10 p-6 flex items-center justify-between border-b border-slate-100 mb-8">
         <div className="flex items-center gap-2" onClick={() => router.push("/")}>
            <Icons.Logo size={32} />
            <span className="font-black text-xl italic tracking-tighter uppercase">Rubjob <span className="text-primary italic-none">Partners</span></span>
         </div>
         <div className="flex items-center gap-1.5">
            {[1, 2, 3].map(s => (
               <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-primary' : 'w-3 bg-slate-100'}`} />
            ))}
         </div>
      </nav>

      <main className="relative z-10 px-6 max-w-xl mx-auto">
        <header className="mb-10 text-center">
           <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 italic">
              Scale Your <span className="text-primary">Business</span>
           </h1>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Phase {step}: {step === 1 ? 'Logistics & Identity' : step === 2 ? 'Treasury & Payout' : 'Verification'}</p>
        </header>

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store / Branch Name</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-black text-sm focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="e.g. Sukhumvit Laundry Loft"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                <input 
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-mono text-sm focus:outline-none focus:border-primary/50 transition-all font-bold"
                  placeholder="08X-XXX-XXXX"
                />
             </div>
             
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interactive Map Pin</label>
                <div className="rounded-3xl overflow-hidden border-2 border-slate-100 shadow-inner">
                   <MapPicker 
                     lat={formData.lat} 
                     lng={formData.lng} 
                     onChange={(lat, lng) => setFormData({...formData, lat, lng})}
                   />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-bold text-sm focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="Street, District, Province..."
                />
             </div>

             <div className="pt-4">
               <Button onClick={() => setStep(2)} disabled={!formData.name || !formData.phone || !formData.address} className="w-full bg-slate-900 text-white py-6 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Next Protocol
               </Button>
             </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="bg-primary/10 border-2 border-primary/20 rounded-[2.5rem] p-8 mb-8">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-slate-900">
                      <Icons.Wallet size={24} />
                   </div>
                   <h3 className="font-black text-xl uppercase tracking-tighter">Treasury Setup</h3>
                </div>
                <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">Provide your bank details to receive automated weekly payouts.</p>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Institution</label>
                   <select 
                      value={formData.bankName}
                      onChange={e => setFormData({...formData, bankName: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-black text-sm focus:outline-none focus:border-primary/50 transition-all"
                   >
                       <option value="">Select Target Bank</option>
                       <option value="PromptPay">PromptPay (Universal)</option>
                       <option value="KBank">Kasikorn (KBank)</option>
                       <option value="SCB">Siam Commercial (SCB)</option>
                       <option value="BBL">Bangkok Bank (BBL)</option>
                       <option value="KTB">Krungthai (KTB)</option>
                       <option value="Krungsri">Krungsri (BAY)</option>
                   </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                      <input 
                        required
                        value={formData.accountNumber}
                        onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-mono text-sm focus:outline-none focus:border-primary/50 transition-all font-bold"
                        placeholder="000-0-00000-0"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Name</label>
                      <input 
                        required
                        value={formData.accountName}
                        onChange={e => setFormData({...formData, accountName: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-black text-sm focus:outline-none focus:border-primary/50 transition-all"
                        placeholder="Full Legal Name"
                      />
                   </div>
                </div>
             </div>

             <div className="pt-8 grid grid-cols-2 gap-4">
               <Button onClick={() => setStep(1)} className="w-full bg-slate-100 text-slate-400 py-6 rounded-full font-black text-xs uppercase tracking-widest">
                  Back
               </Button>
               <Button onClick={() => setStep(3)} disabled={!formData.bankName || !formData.accountNumber} className="w-full bg-slate-900 text-white py-6 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-300">
                  Final Step
               </Button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="grid grid-cols-1 gap-6">
                {[
                  { id: 'business_license', label: '1. Business License / registration' },
                  { id: 'owner_id', label: '2. Owner ID Card' },
                  { id: 'storefront', label: '3. Storefront Main Photo' }
                ].map(doc => (
                  <div key={doc.id} className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{doc.label}</label>
                     <div 
                       onClick={() => document.getElementById(`file-${doc.id}`)?.click()}
                       className={`relative aspect-[16/5] rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${getDocPreview(doc.id) ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50'}`}
                     >
                        {getDocPreview(doc.id) ? (
                          <img src={getDocPreview(doc.id)} className="w-full h-full object-cover" />
                        ) : (
                          <Icons.Camera size={24} className="text-slate-300" />
                        )}
                        <input 
                          type="file" 
                          id={`file-${doc.id}`} 
                          className="hidden" 
                          accept="image/*"
                          onChange={e => e.target.files?.[0] && handleFileChange(doc.id, e.target.files[0])}
                        />
                     </div>
                  </div>
                ))}
             </div>

             <div className="pt-6 grid grid-cols-1 gap-4">
               <Button 
                 onClick={handleSubmit} 
                 isLoading={isSubmitting}
                 disabled={formData.documents.length < 3}
                 className="w-full bg-primary text-slate-900 py-7 rounded-full font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 transform transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
               >
                  Authorize Partnership
               </Button>
               <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mt-2">
                  Edit financial details
               </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
