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
    window.location.pathname.startsWith("/rider") || 
    window.location.pathname.startsWith("/store")
  );

  // Check if user has completed onboarding (has phone + at least 1 address)
  useEffect(() => {
    if (!isReady || !isLoggedIn || !profile?.userId || isBackoffice) {
      setNeedsOnboarding(null);
      return;
    }

    // Fast check: skip if we've already done this on this device
    if (localStorage.getItem("rubjob_onboarding_done") === "true") {
      setNeedsOnboarding(false);
      return;
    }

    async function checkOnboarding() {
      setCheckingOnboarding(true);
      try {
        const [userRes, addrRes] = await Promise.all([
          fetch(`/api/user/${profile?.userId}`),
          fetch(`/api/user/addresses?userId=${profile?.userId}`),
        ]);

        const userData = (await userRes.json()) as any;
        const addrData = (await addrRes.json()) as any;

        const hasPhone = !!userData.user?.phone;
        const hasAddress = (addrData.addresses?.length || 0) > 0;

        setNeedsOnboarding(!hasPhone || !hasAddress);
      } catch (err) {
        console.error("Failed to check onboarding status:", err);
        // On error, let user through (don't block)
        setNeedsOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    checkOnboarding();
  }, [isReady, isLoggedIn, profile?.userId, isBackoffice]);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing RUBJOB...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (isBackoffice) {
      return <>{children}</>;
    }
    return <LoginView />;
  }

  // If on backoffice, don't check onboarding at all
  if (isBackoffice) {
    return <>{children}</>;
  }

  // Still checking onboarding status
  if (needsOnboarding === null || checkingOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading your profile...</p>
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
