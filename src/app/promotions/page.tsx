"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";
import { useScrollCollapse } from "@/hooks/useScrollCollapse";
import { useToast } from "@/components/providers/ToastProvider";

export default function PromotionsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isCollapsed = useScrollCollapse(50);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);
  const [dbCoupons, setDbCoupons] = useState<any[]>([]);

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

  useEffect(() => {
    async function fetchCoupons() {
      try {
        const res = await fetch("/api/coupons");
        const data = await res.json() as any;
        if (data.coupons) setDbCoupons(data.coupons);
      } catch (err) {
        console.error("Failed to fetch coupons:", err);
      } finally {
        setIsLoadingCoupons(false);
      }
    }
    fetchCoupons();
  }, []);

  // Points formula: Every ฿100 spent = 1 point
  const totalPoints = Math.floor(orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0) / 100);
  const currentTier = totalPoints >= 300 ? 'diamond' : totalPoints >= 150 ? 'gold' : totalPoints >= 50 ? 'silver' : 'bronze';
  const nextTierPoints = totalPoints >= 300 ? 300 : totalPoints >= 150 ? 300 : totalPoints >= 50 ? 150 : 50;
  const progress = Math.min((totalPoints / nextTierPoints) * 100, 100);
  const pointsToGo = Math.max(nextTierPoints - totalPoints, 0);

  const handleInviteFriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!process.env.NEXT_PUBLIC_LIFF_ID) {
        showToast(t("promotions.inviteSuccess"), "success");
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
          if (result) showToast(t("promotions.inviteSuccess"), "success");
        } else showToast(t("promotions.shareNotAvailable"), "warning");
      } else showToast(t("promotions.mustLogin"), "warning");
    } catch (err) {
      console.error(err);
      showToast(t("promotions.inviteError"), "error");
    }
  };

  const couponColors = ["bg-blue-500", "bg-orange-500", "bg-violet-600", "bg-emerald-500", "bg-rose-500", "bg-indigo-500"];
  
  const deals = dbCoupons.map((cpn, idx) => ({
    title: cpn.title || t(`admin.coupons.modal.code`) + " " + cpn.code,
    desc: cpn.description || (cpn.type === 'percentage' ? `${cpn.value}% ${t('promotions.discount') || 'Discount'}` : `฿${cpn.value} ${t('promotions.discount') || 'Discount'}`),
    code: cpn.code,
    color: couponColors[idx % couponColors.length],
    expires: cpn.expiryDate ? new Date(cpn.expiryDate).toLocaleDateString() : t("promotions.deals.newUserExpires")
  }));

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      <header className={`relative z-50 px-6 sticky top-0 header-transition ${
        isCollapsed ? "pt-2 pb-2 bg-primary shadow-md flex items-center justify-between" : "pt-4 pb-6 bg-transparent"
      }`}>
        <div className={`flex items-center gap-3 header-transition ${isCollapsed ? "mb-0" : "mb-4"}`}>
            <div className={`rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 header-transition ${isCollapsed ? "w-8 h-8" : "w-10 h-10"}`}>
                <Icons.Percent size={isCollapsed ? 16 : 20} />
            </div>
            <h1 className={`font-black text-white drop-shadow-sm header-transition ${isCollapsed ? "text-xl" : "text-3xl"}`}>{t("promotions.title")}</h1>
        </div>
        <p className={`text-white/70 font-medium header-element-collapse ${isCollapsed ? "text-[10px] header-element-hidden" : "text-sm"}`}>{t("promotions.subtitle")}</p>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 pb-24 animate-page-enter stagger">
        {/* Membership Card (High Contrast Premium) */}
        <div className="relative group animate-slide-up -mt-2">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-dark rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="p-6 relative shadow-2xl rounded-xl border border-white/20 bg-gradient-to-br from-[#ae8b5b] to-[#806642] backdrop-blur-xl">
            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-black text-primary uppercase">RUBJOB</span>
                    <span className="text-xs font-bold text-primary/80">{t("promotions.memberLabel")}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[56px] leading-none font-black text-white drop-shadow-lg">{totalPoints}</span>
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
                    {t("promotions.nextTier")} <span className="text-white font-black">{t(`tiers.${currentTier === 'diamond' ? 'diamond' : currentTier === 'gold' ? 'diamond' : currentTier === 'silver' ? 'gold' : 'silver'}`)}</span>
                  </span>
                  <span className="text-[10px] font-black text-white bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-md">
                    {t("promotions.pointsToGo").replace("{points}", pointsToGo.toString())}
                  </span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full p-[2px] border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ffd33d] to-[#ff9f1c] rounded-full shadow-[0_0_15px_rgba(255,159,28,0.5)]" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>

              <button 
                onClick={() => router.push('/booking')}
                className="w-full mt-8 py-4 bg-[#ff9f1c] text-white rounded-xl text-[14px] font-black tracking-wide shadow-2xl shadow-[#ff9f1c]/30 active:scale-95 transition-all outline-none flex items-center justify-center gap-2"
              >
                <Icons.Guarantee size={18} />
                {t("promotions.redeemBtn")}
              </button>
              <p className="text-[10px] text-white/40 font-bold text-center mt-3 uppercase tracking-wider">ทุกๆ ฿100 ที่ใช้บริการ = 1 คะแนน</p>
            </div>
          </div>
        </div>

        {/* Coupon Grid */}
        <div className="grid grid-cols-1 gap-6">
            {isLoadingCoupons && (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {!isLoadingCoupons && deals.length === 0 && (
              <Card className="p-10 text-center bg-white/10 backdrop-blur-md border border-white/20">
                <p className="text-white/60 font-bold">{t("booking.noCoupons")}</p>
              </Card>
            )}
            {deals.map((deal, i) => (
                <Card key={i} className="p-0 overflow-x-hidden relative group" hoverable>
                    <div className="flex">
                        <div className={`w-4 ${deal.color} self-stretch`} />
                        <div className="flex-1 p-6 relative">
                            {/* Decorative Cutouts for Ticket shape */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-r border-slate-100" />
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full border-l border-slate-100" />
                            
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-black text-slate-800 text-base">{deal.title}</h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{deal.expires}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-6">{deal.desc}</p>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleCopy(deal.code)}
                                    className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-4 py-2 flex-1 flex items-center justify-between active:scale-[0.98] transition-all group"
                                >
                                    <span className="font-black text-sm text-slate-700">{deal.code}</span>
                                    <span className="text-[10px] font-black text-primary-dark uppercase">
                                        {copiedCode === deal.code ? t("common.copied") : t("common.copy")}
                                    </span>
                                </button>
                                <Button 
                                    size="sm" 
                                    onClick={handleUseNow}
                                    className="px-6 bg-primary text-white border-none font-black text-[10px] uppercase"
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
