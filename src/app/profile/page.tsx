"use client";

import { useState, useEffect } from "react";
import { useLiff } from "@/components/providers/LiffProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import type { Language } from "@/lib/i18n";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, isReady, isLoggedIn, logout } = useLiff();
  const { language, setLanguage, t } = useTranslation();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const MENU_ITEMS = [
    { icon: <Icons.MapPin size={20} />, label: t("profile.myAddress"), description: t("profile.addressDesc"), href: "/profile/addresses" },
    { icon: <Icons.Payment size={20} />, label: t("profile.paymentMethods"), description: t("profile.paymentMethodsDesc"), href: "/profile/payments" },
    { icon: <Icons.Bell size={20} />, label: t("profile.notifications"), description: t("profile.notificationsDesc"), href: "/profile/notifications" },
    { 
      icon: <Icons.Globe size={20} />, 
      label: t("profile.language"), 
      description: language === "th" ? "ไทย (TH)" : "English (EN)",
      onClick: () => setShowLanguageModal(true)
    },
    { icon: <Icons.FileText size={20} />, label: t("profile.termsOfService"), description: t("profile.termsOfServiceDesc"), href: "/profile/tos" },
    { icon: <Icons.Lock size={20} />, label: t("profile.privacyPolicy"), description: t("profile.privacyPolicyDesc"), href: "/profile/privacy" },
  ];

  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [phone, setPhone] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Fetch real data
  useEffect(() => {
    if (!profile?.userId) return;

      async function fetchData() {
        try {
          const [ordersRes, addrRes, syncRes] = await Promise.all([
            fetch(`/api/orders?userId=${profile?.userId}`),
            fetch(`/api/user/addresses?userId=${profile?.userId}`),
            fetch("/api/user/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: profile?.userId, displayName: profile?.displayName, pictureUrl: profile?.pictureUrl })
            })
          ]);

          const ordersData = (await ordersRes.json()) as any;
          const addrData = (await addrRes.json()) as any;
          const syncData = (await syncRes.json()) as any;

          if (ordersData.orders) setOrders(ordersData.orders);
          if (addrData.addresses) setAddresses(addrData.addresses);
          if (syncData.phone) setPhone(syncData.phone);
        } catch (err) {
        console.error("Failed to fetch profile data:", err);
      } finally {
        setIsDataLoading(false);
      }
    }
    fetchData();
  }, [profile?.userId]);

  // Determine user tier based on real purchase history
  const totalAmount = orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0);
  const tierKey = totalAmount >= 2000 ? "gold" : totalAmount >= 500 ? "silver" : "bronze";
  const tier = t(`tiers.${tierKey}`);

  const languages: { key: Language; label: string; sub: string }[] = [
    { key: "th", label: "ภาษาไทย", sub: "Thai (TH)" },
    { key: "en", label: "English", sub: "English (EN)" },
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Profile Header */}
      <header className="relative z-10 px-5 pt-12 pb-12">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-5 top-12 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform z-10"
        >
          <Icons.Back size={20} />
        </button>

        <div className="flex items-center gap-4 mt-12">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold overflow-hidden ring-4 ring-white/30 shadow-lg">
            {profile?.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{isReady ? (profile?.displayName?.[0] ?? "G") : "…"}</span>
            )}
          </div>
          <div className="text-white flex-1 min-w-0">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push("/profile/edit")}>
              <h1 className="text-xl font-extrabold tracking-tight truncate">
                {isReady ? profile?.displayName ?? "Guest" : t("common.loading")}
              </h1>
              <Icons.Edit size={14} className="text-white/50 group-hover:text-white transition-colors" />
            </div>
            {phone ? (
              <p className="text-xs text-white/90 font-bold tracking-wide mt-0.5 flex items-center gap-1.5">
                <Icons.Phone size={10} strokeWidth={3} /> {phone}
              </p>
            ) : (
              <button onClick={() => router.push("/profile/edit")} className="text-[10px] text-white/70 font-bold uppercase tracking-wider mt-1 border border-white/30 px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors">
                {t("profile.addPhone")}
              </button>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">
                {tier} {t("tiers.member")}
              </span>
              <button className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-white/70">
                <Icons.Bell size={12} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 px-5 -mt-4 space-y-6 pb-24 animate-fade-in">
        {/* Saved Addresses */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t("profile.myAddress")}</h2>
            <Link 
              href="/profile/addresses" 
              className="text-[10px] font-bold text-primary bg-white px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform"
            >
              {t("profile.addNewAddress")}
            </Link>
          </div>
          <div className="space-y-2">
            {addresses.length === 0 && !isDataLoading && (
              <p className="text-center py-4 text-xs text-muted italic">
                {t("profile.noAddress") || "No saved addresses yet."}
              </p>
            )}
            {addresses.map((addr) => (
              <Card key={addr.id} className="p-4" hoverable>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                    {addr.label.toLowerCase().includes("home") || addr.label.toLowerCase().includes("บ้าน") ? <Icons.Home size={20} strokeWidth={3} /> : <Icons.Office size={20} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{addr.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{addr.details}</p>
                  </div>
                  <Icons.Back size={14} className="text-slate-300 rotate-180" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Settings Menu */}
        <section>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 px-1">{t("profile.accountSettings")}</h2>
          <Card className="divide-y divide-slate-50 overflow-hidden shadow-xl">
            {MENU_ITEMS.map((item) => {
              const content = (
                <>
                  <div className="w-10 h-10 bg-slate-50 group-hover:bg-primary-light rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary-dark shrink-0 transition-colors">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.description}</p>
                  </div>
                  <Icons.Back size={14} className="text-slate-200 rotate-180 group-hover:text-primary transition-colors" />
                </>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left group"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  {content}
                </button>
              );
            })}
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-rose-50 transition-colors text-left group border-t border-slate-50"
            >
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 group-hover:text-rose-600 shrink-0 transition-colors">
                <Icons.Lock size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose-600">{t("profile.logout")}</p>
                <p className="text-[11px] text-rose-300">{t("profile.signOutDesc")}</p>
              </div>
            </button>
          </Card>
        </section>

        {/* App Info */}
        <div className="text-center pb-8 pt-4">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">RUBJOB {t("common.version")} 1.0.0</p>
          <p className="text-[10px] text-slate-300 mt-2 flex items-center justify-center gap-1.5">
            {t("common.madeInBangkok")} <Icons.Guarantee size={12} className="text-primary-dark" /> Bangkok
          </p>
        </div>
      </div>

      {/* Language Modal (Dropdown Style) */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowLanguageModal(false)} />
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 pb-12 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden" />
            <h3 className="text-xl font-black text-slate-900 mb-6 text-center">{t("profile.selectLanguage")}</h3>
            <div className="space-y-3">
              {languages.map((lang) => (
                <button
                  key={lang.key}
                  onClick={() => {
                    setLanguage(lang.key as any);
                    setShowLanguageModal(false);
                  }}
                  className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all ${
                    language === lang.key 
                      ? "bg-primary/5 border-2 border-primary" 
                      : "bg-slate-50 border-2 border-transparent"
                  }`}
                >
                  <div className="text-left">
                    <p className={`text-sm font-black ${language === lang.key ? "text-primary-dark" : "text-slate-800"}`}>{lang.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lang.sub}</p>
                  </div>
                  {language === lang.key && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-slate-900 shadow-lg">
                      <Icons.Check size={14} strokeWidth={4} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowLanguageModal(false)}
              className="w-full mt-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[12px] font-black uppercase tracking-widest"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
