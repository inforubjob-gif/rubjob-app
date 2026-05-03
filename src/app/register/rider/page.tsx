"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function RiderRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    vehicleType: "bike",
    licensePlate: "",
    idNumber: "",
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
      const res = await fetch("/api/register/rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setStep(4); // Success step
      } else {
        const err = await res.json() as any;
        alert(err.error || "Something went wrong");
      }
    } catch (err: any) {
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-2xl shadow-emerald-500/20 animate-bounce">
          <Icons.Check size={48} strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 uppercaseer">Application Sent!</h1>
        <p className="text-slate-400 font-bold mb-8 max-w-xs">
          Your application is being reviewed. We will contact you at <span className="text-primary">{formData.phone}</span> within 24 hours.
        </p>
        <Button onClick={() => router.push("/")} className="bg-white text-slate-900 rounded-full px-12 py-4 font-black uppercase text-xs">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 overflow-hidden relative">
      {/* Abstract Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-40 -mt-20 z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -ml-20 -mb-20 z-0" />

      <nav className="relative z-10 p-6 flex items-center justify-between">
         <div className="flex items-center gap-2" onClick={() => router.push("/")}>
            <Icons.Logo size={32} />
            <span className="font-black text-xler uppercase">Rubjob <span className="text-primary-none">Riders</span></span>
         </div>
         <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-primary shadow-[0_0_10px_rgba(255,191,0,0.5)]' : 'bg-slate-800'}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-primary shadow-[0_0_10px_rgba(255,191,0,0.5)]' : 'bg-slate-800'}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-primary shadow-[0_0_10px_rgba(255,191,0,0.5)]' : 'bg-slate-800'}`} />
         </div>
      </nav>

      <main className="relative z-10 px-6 pt-8 max-w-lg mx-auto">
        <header className="mb-10">
           <h1 className="text-4xl font-black uppercaseer mb-2">
              Join the <br/>
              <span className="text-primary">Elite Fleet</span>
           </h1>
           <p className="text-slate-500 text-xs font-bold uppercase">Step {step} of 3: {step === 1 ? 'Personal Bio' : step === 2 ? 'Vehicle Details' : 'Verification'}</p>
        </header>

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Full Name</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-xl p-5 font-black text-sm focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="e.g. John Wick"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Phone Number</label>
                <input 
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-xl p-5 font-mono text-sm focus:outline-none focus:border-primary/50 transition-all font-bold"
                  placeholder="08X-XXX-XXXX"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Email (Optional)</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-xl p-5 font-bold text-sm focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="john@example.com"
                />
             </div>
             <div className="pt-4">
               <Button onClick={() => setStep(2)} disabled={!formData.name || !formData.phone} className="w-full bg-primary text-white py-6 rounded-xl font-black text-xs uppercase transition-all">
                  Next Step
               </Button>
             </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Vehicle Type</label>
                <div className="grid grid-cols-3 gap-4">
                   {['bike', 'car', 'truck'].map(type => (
                      <div 
                        key={type}
                        onClick={() => setFormData({...formData, vehicleType: type})}
                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${formData.vehicleType === type ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-900/50 border-slate-800 text-slate-600'}`}
                      >
                         {type === 'bike' && <Icons.Bike size={24} />}
                         {type === 'car' && <Icons.Truck size={24} />}
                         {type === 'truck' && <Icons.Package size={24} />}
                         <span className="text-[9px] font-black uppercase">{type}</span>
                      </div>
                   ))}
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">License Plate</label>
                <input 
                  required
                  value={formData.licensePlate}
                  onChange={e => setFormData({...formData, licensePlate: e.target.value})}
                  className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-xl p-5 font-black text-sm focus:outline-none focus:border-primary/50 transition-all uppercase"
                  placeholder="ABC-123 BKK"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">ID Card Number</label>
                <input 
                  required
                  value={formData.idNumber}
                  onChange={e => setFormData({...formData, idNumber: e.target.value})}
                  className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-xl p-5 font-mono text-sm focus:outline-none focus:border-primary/50 transition-all font-bold"
                  placeholder="X-XXXX-XXXXX-XX-X"
                />
             </div>
             <div className="pt-4 grid grid-cols-2 gap-4">
               <Button onClick={() => setStep(1)} className="w-full bg-slate-900 text-slate-400 py-6 rounded-xl font-black text-xs uppercase">
                  Back
               </Button>
               <Button onClick={() => setStep(3)} disabled={!formData.licensePlate || !formData.idNumber} className="w-full bg-primary text-white py-6 rounded-xl font-black text-xs uppercase shadow-2xl shadow-primary/20">
                  Almost Done
               </Button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <p className="text-slate-400 text-[10px] font-bold uppercase leading-relaxed text-center px-4">
                Please upload clear photos of your documents for verification. Maximum file size 5MB.
             </p>

             <div className="grid grid-cols-1 gap-6">
                {[
                  { id: 'id_card', label: '1. National ID Card' },
                  { id: 'license', label: '2. Driver License' },
                  { id: 'profile_photo', label: '3. Profile Photo' }
                ].map(doc => (
                  <div key={doc.id} className="space-y-3">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{doc.label}</label>
                     <div 
                       onClick={() => document.getElementById(`file-${doc.id}`)?.click()}
                       className={`relative aspect-[16/6] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${getDocPreview(doc.id) ? 'border-primary bg-primary/5' : 'border-slate-800 bg-slate-900/50'}`}
                     >
                        {getDocPreview(doc.id) ? (
                          <img src={getDocPreview(doc.id)} className="w-full h-full object-cover opacity-50" />
                        ) : (
                          <Icons.Camera size={24} className="text-slate-700" />
                        )}
                        <input 
                          type="file" 
                          id={`file-${doc.id}`} 
                          className="hidden" 
                          accept="image/*"
                          onChange={e => e.target.files?.[0] && handleFileChange(doc.id, e.target.files[0])}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-[8px] font-black uppercase text-slate-400">{getDocPreview(doc.id) ? 'Change Photo' : 'Upload File'}</span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>

             <div className="pt-4 grid grid-cols-1 gap-4">
               <Button 
                 onClick={handleSubmit} 
                 isLoading={isSubmitting}
                 disabled={formData.documents.length < 3}
                 className="w-full bg-primary text-white py-7 rounded-full font-black text-sm uppercase transition-all disabled:opacity-50"
               >
                  Submit Application
               </Button>
               <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-500 uppercase">
                  Back to edit details
               </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
