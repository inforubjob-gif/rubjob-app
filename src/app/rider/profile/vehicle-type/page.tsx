"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useEffect } from "react";

const VEHICLE_IDS = ["motorcycle", "car", "van"] as const;

export default function VehicleTypePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedVehicle, setSelectedVehicle] = useState("motorcycle");
  const [isSaving, setIsSaving] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);

  useEffect(() => {
    const localSession = localStorage.getItem("rubjob_rider_session");
    if (localSession) {
      const parsed = JSON.parse(localSession);
      setRiderId(parsed.id);
      fetchPrefs(parsed.id);
    } else {
      router.push("/rider/login");
    }
  }, [router]);

  async function fetchPrefs(id: string) {
    try {
      const res = await fetch(`/api/users/preferences?userId=${id}`);
      const data = await res.json();
      if (data.preferences?.vehicleType) {
        setSelectedVehicle(data.preferences.vehicleType);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleSave = async () => {
    if (!riderId) return;
    setIsSaving(true);
    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: riderId, vehicleType: selectedVehicle })
      });
      router.back();
    } catch (error) {
      console.error("Failed to save vehicle type:", error);
    } finally {
      setIsSaving(false);
    }
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
            <p className="text-xs text-slate-400">{t("rider.vehicleTypePage.subtitle")}</p>
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
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">{t("rider.vehicleTypePage.choosePrimary")}</p>
        
        <div className="space-y-4">
           {VEHICLE_IDS.map(id => {
              const icon = id === 'motorcycle' ? <Icons.Bike size={24} /> : <Icons.Truck size={24} />;
              const key = id === 'motorcycle' ? 'motorcycle' : id === 'car' ? 'smallCar' : 'vanPickup';
              
              return (
                <Card 
                  key={id}
                  className={`p-5 flex items-center justify-between cursor-pointer transition-all ${
                      selectedVehicle === id ? 'border-primary bg-orange-50/30 ring-2 ring-primary/20' : 'border-slate-100'
                  }`}
                  onClick={() => setSelectedVehicle(id)}
                >
                  <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          selectedVehicle === id ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-400'
                      }`}>
                          {icon}
                      </div>
                      <div>
                          <h3 className="font-black text-slate-900 uppercase tracking-tight">{t(`rider.vehicleTypePage.${key}.name`)}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{t(`rider.vehicleTypePage.${key}.desc`)}</p>
                      </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedVehicle === id ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200'
                  }`}>
                      {selectedVehicle === id && <Icons.Check size={14} strokeWidth={3} />}
                  </div>
                </Card>
              );
           })}
        </div>

        <div className="p-5 bg-orange-50 rounded-xl border border-orange-100 mt-4">
            <div className="flex items-start gap-3">
                <Icons.Shield size={20} className="text-primary mt-1" />
                <div className="flex-1">
                    <p className="text-[10px] text-orange-900 font-black uppercase tracking-widest mb-1">{t("rider.vehicleTypePage.verificationTitle")}</p>
                    <p className="text-[10px] text-orange-700 font-bold leading-relaxed">
                        {t("rider.vehicleTypePage.verificationDesc")}
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
