"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";

const SKILL_LABELS: Record<string, string> = {
  gecko_catcher: "จับตุ๊กแก 🦎",
  fortune_telling: "ดูดวง 🔮",
  life_management: "จัดการชีวิต 📋",
  companion_friend: "เพื่อนยามเหงา 💬",
  home_cleaning: "ทำความสะอาดบ้าน 🧹",
  personal_assistant: "ผู้ช่วยส่วนตัว 🤝",
};

export default function ProviderProfilePage() {
  const router = useRouter();
  const [provider, setProvider] = useState<any>(null);
  const [gigs, setGigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("rubjob_provider_session");
    if (session) {
      const p = JSON.parse(session);
      setProvider(p);
      fetchGigs(p.id);
    }
  }, []);

  async function fetchGigs(providerId: string) {
    try {
      const res = await fetch(`/api/provider/services?providerId=${providerId}`);
      const data = await res.json();
      if (data.services) setGigs(data.services);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = async () => {
    try { await fetch("/api/provider/logout", { method: "POST" }); } catch (e) {}
    localStorage.removeItem("rubjob_provider_session");
    router.push("/provider/login");
  };

  if (!provider) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary to-primary-dark px-5 pt-4 pb-14 relative">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/provider")} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icons.ArrowRight size={18} className="text-white rotate-180" />
          </button>
          <h1 className="text-xl font-black text-white uppercase">โปรไฟล์พาร์ทเนอร์</h1>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl border-2 border-white/30 shadow-xl overflow-hidden">
            {provider.pictureUrl ? (
              <img src={provider.pictureUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              "🧑‍💼"
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">{provider.name}</h2>
            <p className="text-xs text-white/60 font-bold uppercase mt-1">{provider.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                provider.status === "active" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
              }`}>
                {provider.status === "active" ? "Verified" : provider.status}
              </span>
              <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                {gigs.length} GIGS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-6 space-y-4 pb-24 relative z-10">
        {/* Marketplace Gigs Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">บริการที่ฉันเปิดรับงาน</h3>
            <span className="text-[10px] font-bold text-primary-dark bg-primary/10 px-2 py-0.5 rounded-full uppercase">Dynamic Marketplace</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8 text-primary animate-spin"><Icons.Loading size={24} /></div>
          ) : gigs.length > 0 ? (
            <div className="space-y-3">
              {gigs.map((gig: any) => {
                const pkgs = JSON.parse(gig.packages || "[]");
                const basePrice = pkgs.find((p: any) => p.type === 'basic')?.price || 0;
                return (
                  <div key={gig.id} onClick={() => router.push("/provider/services")} className="flex items-center gap-4 bg-white rounded-xl p-3 border border-slate-100 shadow-sm active:scale-95 transition-all cursor-pointer">
                    <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark shrink-0">
                      <Icons.Stars size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-slate-800 truncate">{gig.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{gig.description || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-primary-dark">฿{basePrice}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Starting</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
               <Icons.Search size={24} className="mx-auto text-slate-300 mb-2" />
               <p className="text-[10px] text-slate-400 font-bold uppercase">ยังไม่ได้สร้างบริการแบบ Gig</p>
            </div>
          )}

          <Button 
            variant="primary" 
            fullWidth 
            className="mt-4 rounded-xl font-black text-xs uppercase py-3.5 shadow-lg shadow-primary/20"
            onClick={() => router.push("/provider/services")}
          >
            ไปหน้าจัดการบริการ (Manage Gigs)
          </Button>
        </Card>

        {/* Bio */}
        {provider.bio && (
          <Card className="p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-3">แนะนำตัว</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">{provider.bio}</p>
          </Card>
        )}

        {/* LINE ID Setting */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
               <Icons.Line size={18} />
            </div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">LINE Contact ID</h3>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. rubjob_official"
              value={provider.lineId || ""} 
              onChange={(e) => setProvider({...provider, lineId: e.target.value})}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <Button 
              onClick={async () => {
                try {
                   const res = await fetch("/api/provider/profile", {
                     method: "PUT",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ lineId: provider.lineId })
                   });
                   if (res.ok) {
                     localStorage.setItem("rubjob_provider_session", JSON.stringify(provider));
                     alert("บันทึก LINE ID สำเร็จ!");
                   }
                } catch (e) {
                   console.error(e);
                }
              }}
              className="rounded-xl px-6"
            >
              บันทึก
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 leading-relaxed">
            * ใส่ไอดีไลน์เพื่อให้ลูกค้ากดปุ่ม "ติดต่อ" เพื่อแชทกับคุณได้โดยตรง
          </p>
        </Card>

        {/* Settings */}
        <Card className="p-2 divide-y divide-slate-50">
          <button 
            onClick={() => router.push("/provider/wallet")}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-primary-dark">
              <Icons.CreditCard size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-slate-900">กระเป๋าเงิน</p>
              <p className="text-[10px] text-slate-400 font-bold">ดูรายได้และถอนเงิน</p>
            </div>
            <Icons.ArrowRight size={16} className="text-slate-300" />
          </button>
        </Card>

        {/* Logout */}
        <Button
          fullWidth
          variant="secondary"
          onClick={handleLogout}
          className="py-5 rounded-xl font-black uppercase text-xs text-rose-500 border-rose-200 hover:bg-rose-50 transition-colors"
        >
          ออกจากระบบ
        </Button>
      </div>

      {/* Bottom Nav handled by global AppWrapper */}
    </div>
  );
}
