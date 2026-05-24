"use client";

import { useState, useEffect } from "react";
import { useLiff } from "@/components/providers/LiffProvider";
import LoginView from "@/components/auth/LoginView";
import OnboardingFlow from "@/components/auth/OnboardingFlow";
import { Icons } from "@/components/ui/Icons";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const { isReady, isLoggedIn, profile, error } = useLiff();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  const isBackoffice = typeof window !== "undefined" && (
    window.location.pathname.startsWith("/admin") || 
    window.location.pathname.startsWith("/rubber") || 
    window.location.pathname.startsWith("/partner-store") ||
    window.location.pathname.startsWith("/partner-service") ||
    window.location.hostname.startsWith("admin.") ||
    window.location.hostname.startsWith("rubber.") ||
    window.location.hostname.startsWith("store.") ||
    window.location.hostname.startsWith("provider.")
  );

  // Landing and legal pages should bypass LIFF/onboarding entirely
  const isLanding = typeof window !== "undefined" && (
    window.location.pathname.startsWith("/landing") ||
    window.location.pathname.startsWith("/register") ||
    window.location.pathname.startsWith("/privacy") ||
    window.location.pathname.startsWith("/terms") ||
    window.location.pathname.startsWith("/contact") ||
    // Root domain with no subdomain (middleware rewrites to /landing)
    (!window.location.hostname.startsWith("app.") &&
     !window.location.hostname.startsWith("admin.") &&
     !window.location.hostname.startsWith("rubber.") &&
     !window.location.hostname.startsWith("store.") &&
     (window.location.hostname.includes("rubjob-all.com") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "lvh.me") &&
     window.location.pathname === "/")
  );

  // Service Worker Registration & Web Push
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW Registered:', reg.scope))
        .catch(err => console.error('SW Registration failed:', err));
    }
  }, []);

  // Check if user has completed onboarding (has phone + at least 1 address)
  // Uses localStorage as a fast-path cache to avoid blocking on API calls,
  // then verifies against the server in the background.
  useEffect(() => {
    if (!isReady || !isLoggedIn || !profile?.userId || isBackoffice || isLanding) {
      setNeedsOnboarding(null);
      return;
    }

    // Clean up legacy generic key if present
    localStorage.removeItem("rubjob_onboarding_done");

    const cacheKey = `rubjob_onboarded_${profile.userId}`;
    const cachedDone = localStorage.getItem(cacheKey) === "true";

    // Fast-path: if localStorage says onboarding is done, show children immediately
    // We'll still verify with the server in the background
    if (cachedDone) {
      setNeedsOnboarding(false);
      setCheckingOnboarding(false);
    }

    async function checkOnboarding() {
      // Only show loading spinner if we don't have a cached result
      if (!cachedDone) {
        setCheckingOnboarding(true);
      }

      // Timeout after 8 seconds to prevent indefinite loading
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const [userRes, addrRes] = await Promise.all([
          fetch(`/api/user/${profile?.userId}`, { signal: controller.signal }),
          fetch(`/api/user/addresses?userId=${profile?.userId}`, { signal: controller.signal }),
        ]);
        clearTimeout(timeout);

        const userData = (await userRes.json()) as any;
        const addrData = (await addrRes.json()) as any;

        // If user not found in DB (deleted account) → force onboarding
        if (userRes.status === 404 || !userData.user) {
          localStorage.removeItem(cacheKey);
          setNeedsOnboarding(true);
          return;
        }

        const hasPhone = !!userData.user?.phone;
        const hasAddress = (addrData.addresses?.length || 0) > 0;
        const completed = hasPhone && hasAddress;

        // Sync localStorage with actual server state
        if (completed) {
          localStorage.setItem(cacheKey, "true");
        } else {
          localStorage.removeItem(cacheKey);
        }

        setNeedsOnboarding(!completed);
        
        // Automation: Subscribe to Push notifications if not already done
        if (hasPhone) {
          const { subscribeToPush } = await import("@/lib/notifications");
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidKey) {
            const sub = await subscribeToPush(vapidKey);
            if (sub) {
              await fetch("/api/user/push-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: profile.userId, subscription: sub })
              });
            }
          }
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error("Failed to check onboarding status:", err);
        // On error: if localStorage says user already completed onboarding,
        // trust the cache and let them through instead of forcing re-onboarding.
        // Only force onboarding if there's no cached evidence of completion.
        if (!cachedDone) {
          setNeedsOnboarding(true);
        }
        // If cachedDone is true, needsOnboarding is already false — user passes through
      } finally {
        setCheckingOnboarding(false);
      }
    }

    checkOnboarding();
  }, [isReady, isLoggedIn, profile?.userId, isBackoffice, isLanding]);

  const isApi = typeof window !== "undefined" && window.location.pathname.startsWith("/api/");

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase animate-pulse">เตรียมพร้อม... อีกแป๊บเดียว</p>
      </div>
    );
  }

  // API routes should never be wrapped or redirected to login view
  if (isApi || isLanding) {
    return <>{children}</>;
  }

  if (!isLoggedIn) {
    if (isBackoffice || isLanding || isApi) {
      return <>{children}</>;
    }
    return <LoginView />;
  }

  // If on backoffice, don't check onboarding at all - return early before the loading state
  if (isBackoffice) {
    return <>{children}</>;
  }

  // Still checking onboarding status for customers
  if ((needsOnboarding === null || checkingOnboarding) && !isBackoffice && !isLanding && !isApi) {
    // Add a safety timeout: If still loading after 4 seconds, just show children
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase animate-pulse">กำลังเตรียมข้อมูลให้คุณ...</p>
        
        {/* Retry button if stuck — reload the page instead of skipping onboarding */}
        <button 
          onClick={() => window.location.reload()}
          className="mt-12 text-[10px] font-black text-slate-300 uppercase underline underline-offset-4"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  // Needs onboarding — show flow
  if (needsOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => setNeedsOnboarding(false)}
      />
    );
  }

  return <>{children}</>;
}
