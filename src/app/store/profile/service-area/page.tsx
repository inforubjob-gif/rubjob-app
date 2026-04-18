"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import dynamic from "next/dynamic";

import { useStoreAuth } from "@/components/providers/StoreProvider";
import { useEffect } from "react";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center font-bold text-slate-400">Loading Map...</div>,
});

export default function ServiceAreaPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { store } = useStoreAuth();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!store?.id) return;
    fetch(`/api/store/preferences?storeId=${store.id}`)
      .then(res => res.json())
      .then((data: any) => {
         if (data.preferences?.serviceAreaCoords) setLocation(data.preferences.serviceAreaCoords);
      });
  }, [store?.id]);

  const handleSave = async () => {
    if (!store?.id || !location) return;
    setIsSaving(true);
    await fetch("/api/store/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id, 
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
        <div className="absolute inset-0 z-0">
          <MapPicker
            lat={location?.lat || 0}
            lng={location?.lng || 0}
            onChange={(lat, lng) => setLocation({ lat, lng })}
          />
        </div>

        {/* Floating Instruction / Status */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 w-max">
           <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-white/50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                 {location ? t("store.serviceAreaPage.positionPinned") : t("store.serviceAreaPage.tapMapToPinLocation")}
              </p>
           </div>
        </div>

        {/* Address card at bottom */}
        <div className="absolute bottom-10 left-5 right-5 z-20">
           <Card className="p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-none bg-white/95 backdrop-blur-xl rounded-xl">
              <div className="flex gap-4 mb-6">
                 <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-3xl shadow-inner">📍</div>
                 <div className="flex-1">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{location ? t("store.profile.pinned") : t("store.profile.pinLocation")}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {location
                        ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`
                        : t("store.profile.bangkokThailand")}
                    </p>
                 </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!location || isSaving}
                className="w-full mt-6 py-5 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? "..." : t("store.serviceAreaPage.confirmSupportArea")}
              </button>
           </Card>
        </div>
      </div>
    </div>
  );
}
