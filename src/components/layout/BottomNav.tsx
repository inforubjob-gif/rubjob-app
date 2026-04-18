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
  
  const isStoreContext = pathname.startsWith("/store");
  const isRiderContext = pathname.startsWith("/rider");
  const isAdminContext = pathname.startsWith("/admin");

  // Hide on Admin portal always
  if (isAdminContext) return null;

  // Hide on Authentication screens
  if (pathname === "/store/login" || pathname === "/rider/login" || pathname.startsWith("/admin/login")) {
    return null;
  }

  const USER_TABS: Tab[] = [
    {
      href: "/",
      label: t("home.navHome") || "Home",
      icon: (active) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
        </svg>
      ),
    },
    {
      href: "/orders",
      label: t("home.navOrders") || "Orders",
      icon: (active) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11h4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16h4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h.01" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16h.01" />
        </svg>
      ),
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
      icon: (active) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
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

  const tabs = isRiderContext ? RIDER_TABS : (isStoreContext ? STORE_TABS : USER_TABS);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-primary border-primary-dark/20 border-t shadow-[0_-8px_30px_rgba(255,159,28,0.25)] pb-[env(safe-area-inset-bottom,0px)]`}>
      <div className={`flex items-center justify-around h-16 max-w-lg mx-auto px-2 text-white/70`}>
        {tabs.map((tab) => {
          const isActive = (tab.href === "/" || tab.href === "/store" || tab.href === "/rider") 
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
