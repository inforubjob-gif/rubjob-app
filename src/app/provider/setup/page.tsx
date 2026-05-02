"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const AVAILABLE_SKILLS = [
  { id: "gecko_catcher", name: "จับตุ๊กแก 🦎", defaultPrice: 300, defaultUnit: "ครั้ง" },
  { id: "fortune_telling", name: "ดูดวง 🔮", defaultPrice: 500, defaultUnit: "ชม." },
  { id: "life_management", name: "จัดการชีวิต 📋", defaultPrice: 400, defaultUnit: "ชม." },
  { id: "companion_friend", name: "เพื่อนยามเหงา 💬", defaultPrice: 250, defaultUnit: "ชม." },
  { id: "home_cleaning", name: "ทำความสะอาดบ้าน 🧹", defaultPrice: 500, defaultUnit: "ครั้ง" },
  { id: "personal_assistant", name: "ผู้ช่วยส่วนตัว 🤝", defaultPrice: 1000, defaultUnit: "วัน" },
];

export default function ProviderSetupPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [pricingUnit, setPricingUnit] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      router.replace("/provider/login");
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
    if (!name.trim()) return alert("กรุณาระบุชื่อของคุณ");
    if (selectedSkills.length === 0) return alert("กรุณาเลือกบริการอย่างน้อย 1 ประเภท");

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
        
        alert("ส่งข้อมูลลงทะเบียนเรียบร้อย รอทีมงานอนุมัติครับ");
        router.push("/provider");
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      alert("ไม่สามารถบันทึกข้อมูลได้");
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
        <h1 className="text-2xl font-black text-white uppercase mt-2">สร้างบริการของฉัน</h1>
        <p className="text-white/80 text-xs font-bold leading-relaxed mt-2 max-w-xs">
          กำหนดโปรไฟล์ เลือกสิ่งที่ถนัด และตั้งราคาบริการของคุณเองได้อย่างอิสระเพื่อรับงานบน RUBJOB
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 -mt-6 relative z-10 space-y-6">
        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
            ข้อมูลส่วนตัว
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-400">ชื่อผู้ให้บริการ / นามแฝง *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ป้าแม่บ้าน, ทนายคิม, น้องสปาย"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400">เบอร์โทรศัพท์ติดต่อ</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400">แนะนำตัวสั้นๆ ให้ลูกค้ารู้จัก</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="อธิบายประสบการณ์ หรือความเชี่ยวชาญของคุณ..."
                rows={3}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
            เลือกทักษะและตั้งราคา
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
                        <label className="text-[10px] font-black text-primary-dark/60 uppercase">ราคา</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                          <input 
                            type="number"
                            value={pricing[skill.id] || ""}
                            onChange={(e) => handlePriceChange(skill.id, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="w-[100px]">
                        <label className="text-[10px] font-black text-primary-dark/60 uppercase">ต่อ</label>
                        <select
                          value={pricingUnit[skill.id] || "ครั้ง"}
                          onChange={(e) => handleUnitChange(skill.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="ครั้ง">ครั้ง</option>
                          <option value="ชม.">ชม.</option>
                          <option value="วัน">วัน</option>
                        </select>
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
            💡 บริการเหล่านี้จะไปปรากฏบนหน้าจอหลักของแอป RUBJOB เพื่อให้ลูกค้าเลือกใช้บริการและทักหาคุณโดยตรง
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
            บันทึกและเปิดรับงาน
          </Button>
        </div>
      </form>
    </div>
  );
}
