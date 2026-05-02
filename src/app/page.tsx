"use client";

import Link from "next/link";
import { useLiff } from "@/components/providers/LiffProvider";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant, statusLabel } from "@/components/ui/Badge";
// Removed mock import
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

export default function HomePage() {
  const { profile, isReady } = useLiff();
  const { t } = useTranslation();
  const [comingSoonModal, setComingSoonModal] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // State for live data
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Services from D1
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        const data = (await res.json()) as any;
        if (data.services) setServices(data.services);
      } catch (err) {
        console.error("Failed to fetch services:", err);
      }
    }
    fetchServices();
  }, []);

  // 2. Fetch User Orders from D1
  useEffect(() => {
    if (!profile?.userId) return;

    async function fetchOrders() {
      try {
        const res = await fetch(`/api/orders?userId=${profile?.userId}`);
        const data = (await res.json()) as any;
        if (data.orders) setOrders(data.orders);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, [profile?.userId]);

  const laundryServices = services.filter(s => s.category === "laundry");
  const otherServices = services.filter(s => s.category !== "laundry");
  const activeOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-primary via-primary/90 to-slate-50 z-0" />

      {/* ─── Header ─── */}
      <header className="relative z-10 px-5 pt-3 pb-6">
        <div className="flex items-center justify-between mb-4">
          <img
            src="/images/rubjob-complete_Vertical-text-white.png"
            alt="RUBJOB"
            className="h-20 w-auto object-contain"
          />
          
          <Link href="/profile" className="relative group">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold overflow-hidden ring-4 ring-white/30 shadow-xl group-active:scale-90 transition-all">
              {profile?.pictureUrl ? (
                <img
                  src={profile.pictureUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{isReady ? (profile?.displayName?.[0] ?? "R") : "…"}</span>
              )}
            </div>
          </Link>
        </div>

        {/* Search-like bar */}
        <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-3.5 flex items-center gap-2 text-white/80 shadow-inner border border-white/10 mt-6">
          <Icons.Search size={18} />
          <span className="text-sm font-medium">{t("common.searchHint")}</span>
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 pb-24 animate-fade-in">
        {/* ─── Hero Ads ─── */}
        <section className="relative w-full rounded-xl overflow-hidden shadow-2xl shadow-primary/20 group active:scale-[0.98] transition-all duration-500 bg-white border-4 border-white/50">
          <img 
            src="/images/ads/rubjobfull.png" 
            alt="Rubjob Promotion"
            className="w-full h-auto block"
          />
        </section>

        {/* ─── Active Orders ─── */}
        {activeOrders.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">{t("home.activeOrders")}</h2>
              <Link href="/orders" className="text-xs font-black text-primary-dark uppercase">
                {t("common.seeAll")} →
              </Link>
            </div>
            <div className="flex flex-col gap-5 stagger">
              {activeOrders.map((order) => {
                const serviceId = order.serviceId || order.service;
                return (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <Card className="p-4 flex items-center gap-3" hoverable>
                      <div className="w-11 h-11 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark shrink-0">
                        {getServiceIcon(serviceId, { size: 22 })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {t(`orders.services.${serviceId}`)}
                        </p>
                        <p className="text-xs text-muted truncate">{order.id}</p>
                      </div>
                      <Badge variant={statusToBadgeVariant(order.status)}>
                        {t(`orders.status.${order.status}`)}
                      </Badge>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Laundry Services ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">{t("home.ourServices")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 stagger">
            {laundryServices.map((svc) => (
              <ServiceCard key={svc.id} svc={svc} t={t} className="block w-full h-full" />
            ))}
          </div>
        </section>

        {/* ─── Other Services ─── */}
        {otherServices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground font-black lowercase tracking-tight">{t("home.otherServices")}</h2>
            </div>
            
            {/* Category Chips */}
            <div className="flex gap-2 mb-6 overflow-x-auto -mx-5 px-5 pb-2 hide-scrollbar">
               {['All', 'Cleaning', 'Personal Assistant', 'Help'].map((cat) => (
                 <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all border-2 ${
                    selectedCategory === cat 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-primary/20'
                  }`}
                 >
                   {cat === 'All' ? 'ทั้งหมด' : 
                    cat === 'Cleaning' ? 'ทำความสะอาด 🧹' : 
                    cat === 'Personal Assistant' ? 'ผู้ช่วยส่วนตัว 🤝' : 'ช่วยเหลือ 🔧'}
                 </button>
               ))}
            </div>

            <div className="flex overflow-x-auto gap-4 -mx-5 px-5 pb-4 hide-scrollbar snap-x snap-mandatory min-h-[160px]">
              {otherServices
                .filter(svc => selectedCategory === 'All' || svc.category === selectedCategory)
                .map((svc) => (
                  <ServiceCard key={svc.id} svc={svc} t={t} />
              ))}
              {otherServices.filter(svc => selectedCategory === 'All' || svc.category === selectedCategory).length === 0 && (
                <div className="w-full flex flex-col items-center justify-center py-10 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Icons.Search size={24} className="text-slate-300 mb-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase">ไม่พบบริการในหมวดนี้</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Trust Bar ─── */}
        <section className="pb-4">
          <Card className="p-5 bg-gradient-to-r from-primary-light to-amber-50">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center p-2.5 shrink-0 shadow-sm border border-amber-100 transition-transform active:scale-95 duration-300">
                <img 
                  src="/images/icon/icon-shield.png" 
                  alt={t("home.guaranteeTitle")} 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t("home.guaranteeTitle")}</h3>
                <p className="text-xs text-muted mt-0.5">
                  {t("home.guaranteeDesc")}
                </p>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* ─── Coming Soon Modal ─── */}
      {comingSoonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setComingSoonModal(null)} />
          <div className="bg-white rounded-xl p-8 w-full max-w-[320px] relative z-10 shadow-2xl animate-scale-in flex flex-col items-center text-center">
            <div className="w-28 h-28 bg-amber-50 rounded-full flex items-center justify-center p-4 mb-6 shrink-0 shadow-inner">
              <img 
                src="/images/icon/icon-Under-maintenance..png" 
                alt="Under Maintenance" 
                className="w-full h-full object-contain animate-bounce-slow" 
              />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">{t("common.comingSoon")}</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              {t("common.comingSoonDesc").replace("{service}", comingSoonModal!)}
            </p>
            <Button 
              fullWidth 
              onClick={() => setComingSoonModal(null)} 
              className="rounded-xl shadow-lg shadow-primary/20"
            >
              {t("common.gotIt")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ svc, t, onComingSoon, className }: { svc: any, t: any, onComingSoon?: (name: string) => void, className?: string }) {
  if (onComingSoon) {
    return (
      <button onClick={() => onComingSoon(t(`orders.services.${svc.id}`) || svc.name)} className={className || "min-w-[145px] flex-shrink-0 snap-center"}>
        <Card className="p-5 h-full flex flex-col items-center justify-center text-center" hoverable>
          <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark mb-4 group-hover:scale-110 transition-transform">
            {getServiceIcon(svc.id, { size: 24 })}
          </div>
          <h3 className="text-[13px] font-black text-foreground leading-tight line-clamp-2 w-full">
            {t(`orders.services.${svc.id}`) || svc.name}
          </h3>
        </Card>
      </button>
    );
  }

  return (
    <Link href={svc.isDynamicGig ? `/service/${svc.id}` : `/booking?service=${svc.id}`} className={className || "min-w-[145px] flex-shrink-0 snap-center"}>
      <Card className="p-5 h-full flex flex-col items-center justify-center text-center group border-2 border-transparent hover:border-primary/20 transition-all" hoverable>
        {svc.isDynamicGig && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark mb-4 group-hover:scale-110 transition-transform">
          {getServiceIcon(svc.icon || svc.id, { size: 24 })}
        </div>
        <h3 className="text-[13px] font-black text-foreground leading-tight line-clamp-2 w-full">
          {svc.isDynamicGig ? svc.name : (t(`orders.services.${svc.id}`) || svc.name)}
        </h3>
        {svc.isDynamicGig && (
          <p className="text-[10px] font-bold text-primary-dark mt-2 bg-primary/10 px-2 py-0.5 rounded-md w-max mx-auto truncate max-w-full">
            เริ่มต้น ฿{svc.basePrice || 0}
          </p>
        )}
      </Card>
    </Link>
  );
}
