"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";
import { useToast } from "@/components/providers/ToastProvider";

// Dynamic import for MapPicker as it uses Leaflet
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center font-bold text-slate-400">Loading Map...</div>
});

export default function StoreSetupPage() {
  const { t } = useTranslation();
  const { profile } = useLiff();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ lat: 13.7563, lng: 100.5018 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (profile?.assignedStoreId) {
      router.replace("/store");
    }
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.userId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/store/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: profile.userId,
          name,
          address,
          lat: coords.lat,
          lng: coords.lng
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSuccess(true);
        // Small delay to show success before redirect
        setTimeout(() => {
          window.location.href = "/store";
        }, 2000);
      } else {
        showToast(data.error || "Failed to setup store", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred during setup", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-5 text-center bg-slate-50">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/10 scale-110">
          <Icons.CheckCircle size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Setup Complete!</h1>
        <p className="text-sm text-slate-500 font-bold max-w-[240px] leading-relaxed">
          ยินดีด้วย! ร้านของคุณพร้อมให้บริการแล้ว กำลังพาท่านไปยังหน้าแดชบอร์ด...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary/10 to-transparent z-0" />
      
      <header className="relative z-10 px-5 pt-12 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Store Setup</h1>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Start your laundry business today</p>
      </header>

      <div className="relative z-10 px-5 pb-10 flex-1 flex flex-col">
        <Card className="p-6 space-y-6 shadow-2xl shadow-slate-200 border border-white rounded-[2.5rem]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                  <Icons.Logo size={20} variant="icon" />
                </div>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Wash & Clean HQ" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Address</label>
              <div className="relative">
                <div className="absolute left-4 top-4 text-primary">
                  <Icons.MapPin size={20} />
                </div>
                <textarea 
                  required
                  rows={2}
                  placeholder="Street, District, Province..." 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all placeholder:text-slate-300 resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pin Location on Map</label>
              <MapPicker 
                lat={coords.lat} 
                lng={coords.lng} 
                onChange={(lat, lng) => setCoords({ lat, lng })} 
              />
              <p className="text-[9px] font-bold text-slate-400 italic text-right px-1">
                Pin correctly to ensure Rider discovery
              </p>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                fullWidth 
                size="lg" 
                isLoading={isSubmitting}
                className="bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                {isSubmitting ? "Processing..." : "Finish Setup"}
              </Button>
            </div>
          </form>
        </Card>

        <section className="mt-8 px-2 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm border border-slate-100">
              <Icons.Shield size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase">Trusted by Partners</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                Your data is secure. Rubjob uses enterprise-grade encryption for all business transactions.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
