"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

interface Tab {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  // Detect context from both hostname subdomain and pathname
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isStoreContext = pathname.startsWith("/store") || hostname.startsWith("store.");
  const isRiderContext = pathname.startsWith("/rider") || hostname.startsWith("rider.");
  const isAdminContext = pathname.startsWith("/admin") || hostname.startsWith("admin.");
  const isProviderContext = pathname.startsWith("/provider") || hostname.startsWith("provider.");
  
  const isLandingContext = pathname.startsWith("/landing") || (
    !hostname.startsWith("app.") &&
    !hostname.startsWith("admin.") &&
    !hostname.startsWith("rider.") &&
    !hostname.startsWith("store.") &&
    (hostname.includes("rubjob-all.com") ||
     hostname.includes("rubjob.com") ||
     hostname === "localhost" ||
     hostname === "lvh.me") &&
    pathname === "/"
  );

  // Hide on Admin portal and landing page
  if (isAdminContext || isLandingContext) return null;

  // Hide on Authentication screens
  if (pathname === "/store/login" || pathname === "/rider/login" || pathname === "/provider/login" || pathname.startsWith("/admin/login")) {
    return null;
  }

  const USER_TABS: Tab[] = [
    {
      href: "/",
      label: t("home.navHome") || "Home",
      icon: (active) => <Icons.Home size={24} strokeWidth={active ? 3 : 2.5} />,
    },
    {
      href: "/orders",
      label: t("home.navOrders") || "Orders",
      icon: (active) => <Icons.Tasks size={24} strokeWidth={active ? 3 : 2.5} />,
    },
    {
      href: "/booking",
      label: t("home.navBook") || "Book",
      icon: () => (
        <div className="w-14 h-14 -mt-8 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/20 text-slate-900 border-4 border-white active:scale-90 transition-transform overflow-hidden p-1.5">
          <img 
            src="/images/rubjob-complete_logo-color.png" 
            alt="Book" 
            className="w-full h-full object-contain"
          />
        </div>
      ),
    },
    {
      href: "/promotions",
      label: t("home.navPromotions") || "Promotions",
      icon: (active) => <Icons.Ticket size={24} strokeWidth={active ? 3 : 2.5} />,
    },
    {
      href: "/profile",
      label: t("home.navProfile") || "Profile",
      icon: (active) => <Icons.User size={24} strokeWidth={active ? 3 : 2.5} />,
    },
  ];

  const STORE_TABS: Tab[] = [
    {
      href: "/store",
      label: t("store.navDashboard") || "Dashboard",
      icon: (active) => <Icons.Tasks size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/store/orders",
      label: t("store.navOrders") || "Orders",
      icon: (active) => <Icons.FileText size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/store/wallet",
      label: t("store.navWallet") || "Wallet",
      icon: (active) => <Icons.Wallet size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/store/profile",
      label: t("store.navProfile") || "Profile",
      icon: (active) => <Icons.UserCog size={24} strokeWidth={active ? 3 : 2} />,
    },
  ];

  const RIDER_TABS: Tab[] = [
    {
      href: "/rider",
      label: t("rider.navDashboard") || "Tasks",
      icon: (active) => <Icons.Tasks size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/rider/orders",
      label: t("rider.navOrders") || "Orders",
      icon: (active) => <Icons.FileText size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/rider/wallet",
      label: t("rider.navWallet") || "Earnings",
      icon: (active) => <Icons.Wallet size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/rider/profile",
      label: t("rider.navProfile") || "Profile",
      icon: (active) => <Icons.UserCog size={24} strokeWidth={active ? 3 : 2} />,
    },
  ];

  const PROVIDER_TABS: Tab[] = [
    {
      href: "/provider",
      label: "งาน",
      icon: (active) => <Icons.Tasks size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/provider/wallet",
      label: "รายได้",
      icon: (active) => <Icons.Wallet size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: "/provider/profile",
      label: "โปรไฟล์",
      icon: (active) => <Icons.UserCog size={24} strokeWidth={active ? 3 : 2} />,
    },
  ];

  const tabs = isProviderContext ? PROVIDER_TABS : isRiderContext ? RIDER_TABS : (isStoreContext ? STORE_TABS : USER_TABS);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-primary border-primary-dark/20 border-t shadow-[0_-8px_30px_rgba(255,159,28,0.25)] pb-[env(safe-area-inset-bottom,0px)]`}>
      <div className={`flex items-center justify-around h-16 max-w-lg mx-auto px-2 text-white/70`}>
        {tabs.map((tab) => {
          const isActive = (tab.href === "/" || tab.href === "/store" || tab.href === "/rider" || tab.href === "/provider") 
            ? pathname === tab.href 
            : pathname.startsWith(tab.href);
          
          const isBooking = tab.href === "/booking";

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300 ${
                isActive 
                  ? "text-white drop-shadow-md" 
                   : "text-white/70 hover:text-white/90"
              }`}
            >
              <div className={`flex items-center justify-center p-1.5 rounded-xl transition-all ${
                isActive && !isBooking ? "bg-white/20 scale-110 shadow-inner" : ""
              }`}>
                {tab.icon(isActive)}
              </div>
              <span className={`text-[10px] font-black uppercase leading-tight ${isActive ? "opacity-100" : "opacity-60"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
