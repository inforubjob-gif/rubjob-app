"use client";
 
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import type { Address } from "@/types";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons, IconCircle } from "@/components/ui/Icons";
import { useLiff } from "@/components/providers/LiffProvider";
import { useToast } from "@/components/providers/ToastProvider";
import dynamic from "next/dynamic";
 
const MapPicker = dynamic(() => import("@/components/ui/GoogleMapPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center font-bold text-slate-400">Loading Map...</div>,
});
 
export default function ManageAddressesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const { profile } = useLiff();
  const { showToast } = useToast();
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
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNote, setNewNote] = useState("");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const handleSelectAddress = async (addr: Address) => {
    if (!profile?.userId || isSaving) return;
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: addr.id,
          userId: profile.userId,
          isDefault: true
        }),
      });

      const data = await res.json() as any;
      if (data.success) {
        // Update local state to reflect the new default
        setAddresses(prev => prev.map(a => ({
          ...a,
          isDefault: a.id === addr.id
        })));
        
        // Optional: brief delay before going back to show the selection state
        setTimeout(() => {
           router.back();
        }, 300);
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch (err) {
      console.error("Select address error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (addr: Address) => {
    setEditingAddressId(addr.id || null);
    setNewLabel(addr.label);
    setNewAddress(addr.details);
    setNewNote(addr.note || "");
    setLocation({ 
      lat: addr.lat ? Number(addr.lat) : 13.7563, 
      lng: addr.lng ? Number(addr.lng) : 100.5018 
    });
    setIsAdding(true);
  };

  const handleDeleteAddress = async (addr: Address) => {
    if (!profile?.userId || !addr.id) return;
    if (!window.confirm(t("profile.confirmDeleteAddress") || `ลบที่อยู่ "${addr.label}"?`)) return;

    try {
      const res = await fetch("/api/user/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: addr.id, userId: profile.userId }),
      });
      const data = await res.json() as any;
      if (data.success) {
        setAddresses(prev => prev.filter(a => a.id !== addr.id));
        showToast(t("profile.addressDeleted") || "ลบที่อยู่สำเร็จ", "success");
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch (err) {
      console.error("Delete address error:", err);
      showToast(t("common.error"), "error");
    }
  };
 
  const handleAddAddress = async () => {
    if (!profile?.userId) return;
    if (!newLabel || !newAddress) {
      showToast(t("profile.addressRequired"), "warning");
      return;
    }
 
    setIsSaving(true);
    try {
      const isEditing = !!editingAddressId;
      const res = await fetch("/api/user/addresses", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAddressId,
          userId: profile.userId,
          label: newLabel,
          details: newAddress,
          note: newNote,
          lat: location?.lat || 13.7563,
          lng: location?.lng || 100.5018,
          isDefault: !isEditing && addresses.length === 0,
        }),
      });
 
      const data = await res.json() as any;
      if (data.success) {
        if (isEditing) {
          setAddresses(addresses.map(a => a.id === editingAddressId ? { ...a, label: newLabel, details: newAddress, note: newNote, lat: location?.lat || 0, lng: location?.lng || 0 } : a));
        } else {
          const newAddr: Address = {
            id: data.id,
            label: newLabel,
            details: newAddress,
            note: newNote,
            lat: location?.lat || 13.7563,
            lng: location?.lng || 100.5018,
          };
          setAddresses([newAddr, ...addresses]);
        }
  
        setIsAdding(false);
        setEditingAddressId(null);
        setNewLabel("");
        setNewAddress("");
        setNewNote("");
        setLocation(null);
      } else {
        showToast(data.error || t("common.error"), "error");
      }
    } catch (err) {
      console.error("Save address error:", err);
      showToast(t("common.error"), "error");
    } finally {
      setIsSaving(false);
    }
  };
 
  // Reverse geocode to get location name
  const [locationName, setLocationName] = useState<string>("");
  const [fullAddress, setFullAddress] = useState<string>("");
  const [isLocatingHere, setIsLocatingHere] = useState(false);

  useEffect(() => {
    if (!location?.lat || !location?.lng) {
      setLocationName("");
      return;
    }
    const GKEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!GKEY) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/reverse-geocode?lat=${location.lat}&lng=${location.lng}`
        );
        const data = await res.json() as any;
        if (data.results?.[0]) {
          // Try to get a short, meaningful name (subdistrict/district/province)
          const parts = data.results[0].address_components as any[];
          const province = parts?.find((p: any) => p.types?.includes("administrative_area_level_1"))?.long_name;
          const district = parts?.find((p: any) => p.types?.includes("administrative_area_level_2"))?.long_name;
          const subdistrict = parts?.find((p: any) => p.types?.includes("sublocality_level_1") || p.types?.includes("sublocality"))?.long_name;
          const name = [subdistrict, district, province].filter(Boolean).join(", ");
          setLocationName(name || data.results[0].formatted_address || "");
          setFullAddress(data.results[0].formatted_address || "");
        }
      } catch {
        setLocationName("");
        setFullAddress("");
      }
    }, 500); // Debounce to avoid excessive API calls

    return () => clearTimeout(timer);
  }, [location?.lat, location?.lng]);

  const handleGoToMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocatingHere(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        });
        setIsLocatingHere(false);
      },
      () => setIsLocatingHere(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const confirmLocation = () => {
    if (!location) return;
    if (!newAddress && fullAddress) {
      setNewAddress(fullAddress);
    } else if (!newAddress && locationName) {
      setNewAddress(locationName);
    }
    setIsSelectingLocation(false);
  };

  if (isSelectingLocation) {
    return (
      <div className="flex flex-col min-h-dvh bg-white animate-in slide-in-from-bottom duration-300">
         <header className="bg-white px-5 pt-4 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
            <button
              onClick={() => setIsSelectingLocation(false)}
              className="active:scale-95 transition-transform"
            >
              <IconCircle variant="white" size="sm">
                <Icons.Back size={16} />
              </IconCircle>
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
                lat={location?.lat ? Number(location.lat) : 0}
                lng={location?.lng ? Number(location.lng) : 0}
                onChange={(lat, lng) => setLocation({ lat, lng })}
              />
            </div>
 
            {/* Address Overlay */}
            <div className="absolute bottom-10 left-5 right-5 z-20">
               <Card className="p-6 shadow-2xl shadow-slate-900/10 border-none bg-white/95 backdrop-blur-md rounded-[2rem]">
                  <div className="flex gap-4 mb-4">
                     <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">📍</div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t("profile.pinLocation")}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                          {locationName || (location ? `${Number(location.lat).toFixed(4)}, ${Number(location.lng).toFixed(4)}` : t("profile.pinOnMap"))}
                        </p>
                     </div>
                  </div>

                  {/* My Location shortcut */}
                  <button
                    onClick={handleGoToMyLocation}
                    disabled={isLocatingHere}
                    className="w-full mb-3 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[12px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {isLocatingHere ? (
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                        <line x1="2" y1="12" x2="6" y2="12" />
                        <line x1="18" y1="12" x2="22" y2="12" />
                      </svg>
                    )}
                    {t("profile.myLocation") || "ตำแหน่งของฉัน"}
                  </button>

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
      <header className="bg-white px-5 pt-4 pb-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="active:scale-95 transition-transform"
        >
          <IconCircle variant="white" size="sm">
            <Icons.Back size={16} />
          </IconCircle>
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
 
        {/* Add/Edit Address Form (Premium Card) */}
        {isAdding && (
          <Card className="p-6 bg-white shadow-xl shadow-primary/5 animate-in slide-in-from-top-4 duration-300 rounded-[2rem] border-slate-100">
             <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-5">{editingAddressId ? t("profile.editAddress") || "แก้ไขที่อยู่" : t("profile.addNewAddress")}</h2>
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
                     onClick={() => { setIsAdding(false); setEditingAddressId(null); setNewLabel(""); setNewAddress(""); setNewNote(""); setLocation(null); }}
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
            <Card key={addr.id} onClick={() => handleSelectAddress(addr)} className={`p-0 overflow-hidden border-slate-100 shadow-xl shadow-slate-200/40 rounded-[1.75rem] active:scale-[0.99] transition-transform cursor-pointer ${addr.isDefault ? 'border-primary ring-2 ring-primary/10' : ''}`}>
              <div className="p-5 flex items-start gap-4">
                {/* Icon Container */}
                <IconCircle variant={addr.isDefault ? "orange" : "ghost"} size="md">
                  {addr.label.toLowerCase().includes("home") || addr.label.includes("บ้าน") ? <Icons.Home size={22} /> : <Icons.Office size={22} />}
                </IconCircle>
 
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black text-slate-900 uppercase truncate">{addr.label}</p>
                    {addr.isDefault && (
                       <span className="text-[9px] bg-primary text-white px-2 py-0.5 rounded-md font-black uppercase">{t("common.confirm")}</span>
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
 
                <div className="flex flex-col gap-1 self-center shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(addr);
                    }}
                    className="text-slate-300 p-2 hover:text-primary transition-colors active:scale-90 rounded-xl hover:bg-primary/5"
                  >
                    <Icons.Edit size={18} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAddress(addr);
                    }}
                    className="text-slate-200 p-2 hover:text-rose-500 transition-colors active:scale-90 rounded-xl hover:bg-rose-50"
                  >
                    <Icons.Trash size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
 
        {/* Placeholder if empty */}
        {addresses.length === 0 && !isAdding && (
          <div className="py-12 flex flex-col items-center">
             <IconCircle variant="slate" size="lg" className="mb-6 opacity-40">
               <Icons.MapPin size={32} strokeWidth={1.5} />
             </IconCircle>
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
