"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import GlobalInput from "@/components/ui/GlobalInput";
import GlobalTextarea from "@/components/ui/GlobalTextarea";
import GlobalSelect from "@/components/ui/GlobalSelect";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function ProviderSetupPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const [provider, setProvider] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [pricingUnit, setPricingUnit] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const AVAILABLE_SKILLS = useMemo(() => [
    { id: "gecko_catcher", name: t("provider.gig.categories.gecko_catcher"), defaultPrice: 300, defaultUnit: t("provider.gig.units.session") },
    { id: "fortune_telling", name: t("provider.gig.categories.fortune_telling"), defaultPrice: 500, defaultUnit: t("provider.gig.units.hour") },
    { id: "life_management", name: t("provider.gig.categories.life_management"), defaultPrice: 400, defaultUnit: t("provider.gig.units.hour") },
    { id: "companion_friend", name: t("provider.gig.categories.companion_friend"), defaultPrice: 250, defaultUnit: t("provider.gig.units.hour") },
    { id: "home_cleaning", name: t("provider.gig.categories.home_cleaning"), defaultPrice: 500, defaultUnit: t("provider.gig.units.session") },
    { id: "personal_assistant", name: t("provider.gig.categories.personal_assistant"), defaultPrice: 1000, defaultUnit: "วัน" }, // 'วัน' not in units yet
  ], [t]);

  useEffect(() => {
    const session = localStorage.getItem("rubjob_provider_session");
    if (session) {
      const parsed = JSON.parse(session);
      setProvider(parsed);
      
      // Pre-fill existing data if modifying
      if (parsed.name && parsed.name !== "ผู้ให้บริการทดสอบ") setName(parsed.name);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.bio) setBio(parsed.bio);
      
      if (parsed.skills && Array.isArray(parsed.skills)) {
        setSelectedSkills(parsed.skills);
        setPricing(parsed.pricing || {});
        setPricingUnit(parsed.pricingUnit || {});
      }
    } else {
      router.replace("/partner/login");
    }
  }, [router]);

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(prev => prev.filter(s => s !== skillId));
    } else {
      setSelectedSkills(prev => [...prev, skillId]);
      
      // Set default pricing configuration
      const skillDefaults = AVAILABLE_SKILLS.find(s => s.id === skillId);
      if (skillDefaults && !pricing[skillId]) {
        setPricing(prev => ({ ...prev, [skillId]: skillDefaults.defaultPrice }));
        setPricingUnit(prev => ({ ...prev, [skillId]: skillDefaults.defaultUnit }));
      }
    }
  };

  const handlePriceChange = (skillId: string, val: string) => {
    setPricing(prev => ({ ...prev, [skillId]: parseInt(val) || 0 }));
  };

  const handleUnitChange = (skillId: string, val: string) => {
    setPricingUnit(prev => ({ ...prev, [skillId]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast(t("provider.setup.nameRequired"), "error");
    if (selectedSkills.length === 0) return showToast(t("provider.setup.skillRequired"), "error");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/provider/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: provider.id,
          email: provider.email,
          name,
          phone,
          bio,
          skills: selectedSkills,
          pricing,
          pricingUnit
        }),
      });

      const data = await res.json() as any;
      if (res.ok && data.success) {
        // Update local session
        const newSession = {
          ...provider,
          name,
          phone,
          bio,
          skills: selectedSkills,
          pricing,
          pricingUnit,
          status: "pending" // Registration puts them in pending state
        };
        localStorage.setItem("rubjob_provider_session", JSON.stringify(newSession));
        
        showToast(t("provider.setup.submitSuccess"), "success");
        router.push("/partner-service");
      } else {
        showToast(data.error || t("provider.dashboard.genericError"), "error");
      }
    } catch (err) {
      showToast(t("provider.setup.submitError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!provider) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary to-primary-dark px-5 pt-4 pb-10 relative">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icons.ArrowRight size={18} className="text-white rotate-180" />
          </button>
          <Icons.Logo variant="icon-white" size={32} />
        </div>
        <h1 className="text-2xl font-black text-white uppercase mt-2">{t("register.partner.title")}</h1>
        <p className="text-white/80 text-xs font-bold leading-relaxed mt-2 max-w-xs">
          {t("register.partner.subtitle")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 -mt-6 relative z-10 space-y-6">
        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
            {t("register.partner.step1Title")}
          </h2>
          
          <div className="space-y-4">
            <GlobalInput
              label={t("register.partner.nameLabel") + " *"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("provider.gig.titlePlaceholder")}
              variant="default"
              required
            />
            <GlobalInput
              label={t("register.partner.phoneLabel")}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08X-XXX-XXXX"
              variant="default"
            />
            <GlobalTextarea
              label={t("provider.gig.descPlaceholder")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("provider.gig.descPlaceholder")}
              rows={3}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
            {t("register.partner.step2Title")}
          </h2>

          <div className="space-y-4">
            {AVAILABLE_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill.id);
              return (
                <div 
                  key={skill.id} 
                  className={`border-2 rounded-xl transition-all overflow-hidden ${isSelected ? "border-primary shadow-sm" : "border-slate-100 hover:border-primary/30 text-slate-400"}`}
                >
                  <label className="flex items-center gap-3 p-4 cursor-pointer select-none">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSkill(skill.id)}
                        className="w-5 h-5 appearance-none rounded-md border-2 border-slate-200 checked:bg-primary checked:border-primary transition-colors cursor-pointer peer"
                      />
                      {isSelected && <Icons.Check size={14} className="absolute text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                    <span className={`text-sm font-black transition-colors ${isSelected ? "text-slate-800" : "text-slate-500"}`}>
                      {skill.name}
                    </span>
                  </label>

                  {/* Pricing Editor (shown only if skill is selected) */}
                  {isSelected && (
                    <div className="bg-orange-50/50 p-4 border-t border-orange-100/50 flex gap-3 animate-in slide-in-from-top-2">
                      <div className="flex-1">
                        <GlobalInput
                          label={t("common.price")}
                          type="number"
                          value={pricing[skill.id] || ""}
                          onChange={(e) => handlePriceChange(skill.id, e.target.value)}
                          variant="default"
                          icon={<span className="text-slate-400 font-bold">฿</span>}
                        />
                      </div>
                      <div className="w-[120px]">
                        <GlobalSelect
                          label={t("common.unit")}
                          value={pricingUnit[skill.id] || t("provider.gig.units.session")}
                          onChange={(e) => handleUnitChange(skill.id, e.target.value)}
                          options={[
                            { label: t("provider.gig.units.session"), value: t("provider.gig.units.session") },
                            { label: t("provider.gig.units.hour"), value: t("provider.gig.units.hour") },
                            { label: "วัน", value: "วัน" },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Info Card */}
        <div className="bg-slate-200/50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 font-bold">
            💡 {t("register.partner.subtitle")}
          </p>
        </div>

        {/* Sticky Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-50">
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            className="bg-primary hover:bg-primary-dark text-white rounded-xl py-5 font-black uppercase text-sm shadow-xl shadow-primary-dark/20 active:scale-95 transition-transform"
          >
            {t("register.partner.submitButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}
