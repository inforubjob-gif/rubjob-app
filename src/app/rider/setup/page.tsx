"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function RiderSetupPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("bike");
  const [licensePlate, setLicensePlate] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [riderId, setRiderId] = useState<string | null>(null);

  useEffect(() => {
    const localSession = localStorage.getItem("rubjob_rider_session");
    if (localSession) {
      const parsed = JSON.parse(localSession);
      setRiderId(parsed.id);
      if (parsed.name) setName(parsed.name);
      if (parsed.phone) setPhone(parsed.phone);
    } else {
      router.push("/rider/login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rider/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: riderId,
          name,
          phone,
          vehicleType,
          licensePlate,
          idNumber
        })
      });

      if (res.ok) {
        // After setup, move to document upload
        router.push("/rider/documents");
      } else {
        const data = await res.json() as any;
        showToast(data.error || "Failed to setup rider profile", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden pb-12">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 right-0 h-[320px] bg-gradient-to-b from-primary to-transparent z-0" />
      
      <header className="relative z-10 px-5 pt-12 pb-6 text-white">
        <h1 className="text-3xl font-black uppercase">{t("rider.setup.title")}</h1>
        <p className="text-xs font-bold uppercase mt-1 opacity-80">{t("rider.setup.sub")}</p>
      </header>

      <div className="relative z-10 px-5 flex-1 max-w-lg mx-auto w-full">
        <Card className="p-6 space-y-6 shadow-2xl shadow-primary-dark/10 border border-white rounded-xl bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("rider.setup.fullName")}</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icons.User size={18} />
                </div>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl pl-12 pr-4 py-4 text-sm font-black text-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all"
                  placeholder={t("rider.setup.fullNamePlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("rider.setup.phone")}</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icons.Phone size={18} />
                </div>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl pl-12 pr-4 py-4 text-sm font-black text-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all"
                  placeholder={t("rider.setup.phonePlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("rider.setup.vehicleType")}</label>
              <div className="grid grid-cols-3 gap-3">
                {["bike", "car", "truck"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type)}
                    className={`py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      vehicleType === type 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    {type === "bike" ? <Icons.Bike size={24} /> : type === "car" ? <Icons.Truck size={24} /> : <Icons.Package size={24} />}
                    <span className="text-[9px] font-black uppercase">{t(`rider.setup.vehicles.${type}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("rider.setup.licensePlate")}</label>
              <input 
                type="text" 
                required
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-4 text-sm font-black text-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all"
                placeholder={t("rider.setup.licensePlatePlaceholder")}
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                fullWidth 
                size="lg" 
                isLoading={isSubmitting}
                className="bg-primary text-white py-5 rounded-xl font-black uppercase shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                {t("rider.setup.submit")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
