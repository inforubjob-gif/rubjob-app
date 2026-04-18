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
  logout: (redirectPath?: string) => void;
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

// ─── Real LIFF Provider ───
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
      // 🕵️ Debug Mock Logic
      const isDev = process.env.NODE_ENV === "development";
      const params = new URLSearchParams(window.location.search);
      const mockId = params.get("mockUser") || (isDev ? localStorage.getItem("rubjob_mock_user") : null);

      if (mockId) {
        try {
          const dbRes = await fetch(`/api/user/${mockId}`);
          const dbData = await dbRes.json() as any;
          if (dbData.user) {
            setCtx({
              isReady: true,
              isLoggedIn: true,
              isInClient: false,
              profile: {
                userId: dbData.user.id,
                displayName: dbData.user.displayName,
                pictureUrl: dbData.user.pictureUrl,
                role: dbData.user.role,
                assignedStoreId: dbData.user.assignedStoreId,
                phone: dbData.user.phone
              },
              error: null,
              login: () => {},
              logout: () => {
                localStorage.removeItem("rubjob_mock_user");
                window.location.href = window.location.pathname;
              },
            });
            return;
          }
        } catch (err) {
          console.error("Mock login failed:", err);
        }
      }

      try {
        const liff = (await import("@line/liff")).default;

        // If no LIFF_ID is configured, show error in production
        if (!LIFF_ID) {
          console.error("[RUBJOB] NEXT_PUBLIC_LIFF_ID is missing from environment");
          setCtx(prev => ({ 
            ...prev, 
            isReady: true, 
            error: "Configuration Error: LIFF ID is missing. Please check Cloudflare Environment Variables." 
          }));
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
              assignedStoreId: dbData.user.assignedStoreId,
              phone: dbData.user.phone
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
        setCtx(prev => ({
          ...prev,
          isReady: true,
          error: String(err),
        }));
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

  const handleLogout = async (redirectPath?: string) => {
    try {
      const liff = (await import("@line/liff")).default;
      if (liff.isLoggedIn()) {
        liff.logout();
      }
      
      setCtx(prev => ({ ...prev, isLoggedIn: false, profile: null }));
      
      // Clear session storage if any
      sessionStorage.clear();

      if (liff.isInClient?.()) {
        liff.closeWindow();
      } else {
        window.location.href = redirectPath || "/";
      }
    } catch (err) {
      console.error("[RUBJOB] Logout error:", err);
      window.location.href = redirectPath || "/";
    }
  };

  return (
    <LiffContext.Provider value={{ ...ctx, login: handleLogin, logout: handleLogout }}>
      {children}
      
      {/* 🛠️ Debug Mock UI (Visible only in development) */}
      {process.env.NODE_ENV === "development" && !ctx.isLoggedIn && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-white rounded-xl shadow-2xl border border-slate-100 p-4 space-y-3 stagger animate-fade-in translate-y-0">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Debug Switcher</p>
           <div className="flex flex-col gap-2">
              <button 
                onClick={() => { localStorage.setItem("rubjob_mock_user", "USER-001"); window.location.reload(); }}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-colors"
              >
                Be Customer
              </button>
              <button 
                onClick={() => { localStorage.setItem("rubjob_mock_user", "STORE-OWNER-001"); window.location.reload(); }}
                className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors"
              >
                Be Store Owner
              </button>
              <button 
                onClick={() => { localStorage.setItem("rubjob_mock_user", "RIDER-001"); window.location.reload(); }}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors"
              >
                Be Rider
              </button>
           </div>
           <button 
            onClick={() => { window.location.href = "/api/debug/init-accounts"; }}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-tighter"
           >
             Reset DB to 1 User Each
           </button>
        </div>
      )}
    </LiffContext.Provider>
  );
}
