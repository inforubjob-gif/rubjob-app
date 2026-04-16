"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

import { useLiff } from "@/components/providers/LiffProvider";
import { useEffect } from "react";

export default function ServiceAreaPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useLiff();
  const [isSelectingLocation, setIsSelectingLocation] = useState(true);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile?.userId) return;
    fetch(`/api/users/preferences?userId=${profile.userId}`)
      .then(res => res.json())
      .then((data: any) => {
         if (data.preferences?.serviceAreaCoords) setLocation(data.preferences.serviceAreaCoords);
      });
  }, [profile?.userId]);

  const confirmLocation = () => {
    // Simulated coordinate selection
    setLocation({ lat: 13.7563, lng: 100.5018 });
  };

  const handleSave = async () => {
    if (!profile?.userId || !location) return;
    setIsSaving(true);
    await fetch("/api/users/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId: profile.userId, 
        serviceArea: "Wattana, Bangkok", 
        serviceAreaCoords: location 
      })
    });
    setIsSaving(false);
    router.back();
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white overflow-hidden">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-primary active:scale-95 transition-transform border border-orange-100"
          >
            <Icons.Back size={18} />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">{t("store.profile.serviceArea")}</h1>
        </div>
        {location && (
          <Button 
            size="sm" 
            variant="primary" 
            className="rounded-xl px-5 font-black italic shadow-lg shadow-primary/20 animate-scale-in"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "..." : t("common.save")}
          </Button>
        )}
      </header>

      <div className="flex-1 relative bg-slate-50 flex items-center justify-center">
        {/* Simulated Map Background */}
        <div className="absolute inset-0 bg-[#f8f9fa] flex items-center justify-center overflow-hidden">
          {/* Decorative Grid for "Map" look */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="text-center p-8 opacity-20 transform scale-150">
             <div className="text-8xl mb-8 grayscale">🗺️</div>
             <p className="text-slate-900 text-xl font-black uppercase tracking-[0.3em]">{t("store.nearby")}</p>
          </div>
          
          {/* Pulse Effect for Center */}
          <div className="absolute w-64 h-64 bg-primary/5 rounded-full animate-ping opacity-20" />
          <div className="absolute w-32 h-32 bg-primary/10 rounded-full animate-pulse opacity-30" />
        </div>
        
        {/* Pin Center */}
        <div className="relative z-10 -translate-y-8 flex flex-col items-center">
           <div className="w-14 h-14 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-[0_15px_30px_rgba(255,159,28,0.4)] ring-4 ring-white text-white animate-bounce">
              <Icons.MapPin size={32} strokeWidth={3} />
           </div>
           {/* Shadow */}
           <div className="w-4 h-1.5 bg-black/10 rounded-full mt-2 blur-sm scale-150" />
        </div>

        {/* Floating Instruction / Status */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 w-max">
           <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-white/50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                 {location ? t("store.profile.pinned") : t("store.profile.pinLocation")}
              </p>
           </div>
        </div>

        {/* Address card at bottom */}
        <div className="absolute bottom-10 left-5 right-5 z-20">
           <Card className="p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-none bg-white/95 backdrop-blur-xl rounded-[2.5rem]">
              <div className="flex gap-4 mb-6">
                 <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner">📍</div>
                 <div className="flex-1">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{location ? t("store.profile.pinned") : t("store.profile.pinLocation")}</p>
                    <p className="text-xs text-slate-500 font-medium">{location ? "Lat: 13.7563, Lng: 100.5018" : t("store.profile.bangkokThailand")}</p>
                 </div>
              </div>
              
              {!location ? (
                <button 
                  onClick={confirmLocation}
                  className="w-full py-5 bg-primary text-white rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-[0.98] transition-all"
                >
                  {t("store.profile.confirmLocation")}
                </button>
              ) : (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center justify-center gap-3 border border-emerald-100 italic font-black uppercase tracking-widest text-xs">
                  <Icons.CheckCircle size={18} />
                   {t("store.profile.pinned")}
                </div>
              )}
           </Card>
        </div>
      </div>
    </div>
  );
}
