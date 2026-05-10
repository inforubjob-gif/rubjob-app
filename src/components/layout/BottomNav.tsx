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
  const isOnSubdomain = hostname.startsWith("rubber.") || hostname.startsWith("store.") || hostname.startsWith("admin.") || hostname.startsWith("provider.");
  const isStoreContext = pathname.startsWith("/partner-store") || hostname.startsWith("store.");
  const isRubberContext = pathname.startsWith("/rubber") || hostname.startsWith("rubber.");
  const isAdminContext = pathname.startsWith("/admin") || hostname.startsWith("admin.");
  const isProviderContext = pathname.startsWith("/partner-service") || hostname.startsWith("provider.");
  
  const isLandingContext = 
    pathname.startsWith("/landing") || 
    pathname.startsWith("/register") || 
    pathname === "/terms" || 
    pathname === "/privacy" || 
    pathname === "/contact" ||
    (
      !hostname.startsWith("app.") &&
      !hostname.startsWith("admin.") &&
      !hostname.startsWith("rubber.") &&
      !hostname.startsWith("store.") &&
      (hostname.includes("rubjob-all.com") ||
       hostname.includes("rubjob.com") ||
       hostname === "localhost" ||
       hostname === "lvh.me") &&
      pathname === "/"
    );

  // Hide on Authentication screens and full-screen pages
  const isAuthPage = 
    pathname === "/login" ||
    pathname === "/partner/login" || 
    pathname === "/rubber/login" || 
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/auth/link-line") ||
    pathname.startsWith("/rubber/link-line");

  // Determine if we are in a valid app context (Store, Rubber, Provider, or User App)
  const isAppContext = 
    isStoreContext || 
    isRubberContext || 
    isAdminContext || 
    isProviderContext || 
    pathname === "/" ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/promotions") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/success") ||
    pathname.startsWith("/support");

  // Hide logic:
  // 1. If it's an admin context (they use their own layout/nav usually, but BottomNav also checks)
  // 2. If it's a landing context (landing page, register, terms, privacy, contact)
  // 3. If it's an auth page
  // 4. If it's NOT a valid app context (likely a 404 page)
  if (isAdminContext || isLandingContext || isAuthPage || !isAppContext) return null;

  // ── Subdomain-aware path helper ──
  // When on rubber.rubjob-all.com, middleware rewrites "/" → "/rubber" internally,
  // but usePathname() returns "/" (the browser URL). So tab hrefs must use clean
  // paths ("/", "/orders") instead of prefixed paths ("/rubber", "/rubber/orders").
  const portalPrefix = isRubberContext && hostname.startsWith("rubber.") ? "/rubber"
    : isStoreContext && hostname.startsWith("store.") ? "/partner-store"
    : isProviderContext && hostname.startsWith("provider.") ? "/partner-service"
    : "";

  function cleanHref(href: string): string {
    if (!portalPrefix) return href;
    if (href === portalPrefix) return "/";
    if (href.startsWith(portalPrefix + "/")) return href.slice(portalPrefix.length);
    return href;
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
      href: cleanHref("/partner-store"),
      label: t("store.navDashboard") || "Dashboard",
      icon: (active) => <Icons.Tasks size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/partner-store/orders"),
      label: t("store.navOrders") || "Orders",
      icon: (active) => <Icons.FileText size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/partner-store/wallet"),
      label: t("store.navWallet") || "Wallet",
      icon: (active) => <Icons.Wallet size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/partner-store/profile"),
      label: t("store.navProfile") || "Profile",
      icon: (active) => <Icons.UserCog size={24} strokeWidth={active ? 3 : 2} />,
    },
  ];

  const RUBBER_TABS: Tab[] = [
    {
      href: cleanHref("/rubber"),
      label: t("rubber.navDashboard") || "Tasks",
      icon: (active) => <Icons.Tasks size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/rubber/orders"),
      label: t("rubber.navOrders") || "Orders",
      icon: (active) => <Icons.FileText size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/rubber/wallet"),
      label: t("rubber.navWallet") || "Earnings",
      icon: (active) => <Icons.Wallet size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/rubber/profile"),
      label: t("rubber.navProfile") || "Profile",
      icon: (active) => <Icons.UserCog size={24} strokeWidth={active ? 3 : 2} />,
    },
  ];

  const PROVIDER_TABS: Tab[] = [
    {
      href: cleanHref("/partner-service"),
      label: "งาน",
      icon: (active) => <Icons.Tasks size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/partner-service/wallet"),
      label: "รายได้",
      icon: (active) => <Icons.Wallet size={24} strokeWidth={active ? 3 : 2} />,
    },
    {
      href: cleanHref("/partner-service/profile"),
      label: "โปรไฟล์",
      icon: (active) => <Icons.UserCog size={24} strokeWidth={active ? 3 : 2} />,
    },
  ];

  const tabs = isProviderContext ? PROVIDER_TABS : isRubberContext ? RUBBER_TABS : (isStoreContext ? STORE_TABS : USER_TABS);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient bar with subtle top glow */}
      <div className="bg-gradient-to-t from-[#e88a00] to-primary border-t border-white/15 shadow-[0_-4px_24px_rgba(232,138,0,0.3)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto px-1">
          {tabs.map((tab) => {
            const isActive = tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
            
            const isBooking = tab.href === "/booking";

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 group select-none`}
              >
                {/* Active background pill */}
                {isActive && !isBooking && (
                  <div className="absolute inset-x-2 top-1.5 bottom-1.5 bg-white/20 rounded-2xl backdrop-blur-sm" />
                )}

                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center transition-all duration-200 ${
                  isBooking ? "w-auto h-auto" : "w-8 h-8 rounded-xl"
                } ${
                  isActive && !isBooking
                    ? "text-white scale-105" 
                    : !isBooking 
                      ? "text-white/50 group-active:text-white/90 group-active:scale-95" 
                      : ""
                }`}>
                  {tab.icon(isActive)}
                </div>

                {/* Label */}
                <span className={`relative z-10 text-[10px] font-extrabold uppercase leading-none mt-0.5 transition-all duration-200 ${
                  isActive 
                    ? "text-white" 
                    : "text-white/40 group-active:text-white/80"
                }`}>
                  {tab.label}
                </span>

                {/* Active dot indicator */}
                {isActive && !isBooking && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
