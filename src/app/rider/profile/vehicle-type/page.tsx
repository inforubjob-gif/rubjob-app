"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

import { useLiff } from "@/components/providers/LiffProvider";
import { useEffect } from "react";

const VEHICLES = [
  { id: "motorcycle", name: "Motorcycle", icon: <Icons.Bike size={24} />, desc: "Fast & Agile (Up to 10kg)" },
  { id: "car", name: "Small Car", icon: <Icons.Truck size={24} />, desc: "Standard (Up to 30kg)" },
  { id: "van", name: "Van / Pickup", icon: <Icons.Truck size={24} />, desc: "Large (Unlimited)" }
];

export default function VehicleTypePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useLiff();
  const [selectedVehicle, setSelectedVehicle] = useState("motorcycle");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 1. Get Effective User ID
    let currentUserId = profile?.userId;
    if (!currentUserId && typeof window !== "undefined") {
      const localSession = localStorage.getItem("rubjob_rider_session");
      if (localSession) {
        currentUserId = JSON.parse(localSession).id;
      }
    }

    if (!currentUserId) return;
    
    fetch(`/api/users/preferences?userId=${currentUserId}`)
      .then(res => res.json())
      .then((data: any) => {
         if (data.preferences?.vehicleType) setSelectedVehicle(data.preferences.vehicleType);
      });
  }, [profile?.userId]);

  const handleSave = async () => {
    // Get Effective User ID
    let currentUserId = profile?.userId;
    if (!currentUserId && typeof window !== "undefined") {
      const localSession = localStorage.getItem("rubjob_rider_session");
      if (localSession) {
        currentUserId = JSON.parse(localSession).id;
      }
    }

    if (!currentUserId) return;
    setIsSaving(true);
    await fetch("/api/users/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, vehicleType: selectedVehicle })
    });
    setIsSaving(false);
    router.back();
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-primary active:scale-95 transition-transform border border-orange-100"
          >
            <Icons.Back size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{t("rider.vehicleType") || "Vehicle Type"}</h1>
            <p className="text-xs text-slate-400">Manage your delivery vehicle</p>
          </div>
          <Button 
            size="sm" 
            variant="primary" 
            className="rounded-xl px-4 font-black italic shadow-lg shadow-primary/20"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "..." : t("common.save")}
          </Button>
        </div>
      </header>

      <div className="p-5 space-y-6 animate-fade-in">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">Choose your primary vehicle</p>
        
        <div className="space-y-4">
           {VEHICLES.map(v => (
              <Card 
                key={v.id}
                className={`p-5 flex items-center justify-between cursor-pointer transition-all ${
                    selectedVehicle === v.id ? 'border-primary bg-orange-50/30 ring-2 ring-primary/20' : 'border-slate-100'
                }`}
                onClick={() => setSelectedVehicle(v.id)}
              >
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        selectedVehicle === v.id ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-400'
                    }`}>
                        {v.icon}
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight">{v.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{v.desc}</p>
                    </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedVehicle === v.id ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200'
                }`}>
                    {selectedVehicle === v.id && <Icons.Check size={14} strokeWidth={3} />}
                </div>
              </Card>
           ))}
        </div>

        <div className="p-5 bg-orange-50 rounded-[2.5rem] border border-orange-100 mt-4">
            <div className="flex items-start gap-3">
                <Icons.Shield size={20} className="text-primary mt-1" />
                <div className="flex-1">
                    <p className="text-[10px] text-orange-900 font-black uppercase tracking-widest mb-1">Verification Required</p>
                    <p className="text-[10px] text-orange-700 font-bold leading-relaxed">
                        Changing your vehicle type may require a new document review. Our team will contact you if needed.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
