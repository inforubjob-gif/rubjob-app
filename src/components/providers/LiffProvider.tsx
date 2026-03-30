"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types";

interface LiffContextValue {
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile: User | null;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const LiffContext = createContext<LiffContextValue>({
  isReady: false,
  isLoggedIn: false,
  isInClient: false,
  profile: null,
  error: null,
  login: () => {},
  logout: () => {},
});

export function useLiff() {
  return useContext(LiffContext);
}

// ─── Dev-mode fallback when not running inside LINE ───
const MOCK_PROFILE: User = {
  userId: "U_dev_user_001",
  displayName: "RUBJOB Tester",
  email: "tester@rubjob.com",
  pictureUrl: "/images/avata-01.png",
  statusMessage: "Testing RUBJOB 🧺",
};

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export default function LiffProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<LiffContextValue>({
    isReady: false,
    isLoggedIn: false,
    isInClient: false,
    profile: null,
    error: null,
    login: () => {},
    logout: () => {},
  });

  useEffect(() => {
    async function init() {
      try {
        const liff = (await import("@line/liff")).default;

        // If no LIFF_ID is configured, use mock profile for local dev
        if (!LIFF_ID) {
          console.warn("[RUBJOB] No LIFF_ID set — using mock profile for dev");
          setCtx({
            isReady: true,
            isLoggedIn: true,
            isInClient: false,
            profile: MOCK_PROFILE,
            error: null,
            login: handleLogin,
            logout: handleLogout,
          });
          return;
        }

        await liff.init({ liffId: LIFF_ID });

        const isLoggedIn = liff.isLoggedIn();
        const isInClient = liff.isInClient();

        if (!isLoggedIn) {
          setCtx(prev => ({ ...prev, isReady: true, isInClient }));
          return;
        }

        const liffProfile = await liff.getProfile();
        const profile: User = {
          userId: liffProfile.userId,
          displayName: liffProfile.displayName,
          pictureUrl: liffProfile.pictureUrl,
          statusMessage: liffProfile.statusMessage,
        };

        // Sync with Cloudflare D1
        let mergedProfile = { ...profile };
        try {
          await fetch("/api/user/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl
            }),
          });

          // Fetch extra DB fields (role, assignedStoreId)
          const dbRes = await fetch(`/api/user/${profile.userId}`);
          const dbData = await dbRes.json() as any;
          if (dbData.user) {
            mergedProfile = {
              ...profile,
              role: dbData.user.role,
              assignedStoreId: dbData.user.assignedStoreId
            };
          }
        } catch (err) {
          console.error("Failed to sync/fetch user with D1:", err);
        }

        setCtx({
          isReady: true,
          isLoggedIn: true,
          isInClient,
          profile: mergedProfile,
          error: null,
          login: handleLogin,
          logout: handleLogout,
        });
      } catch (err) {
        console.error("[RUBJOB] LIFF init failed:", err);
        // Fallback to mock in dev when LIFF can't initialize
        setCtx({
          isReady: true,
          isLoggedIn: true,
          isInClient: false,
          profile: MOCK_PROFILE,
          error: String(err),
          login: handleLogin,
          logout: handleLogout,
        });
      }
    }

    init();
  }, []);

  const handleLogin = async () => {
    try {
      const liff = (await import("@line/liff")).default;
      if (!liff.isLoggedIn()) {
        liff.login();
      }
    } catch (err) {
      console.error("[RUBJOB] Login failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      const liff = (await import("@line/liff")).default;
      if (liff.isLoggedIn()) {
        liff.logout();
        window.location.reload();
      }
    } catch (err) {
      // In dev mode without LIFF
      window.location.reload();
    }
  };

  return (
    <LiffContext.Provider value={{ ...ctx, login: handleLogin, logout: handleLogout }}>
      {children}
    </LiffContext.Provider>
  );
}
