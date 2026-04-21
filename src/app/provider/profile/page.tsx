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

  useEffect(() => {
    const session = localStorage.getItem("rubjob_provider_session");
    if (session) {
      setProvider(JSON.parse(session));
    }
  }, []);

  const handleLogout = async () => {
    try { await fetch("/api/provider/logout", { method: "POST" }); } catch (e) {}
    localStorage.removeItem("rubjob_provider_session");
    router.push("/provider/login");
  };

  if (!provider) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-b from-violet-600 to-violet-500 px-5 pt-4 pb-14 relative">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/provider")} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icons.ArrowRight size={18} className="text-white rotate-180" />
          </button>
          <h1 className="text-xl font-black text-white uppercase">โปรไฟล์</h1>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl border-2 border-white/30 shadow-xl">
            {provider.pictureUrl ? (
              <img src={provider.pictureUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              "🧑‍💼"
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">{provider.name}</h2>
            <p className="text-xs text-white/60 font-bold uppercase mt-1">{provider.email}</p>
            <span className={`inline-block mt-2 text-[10px] font-black uppercase px-3 py-1 rounded-full ${
              provider.status === "active" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
            }`}>
              {provider.status === "active" ? "ยืนยันแล้ว" : provider.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-6 space-y-4 pb-24 relative z-10">
        {/* Skills Card */}
        <Card className="p-6">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-4">ทักษะและบริการของฉัน</h3>
          {provider.skills && provider.skills.length > 0 ? (
            <div className="space-y-3">
              {provider.skills.map((skill: string) => (
                <div key={skill} className="flex items-center justify-between bg-violet-50 rounded-xl p-4 border border-violet-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{SKILL_LABELS[skill]?.slice(-2) || "🔧"}</span>
                    <span className="text-sm font-black text-slate-800">{SKILL_LABELS[skill]?.slice(0, -3) || skill}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-violet-600">
                      ฿{provider.pricing?.[skill]?.toLocaleString() || "—"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      /{provider.pricingUnit?.[skill] || "ครั้ง"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-bold">ยังไม่มีทักษะที่ลงทะเบียน</p>
          )}
        </Card>

        {/* Bio */}
        {provider.bio && (
          <Card className="p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-3">แนะนำตัว</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">{provider.bio}</p>
          </Card>
        )}

        {/* Settings */}
        <Card className="p-2 divide-y divide-slate-50">
          <button 
            onClick={() => router.push("/provider/wallet")}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
              <Icons.CreditCard size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-slate-900">กระเป๋าเงิน</p>
              <p className="text-[10px] text-slate-400 font-bold">ดูรายได้และถอนเงิน</p>
            </div>
            <Icons.ArrowRight size={16} className="text-slate-300" />
          </button>

          <a 
            href="https://line.me/R/ti/p/@rubjob" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Icons.Line size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-slate-900">ติดต่อแอดมิน</p>
              <p className="text-[10px] text-slate-400 font-bold">แชทผ่าน LINE Official</p>
            </div>
            <Icons.ExternalLink size={16} className="text-slate-300" />
          </a>
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-lg">
        <div className="flex items-center justify-around py-3 max-w-md mx-auto">
          <button onClick={() => router.push("/provider")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-600 transition-colors">
            <Icons.Home size={20} />
            <span className="text-[10px] font-black uppercase">งาน</span>
          </button>
          <button onClick={() => router.push("/provider/wallet")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-600 transition-colors">
            <Icons.CreditCard size={20} />
            <span className="text-[10px] font-black uppercase">รายได้</span>
          </button>
          <button onClick={() => router.push("/provider/profile")} className="flex flex-col items-center gap-1 text-violet-600">
            <Icons.User size={20} />
            <span className="text-[10px] font-black uppercase">โปรไฟล์</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
