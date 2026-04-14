"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";

export default function StoreServicesPage() {
  const { t } = useTranslation();
  const { profile } = useLiff();
  const router = useRouter();

  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.assignedStoreId) return;
    fetchServices();
  }, [profile?.assignedStoreId]);

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/store/services?storeId=${profile?.assignedStoreId}`);
      const data = await res.json();
      if (data.services) setServices(data.services);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (serviceId: string, isEnabled: boolean, price: number) => {
    setIsSaving(serviceId);
    try {
      const res = await fetch("/api/store/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: profile?.assignedStoreId,
          serviceId,
          isEnabled,
          price
        })
      });
      if (res.ok) {
        await fetchServices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[260px] bg-gradient-to-b from-primary/10 to-transparent z-0" />
      
      <header className="relative z-10 px-5 pt-12 pb-6 border-b border-border bg-white/40 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Icons.Back size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Services & Pricing</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configure your store offerings</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 py-6 space-y-4 pb-24 animate-fade-in">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Services...</p>
          </div>
        ) : (
          services.map((svc) => (
            <Card key={svc.id} className={`p-5 rounded-[2.5rem] border-2 transition-all ${svc.isEnabled ? 'border-primary/20 bg-white shadow-xl shadow-primary/5' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${svc.isEnabled ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-400'}`}>
                  {getServiceIcon(svc.id, { size: 28 })}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    {t(`orders.services.${svc.id}`) || svc.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {svc.category} • Base: ฿{svc.basePrice}/{svc.unit}
                  </p>
                </div>
                <button 
                  onClick={() => handleToggle(svc.id, !svc.isEnabled, svc.price)}
                  disabled={isSaving === svc.id}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${svc.isEnabled ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${svc.isEnabled ? 'transform translate-x-6' : ''}`} />
                </button>
              </div>

              {svc.isEnabled && (
                <div className="space-y-4 animate-slide-up">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Price (฿)</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Profit: +฿{svc.price - svc.basePrice}</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      defaultValue={svc.price}
                      onBlur={(e) => {
                        const newPrice = parseFloat(e.target.value);
                        if (newPrice !== svc.price) {
                          handleToggle(svc.id, true, newPrice);
                        }
                      }}
                      className="w-full bg-slate-50 rounded-2xl px-6 py-4 text-xl font-black text-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black">
                      per {svc.unit}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-md border-t border-border z-40 sm:hidden">
         <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Prices defined here will be applied to client bookings instantly. Ensure your rates are competitive.
         </p>
      </footer>
    </div>
  );
}
