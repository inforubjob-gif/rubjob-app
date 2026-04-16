"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

import { useLiff } from "@/components/providers/LiffProvider";
import { useEffect } from "react";

import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center font-bold text-slate-400">Loading Map...</div>
});

export default function RiderServiceAreaPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useLiff();
  const [location, setLocation] = useState<{lat: number, lng: number}>({ lat: 13.7563, lng: 100.5018 });
  const [hasPinned, setHasPinned] = useState(false);
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
         if (data.preferences?.serviceAreaCoords) {
           const coords = typeof data.preferences.serviceAreaCoords === 'string' 
             ? JSON.parse(data.preferences.serviceAreaCoords) 
             : data.preferences.serviceAreaCoords;
           setLocation(coords);
           setHasPinned(true);
         }
      });
  }, [profile?.userId]);

  const handleLocationChange = (lat: number, lng: number) => {
    setLocation({ lat, lng });
    setHasPinned(true);
  };

  const handleSave = async () => {
    // Get Effective User ID
    let currentUserId = profile?.userId;
    if (!currentUserId && typeof window !== "undefined") {
      const localSession = localStorage.getItem("rubjob_rider_session");
      if (localSession) {
        currentUserId = JSON.parse(localSession).id;
      }
    }

    if (!currentUserId || !location) return;
    setIsSaving(true);
    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUserId, 
          serviceAreaCoords: location 
        })
      });
      router.back();
    } catch (error) {
      console.error("Failed to save service area:", error);
    } finally {
      setIsSaving(false);
    }
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
          <h1 className="text-lg font-bold text-slate-900">{t("rider.profile.serviceArea") || "Service Area"}</h1>
        </div>
        {hasPinned && (
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

      <div className="flex-1 relative bg-slate-50">
        {/* Real Map Component */}
        <div className="absolute inset-0 z-0">
          <MapPicker 
            lat={location.lat} 
            lng={location.lng} 
            onChange={handleLocationChange} 
          />
        </div>

        {/* Floating Instruction / Status */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 w-max">
           <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-white/50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {hasPinned ? "Position Pinned" : "Tap Map to Pin Location"}
              </p>
           </div>
        </div>

        {/* Address card at bottom */}
        <div className="absolute bottom-10 left-5 right-5 z-20">
           <Card className="p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-none bg-white/95 backdrop-blur-xl rounded-2xl">
              <div className="flex gap-4">
                 <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0">📍</div>
                 <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">
                      {hasPinned ? "Pinned Location" : "Select Your Area"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono font-bold truncate">
                      LAT: {location.lat.toFixed(6)} <br/>
                      LNG: {location.lng.toFixed(6)}
                    </p>
                 </div>
              </div>
              
              <button 
                onClick={handleSave}
                disabled={!hasPinned || isSaving}
                className="w-full mt-6 py-5 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                 {isSaving ? "Saving..." : "Confirm Support Area"}
              </button>
           </Card>
        </div>
      </div>
    </div>
  );
}
