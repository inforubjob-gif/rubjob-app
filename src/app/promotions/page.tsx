"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";

export default function PromotionsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUseNow = () => {
    router.push("/");
  };

  const [orders, setOrders] = useState<any[]>([]);
  const { profile, isLoggedIn } = useLiff();

  useEffect(() => {
    if (!profile?.userId) return;
    async function fetchOrders() {
      try {
        const res = await fetch(`/api/orders?userId=${profile?.userId}`);
        const data = await res.json() as any;
        if (data.orders) setOrders(data.orders);
      } catch (err) {
        console.error("Failed to fetch orders in Promotions:", err);
      }
    }
    fetchOrders();
  }, [profile?.userId]);

  const totalPoints = orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0);
  const nextTierPoints = 1500;
  const progress = Math.min((totalPoints / nextTierPoints) * 100, 100);
  const pointsToGo = Math.max(nextTierPoints - totalPoints, 0);

  const handleInviteFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!process.env.NEXT_PUBLIC_LIFF_ID) {
        alert(t("promotions.inviteSuccessMock"));
        return;
      }

      if (isLoggedIn) {
        const liff = (await import("@line/liff")).default;
        if (liff.isApiAvailable("shareTargetPicker")) {
          const result = await liff.shareTargetPicker([
            {
              type: "flex",
              altText: t("promotions.inviteAltText"),
              contents: {
                type: "bubble",
                hero: { type: "image", url: "https://images.unsplash.com/photo-1545173168-9f1967e49549?w=800&q=80", size: "full", aspectRatio: "20:13", aspectMode: "cover" },
                body: {
                  type: "box", layout: "vertical",
                  contents: [
                    { type: "text", text: "RUBJOB", weight: "bold", size: "xl" },
                    { type: "text", text: t("promotions.inviteBody"), wrap: true, color: "#666666", size: "sm" }
                  ]
                },
                footer: {
                  type: "box", layout: "vertical",
                  contents: [
                    { type: "button", style: "primary", color: "#ff9f1c", action: { type: "uri", label: t("promotions.openApp"), uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}` } }
                  ]
                }
              }
            }
          ]);
          if (result) alert(t("promotions.inviteSuccess"));
        } else alert(t("promotions.shareNotAvailable"));
      } else alert(t("promotions.mustLogin"));
    } catch (err) {
      console.error(err);
      alert(t("promotions.inviteError"));
    }
  };

  const deals = [
    { 
        title: t("promotions.deals.songkranTitle"), 
        desc: t("promotions.deals.songkranDesc"),
        code: "SONGKRAN20",
        color: "bg-blue-500",
        expires: t("promotions.deals.songkranExpires"),
    },
    { 
        title: t("promotions.deals.newUserTitle"), 
        desc: t("promotions.deals.newUserDesc"),
        code: "WELCOME50",
        color: "bg-orange-500",
        expires: t("promotions.deals.newUserExpires"),
    },
    { 
        title: t("promotions.deals.flashTitle"), 
        desc: t("promotions.deals.flashDesc"),
        code: "HOMEFLASH",
        color: "bg-violet-600",
        expires: t("promotions.deals.flashExpires"),
    },
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      <header className="relative z-10 px-6 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Icons.Percent size={20} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">{t("promotions.title")}</h1>
        </div>
        <p className="text-white/70 text-sm font-medium">{t("promotions.subtitle")}</p>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 pb-24 animate-fade-in stagger">
        {/* Membership Card (High Contrast Premium) */}
        <div className="relative group animate-slide-up -mt-2">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-dark rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="p-6 relative overflow-hidden shadow-2xl rounded-2xl border border-white/20 bg-gradient-to-br from-[#ae8b5b] to-[#806642] backdrop-blur-xl">
            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-black text-primary uppercase tracking-[0.1em]">RUBJOB</span>
                    <span className="text-xs font-bold text-primary/80">{t("promotions.memberLabel")}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[56px] leading-none font-black text-white tracking-tighter drop-shadow-md">{totalPoints}</span>
                    <span className="text-[11px] font-bold text-slate-300">{t("promotions.pointsLabel")}</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-black/20 backdrop-blur-md rounded-xl flex items-center justify-center text-primary shadow-inner border border-white/10">
                  <Icons.Guarantee size={28} strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-slate-200">
                    {t("promotions.nextTier")} <span className="text-white font-black">{totalPoints >= 1500 ? t("tiers.diamond") : t("tiers.gold")}</span>
                  </span>
                  <span className="text-[10px] font-black text-white bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-md">
                    {t("promotions.pointsToGo").replace("{points}", pointsToGo.toString())}
                  </span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-[2px] border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ffd33d] to-[#ff9f1c] rounded-full shadow-[0_0_15px_rgba(255,159,28,0.5)]" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>

              <button 
                onClick={handleInviteFriend}
                className="w-full mt-8 py-4 bg-[#ff9f1c] text-black rounded-2xl text-[14px] font-black tracking-wide shadow-2xl shadow-[#ff9f1c]/30 active:scale-95 transition-all outline-none"
              >
                {t("promotions.inviteBtn")}
              </button>
            </div>
          </div>
        </div>

        {/* Coupon Grid */}
        <div className="grid grid-cols-1 gap-6">
            {deals.map((deal, i) => (
                <Card key={i} className="p-0 overflow-hidden relative group" hoverable>
                    <div className="flex">
                        <div className={`w-4 ${deal.color} self-stretch`} />
                        <div className="flex-1 p-6 relative">
                            {/* Decorative Cutouts for Ticket shape */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-r border-slate-100" />
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-l border-slate-100" />
                            
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-black text-slate-800 text-base">{deal.title}</h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{deal.expires}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-6">{deal.desc}</p>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleCopy(deal.code)}
                                    className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-4 py-2 flex-1 flex items-center justify-between active:scale-[0.98] transition-all group"
                                >
                                    <span className="font-black text-sm tracking-widest text-slate-700">{deal.code}</span>
                                    <span className="text-[10px] font-black text-primary-dark uppercase">
                                        {copiedCode === deal.code ? t("common.copied") : t("common.copy")}
                                    </span>
                                </button>
                                <Button 
                                    size="sm" 
                                    onClick={handleUseNow}
                                    className="px-6 bg-primary text-slate-900 border-none font-black text-[10px] uppercase tracking-widest"
                                >
                                    {t("common.useNow")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
