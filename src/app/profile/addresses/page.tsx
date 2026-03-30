"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { MOCK_ADDRESSES } from "@/lib/mock-data";
import type { Address } from "@/types";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";

export default function ManageAddressesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [isAdding, setIsAdding] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  
  // Form State
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNote, setNewNote] = useState("");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  const handleAddAddress = () => {
    if (!newLabel || !newAddress) {
      alert(t("profile.addressRequired"));
      return;
    }

    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      fullAddress: newAddress,
      note: newNote,
      latitude: location?.lat || 13.7563,
      longitude: location?.lng || 100.5018,
    };

    setAddresses([newAddr, ...addresses]);
    setIsAdding(false);
    
    // Reset Form
    setNewLabel("");
    setNewAddress("");
    setNewNote("");
    setLocation(null);
  };

  const confirmLocation = () => {
    // Simulated coordinate selection
    setLocation({ lat: 13.7563, lng: 100.5018 });
    setIsSelectingLocation(false);
  };

  if (isSelectingLocation) {
    return (
      <div className="flex flex-col min-h-dvh bg-white animate-in slide-in-from-bottom duration-300">
         <header className="px-5 pt-12 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h1 className="text-lg font-bold">{t("profile.setCoordinates")}</h1>
            <button onClick={() => setIsSelectingLocation(false)} className="text-sm font-medium text-slate-400">{t("common.cancel")}</button>
         </header>
         <div className="flex-1 relative bg-slate-100 overflow-hidden flex items-center justify-center">
            {/* Simulated Map Background */}
            <div className="absolute inset-0 bg-[#f8f9fa] flex items-center justify-center">
              <div className="text-center p-8">
                 <div className="text-6xl mb-4">🗺️</div>
                 <p className="text-slate-400 text-sm">แผนที่จำลองการปักหมุด</p>
              </div>
            </div>
            
            {/* Pin Center */}
            <div className="relative z-10 -translate-y-5">
               <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg ring-4 ring-white text-white">
                  <Icons.MapPin size={24} strokeWidth={3} />
               </div>
               <div className="w-2 h-2 bg-primary rounded-full mx-auto mt-1 animate-ping" />
            </div>

            {/* Address Overlay */}
            <div className="absolute bottom-10 left-5 right-5 z-20">
               <Card className="p-4 shadow-2xl border-none bg-white/90 backdrop-blur-md">
                  <div className="flex gap-3 mb-4">
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl">🏠</div>
                     <div>
                        <p className="text-sm font-bold text-slate-800">{t("profile.pinLocation")}</p>
                        <p className="text-[11px] text-slate-500">{t("profile.bangkokThailand")}</p>
                     </div>
                  </div>
                  <button 
                    onClick={confirmLocation}
                    className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform"
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
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-black text-white tracking-tight">{t("profile.myAddress")}</h1>
      </header>

      <main className="relative z-10 p-5 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("profile.title")}</p>
        </div>

        {/* Add Address Form */}
        {isAdding && (
          <Card className="p-5 bg-white shadow-2xl shadow-primary/10 animate-in slide-in-from-top-4 duration-300">
             <h2 className="text-sm font-bold text-slate-900 mb-4">{t("profile.addNewAddress")}</h2>
             <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t("profile.addressLabel")}</label>
                  <input 
                    type="text" 
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={t("profile.labelHome")}
                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t("profile.fullAddressLabel")}</label>
                  <div className="relative">
                    <textarea 
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder={t("profile.addressPlaceholder")}
                      rows={3}
                      className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none font-medium"
                    />
                    <button 
                      onClick={() => setIsSelectingLocation(true)}
                      className="absolute right-3 bottom-3 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary shadow-sm hover:border-primary transition-colors flex items-center gap-1.5"
                    >
                      <Icons.MapPin size={12} strokeWidth={3} /> {location ? t("profile.pinned") : t("profile.pinOnMap")}
                    </button>
                  </div>
                </div>
                
                {location && (
                  <div className="bg-emerald-50 text-[10px] font-bold text-emerald-600 px-3 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("profile.pinned")}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t("profile.noteLabel")}</label>
                  <input 
                    type="text" 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={t("profile.notePlaceholder")}
                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                   <button 
                     onClick={() => setIsAdding(false)}
                     className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                   >
                     {t("common.cancel")}
                   </button>
                   <button 
                     onClick={handleAddAddress}
                     className="flex-1 py-3.5 bg-primary text-slate-900 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                   >
                     {t("profile.saveAddress")}
                   </button>
                </div>
             </div>
          </Card>
        )}

        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card key={addr.id} className="p-4" hoverable>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  {addr.label.toLowerCase().includes("home") ? <Icons.Home size={20} /> : <Icons.Office size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{addr.label}</p>
                    {addr.isDefault && (
                       <span className="text-[10px] bg-primary/10 text-primary-dark px-1.5 py-0.5 rounded font-bold">{t("common.confirm")}</span>
                    )}
                       <span className="text-[10px] text-emerald-500 font-black flex items-center gap-1">
                         <Icons.MapPin size={10} strokeWidth={4} /> {t("profile.pinned")}
                       </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{addr.fullAddress}</p>
                  {addr.note && (
                    <div className="flex items-center gap-1 mt-1 text-primary-dark opacity-80">
                      <Icons.FileText size={10} strokeWidth={3} />
                      <p className="text-[10px] font-bold">{addr.note}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button className="text-slate-400 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <section className="pt-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            * {t("profile.myAddressDesc")}
          </p>
        </section>

        {!isAdding && (
          <div className="pt-6 pb-2">
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-4 bg-primary text-black rounded-2xl text-[14px] font-black tracking-wide shadow-2xl shadow-primary/30 active:scale-95 transition-all outline-none"
            >
              {t("profile.addNewAddress")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
