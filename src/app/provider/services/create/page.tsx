"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type PackageData = {
  type: "basic" | "standard" | "premium";
  name: string;
  description: string;
  price: number | "";
  unit: string;
  revisions: number;
  deliveryDays: number;
};

// Common icon/categories available since we don't have image upload
const GIG_CATEGORIES = [
  { id: "gecko_catcher", label: "สัตว์ & แมลง 🦎", preset: "จับตุ๊กแก ไล่แมลง" },
  { id: "fortune_telling", label: "ดูดวง 🔮", preset: "ไพ่ยิปซี ลายมือ" },
  { id: "life_management", label: "จัดการชีวิต 📋", preset: "ช่วยวางแผน จัดตาราง" },
  { id: "companion_friend", label: "เพื่อนยามเหงา 💬", preset: "รับฟัง เป็นเพื่อนเที่ยว" },
  { id: "home_cleaning", label: "ทำความสะอาดบ้าน 🧹", preset: "ทำความสะอาดทั่วไป" },
  { id: "personal_assistant", label: "ผู้ช่วยส่วนตัว 🤝", preset: "เลขาส่วนตัว ช่วยงาน" },
  { id: "graphic_design", label: "ออกแบบกราฟิก 🎨", preset: "โลโก้ แบนเนอร์" },
  { id: "tutor", label: "สอนพิเศษ 📚", preset: "ภาษา คณิตศาสตร์" },
  { id: "developer", label: "เขียนโปรแกรม 💻", preset: "ทำเว็บ ปรับแต่งแอพ" }
];

