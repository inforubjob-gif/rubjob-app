"use client";
 
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import type { Address } from "@/types";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";
import { useLiff } from "@/components/providers/LiffProvider";
import dynamic from "next/dynamic";
 
const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center font-bold text-slate-400">Loading Map...</div>,
});
 
export default function ManageAddressesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const { profile } = useLiff();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch real addresses
  useEffect(() => {
    if (!profile?.userId) return;
    async function fetchAddresses() {
      try {
        const res = await fetch(`/api/user/addresses?userId=${profile?.userId}`);
        const data = await res.json() as any;
        if (data.addresses) setAddresses(data.addresses);
      } catch (err) {
        console.error("Failed to fetch addresses:", err);
      }
    }
    fetchAddresses();
  }, [profile?.userId]);
 
  const [isAdding, setIsAdding] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  
  // Form State
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNote, setNewNote] = useState("");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
 
  const handleAddAddress = async () => {
    if (!profile?.userId) return;
    if (!newLabel || !newAddress) {
      alert(t("profile.addressRequired"));
      return;
    }
 
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.userId,
          label: newLabel,
          details: newAddress,
          note: newNote,
          lat: location?.lat || 13.7563,
          lng: location?.lng || 100.5018,
          isDefault: addresses.length === 0,
        }),
      });
 
      const data = await res.json() as any;
      if (data.success) {
        const newAddr: Address = {
          id: data.id,
          label: newLabel,
          details: newAddress,
          note: newNote,
          lat: location?.lat || 13.7563,
          lng: location?.lng || 100.5018,
        };
 
        setAddresses([newAddr, ...addresses]);
        setIsAdding(false);
        setNewLabel("");
        setNewAddress("");
        setNewNote("");
        setLocation(null);
      } else {
        alert(data.error || "Failed to save address");
      }
    } catch (err) {
      console.error("Save address error:", err);
      alert("Failed to connect to server");
    } finally {
      setIsSaving(false);
    }
  };
 
  const confirmLocation = () => {
    if (!location) return;
    setIsSelectingLocation(false);
  };
 
  if (isSelectingLocation) {
    return (
      <div className="flex flex-col min-h-dvh bg-white animate-in slide-in-from-bottom duration-300">
         <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
            <button
              onClick={() => setIsSelectingLocation(false)}
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
            >
              <Icons.Back size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-900 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
              {t("profile.setCoordinates")}
            </h1>
            <button 
              onClick={() => setIsSelectingLocation(false)} 
              className="text-xs font-black text-slate-400 uppercase tracking-tight"
            >
              {t("common.cancel")}
            </button>
         </header>
 
         <div className="flex-1 relative bg-slate-100 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <MapPicker
                lat={location?.lat || 0}
                lng={location?.lng || 0}
                onChange={(lat, lng) => setLocation({ lat, lng })}
              />
            </div>
 
            {/* Address Overlay */}
            <div className="absolute bottom-10 left-5 right-5 z-20">
               <Card className="p-6 shadow-2xl shadow-slate-900/10 border-none bg-white/95 backdrop-blur-md rounded-[2rem]">
                  <div className="flex gap-4 mb-6">
                     <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">📍</div>
                     <div className="flex-1">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t("profile.pinLocation")}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-widest">{t("profile.bangkokThailand")}</p>
                     </div>
                  </div>
                  <button 
                    onClick={confirmLocation}
                    disabled={!location}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[14px] font-black uppercase shadow-xl active:scale-95 transition-all disabled:opacity-50 tracking-wider"
                  >
                    {t("profile.confirmLocation")}
                  </button>
               </Card>
            </div>
         </div>
      </div>
    );
  }
 
  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      {/* Header — Premium Style */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 absolute left-1/2 -translate-x-1/2">
          {t("profile.myAddress")}
        </h1>
        <div className="w-9 h-9" />
      </header>
 
      <main className="flex-1 p-5 space-y-6 animate-fade-in stagger pb-28">
        {/* Section Label */}
        <div className="flex items-center justify-between ml-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("profile.title")}</p>
        </div>
 
        {/* Add Address Form (Premium Card) */}
        {isAdding && (
          <Card className="p-6 bg-white shadow-xl shadow-primary/5 animate-in slide-in-from-top-4 duration-300 rounded-[2rem] border-slate-100">
             <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-5">{t("profile.addNewAddress")}</h2>
             <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 block">{t("profile.addressLabel")}</label>
                  <input 
                    type="text" 
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={t("profile.labelHome")}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] px-5 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 block">{t("profile.fullAddressLabel")}</label>
                  <div className="relative group">
                    <textarea 
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder={t("profile.addressPlaceholder")}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] px-5 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none font-bold text-slate-900 placeholder:text-slate-300"
                    />
                    <button 
                      onClick={() => setIsSelectingLocation(true)}
                      className="absolute right-3 bottom-3 bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-black text-primary shadow-sm active:scale-95 transition-transform flex items-center gap-1.5 uppercase hover:border-primary/50"
                    >
                      <Icons.MapPin size={12} strokeWidth={4} /> {location ? t("profile.pinned") : t("profile.pinOnMap")}
                    </button>
                  </div>
                </div>
 
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 block">{t("profile.noteLabel")}</label>
                  <input 
                    type="text" 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={t("profile.notePlaceholder")}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.25rem] px-5 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                   <button 
                     onClick={() => setIsAdding(false)}
                     className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[1.25rem] text-xs font-black uppercase active:scale-95 transition-transform"
                   >
                     {t("common.cancel")}
                   </button>
                   <button 
                     onClick={handleAddAddress}
                     disabled={isSaving}
                     className={`flex-1 py-4 bg-primary text-white rounded-[1.25rem] text-xs font-black uppercase shadow-xl shadow-primary/20 active:scale-95 transition-transform ${isSaving ? 'opacity-50' : ''}`}
                   >
                     {isSaving ? t("common.confirm") + "..." : t("profile.saveAddress")}
                   </button>
                </div>
             </div>
          </Card>
        )}
 
        <div className="space-y-4">
          {addresses.map((addr) => (
            <Card key={addr.id} className="p-0 overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 rounded-[1.75rem] active:scale-[0.99] transition-transform">
              <div className="p-5 flex items-start gap-4">
                {/* Icon Container */}
                <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                  {addr.label.toLowerCase().includes("home") || addr.label.includes("บ้าน") ? <Icons.Home size={26} /> : <Icons.Office size={26} />}
                </div>
 
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black text-slate-900 uppercase truncate">{addr.label}</p>
                    {addr.isDefault && (
                       <span className="text-[9px] bg-primary/10 text-primary-dark px-2 py-0.5 rounded-md font-black uppercase">{t("common.confirm")}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">{addr.details}</p>
                  
                  <div className="flex items-center gap-3 mt-3">
                     <span className="text-[9px] text-emerald-500 font-black flex items-center gap-1 uppercase tracking-widest">
                       <Icons.MapPin size={10} strokeWidth={4} /> {t("profile.pinned")}
                     </span>
                     {addr.note && (
                        <span className="text-[9px] text-slate-400 font-black flex items-center gap-1 uppercase tracking-tight">
                           <Icons.FileText size={10} strokeWidth={4} /> {addr.note}
                        </span>
                     )}
                  </div>
                </div>
 
                <button className="text-slate-300 p-1 self-center hover:text-primary transition-colors">
                  <Icons.ChevronRight size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
 
        {/* Placeholder if empty */}
        {addresses.length === 0 && !isAdding && (
          <div className="py-12 flex flex-col items-center">
             <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 text-slate-200 border border-slate-50">
               <Icons.MapPin size={40} strokeWidth={1.5} />
             </div>
             <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{t("profile.noAddress")}</p>
          </div>
        )}
 
        {!isAdding && (
          <div className="pt-6 pb-2">
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-5 bg-primary text-white rounded-[1.5rem] text-[14px] font-black uppercase tracking-wider shadow-2xl shadow-primary/30 active:scale-95 transition-all outline-none"
            >
              {t("profile.addNewAddress")}
            </button>
          </div>
        )}
 
        <section className="pt-2 px-1">
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight opacity-60">
            * {t("profile.myAddressDesc")}
          </p>
        </section>
      </main>
    </div>
  );
}