export default function GigBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [provider, setProvider] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [iconCategory, setIconCategory] = useState(GIG_CATEGORIES[0].id);
  const [packages, setPackages] = useState<PackageData[]>([
    { type: "basic", name: "แพ็คเกจเริ่มต้น (Basic)", description: "", price: "", unit: "งาน", revisions: 1, deliveryDays: 1 }
  ]);
  const [isHasMultiPkg, setIsHasMultiPkg] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("rubjob_provider_session");
    if (session) {
      const parsed = JSON.parse(session);
      setProvider(parsed);
      
      if (editId) {
        fetchGigData(parsed.id, editId);
      }
    } else {
      router.replace("/provider/login");
    }
  }, [router, editId]);

  async function fetchGigData(providerId: string, gigId: string) {
    try {
      const res = await fetch(`/api/provider/services?providerId=${providerId}`);
      const data = await res.json() as any;
      if (data.services) {
        const gig = data.services.find((s: any) => s.id === gigId);
        if (gig) {
          setTitle(gig.title);
          setDescription(gig.description || "");
          setIconCategory(gig.icon || GIG_CATEGORIES[0].id);
          try {
            const parsedPkgs = JSON.parse(gig.packages);
            if (parsedPkgs && parsedPkgs.length > 0) {
              setPackages(parsedPkgs);
              if (parsedPkgs.length > 1) setIsHasMultiPkg(true);
            }
          } catch(e){}
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleToggleMultiPkg = () => {
    if (!isHasMultiPkg) {
      // Add Standard and Premium
      setPackages([
        packages[0],
        { type: "standard", name: "แพ็คเกจแนะนำ (Standard)", description: "", price: "", unit: packages[0].unit, revisions: 2, deliveryDays: 2 },
        { type: "premium", name: "แพ็คเกจพรีเมียม (Premium)", description: "", price: "", unit: packages[0].unit, revisions: 3, deliveryDays: 3 }
      ]);
    } else {
      // Revert to just basic
      setPackages([packages[0]]);
    }
    setIsHasMultiPkg(!isHasMultiPkg);
  };

  const setPkgField = (index: number, field: keyof PackageData, value: any) => {
    const newPkgs = [...packages];
    newPkgs[index] = { ...newPkgs[index], [field]: value };
    setPackages(newPkgs);
  };

  const handleSaveGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("กรุณาตั้งชื่องาน");
    if (!packages[0].price) return alert("กรุณาตั้งราคาแพ็คเกจเริ่มต้น");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/provider/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId || undefined,
          providerId: provider.id,
          title,
          description,
          icon: iconCategory,
          packages
        }),
      });

      const data = await res.json() as any;
      if (res.ok && data.success) {
        alert("บันทึกบริการสำเร็จ!");
        router.push("/provider/services");
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      alert("เชื่อมต่อขัดข้อง");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!provider) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="bg-white px-5 pt-3 pb-4 border-b border-border sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-95 transition-transform">
            <Icons.ArrowRight size={18} className="text-slate-600 rotate-180" />
          </button>
          <h1 className="text-lg font-black text-slate-800">{editId ? "แก้ไขกิ๊ก" : "สร้างกิ๊ก(Gig) ใหม่"}</h1>
        </div>
      </div>

      <form onSubmit={handleSaveGig} className="p-5 space-y-6">
        
        {/* Step 1: Base Info */}
        <section>
          <h2 className="text-sm font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
            รายละเอียดงาน
          </h2>
          <Card className="p-5 space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 mb-1 block">ชื่องาน (Gig Title) *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น รับวาดรูปการ์ตูนน่ารักๆ, รับจดโดเมน"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-black text-slate-500 mb-1 block">หมวดหมู่ / ไอคอนตัวแทน *</label>
              <select
                value={iconCategory}
                onChange={(e) => setIconCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20"
              >
                {GIG_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label} ({cat.preset})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-500 mb-1 block">รายละเอียด / กติกาการรับงาน</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายสิ่งที่คุณจะทำให้ลูกค้า เงื่อนไข สิ่งที่รับทำ และไม่รับทำ..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </Card>
        </section>

        {/* Step 2: Packages */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
              แพ็คเกจราคา
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] font-black text-slate-400">แยก 3 แพ็คเกจ</span>
              <div className={`w-10 h-5 rounded-full p-1 transition-colors flex items-center \${isHasMultiPkg ? "bg-primary" : "bg-slate-300"}`} onClick={handleToggleMultiPkg}>
                <div className={`w-3 h-3 rounded-full bg-white transition-transform \${isHasMultiPkg ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </label>
          </div>

          <div className="flex overflow-x-auto gap-4 hide-scrollbar -mx-5 px-5 snap-x snap-mandatory">
            {packages.map((pkg, index) => (
              <Card key={pkg.type} className={`min-w-[85vw] snap-center p-5 border-t-4 \${
                pkg.type === 'basic' ? 'border-primary' : 
                pkg.type === 'standard' ? 'border-amber-400' : 'border-violet-500'
              }`}>
                <h3 className={`text-sm font-black uppercase mb-4 \${
                  pkg.type === 'basic' ? 'text-primary' : 
                  pkg.type === 'standard' ? 'text-amber-500' : 'text-violet-500'
                }`}>{pkg.name}</h3>

                <div className="space-y-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">ราคา (บาท) *</label>
                      <input 
                        type="number"
                        value={pkg.price}
                        onChange={(e) => setPkgField(index, 'price', parseInt(e.target.value) || "")}
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-base font-black focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    </div>
                    <div className="w-[80px]">
                      <label className="text-[10px] font-black text-slate-400 uppercase">หน่วยคิดเงิน</label>
                      <select
                        value={pkg.unit}
                        onChange={(e) => setPkgField(index, 'unit', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2.5 text-xs font-bold"
                      >
                        <option value="งาน">งาน</option>
                        <option value="ครั้ง">ครั้ง</option>
                        <option value="ชม.">ชม.</option>
                        <option value="ชิ้น">ชิ้น</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">คำอธิบายแพ็คเกจ</label>
                    <textarea 
                      value={pkg.description}
                      onChange={(e) => setPkgField(index, 'description', e.target.value)}
                      placeholder="เช่น ได้รับไฟล์ JPG ส่งงานภายใน 24 ชม."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium resize-none mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">จำนวนครั้งที่แก้ไข</label>
                      <select value={pkg.revisions} onChange={(e) => setPkgField(index, 'revisions', parseInt(e.target.value))} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold">
                        <option value="0">ไม่ให้แก้ไข</option>
                        <option value="1">1 ครั้ง</option>
                        <option value="2">2 ครั้ง</option>
                        <option value="3">3 ครั้ง</option>
                        <option value="99">ไม่จำกัด</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">เวลาส่งมอบ (วัน)</label>
                      <input type="number" value={pkg.deliveryDays} onChange={(e) => setPkgField(index, 'deliveryDays', parseInt(e.target.value)||1)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold" min="1" max="30" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Sticky Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-50">
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            className="bg-primary hover:bg-primary-dark text-white rounded-xl py-5 font-black uppercase text-sm shadow-xl shadow-primary-dark/20 active:scale-95 transition-transform"
          >
            บันทึกการตั้งค่า Gig
          </Button>
        </div>
      </form>
    </div>
  );
}
