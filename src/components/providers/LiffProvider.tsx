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
const LIFF_ID = (() => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_LIFF_ID ?? "";
  const host = window.location.hostname;
  const path = window.location.pathname;
  
  // Rubber portal uses its own LIFF app
  if (host.startsWith('rubber.')) {
    return process.env.NEXT_PUBLIC_LIFF_ID_RUBBER || process.env.NEXT_PUBLIC_LIFF_ID || "";
  }
  // Quick Book page uses its own LIFF app
  if (path.startsWith('/quick')) {
    return process.env.NEXT_PUBLIC_LIFF_ID_QUICK || process.env.NEXT_PUBLIC_LIFF_ID || "";
  }
  return process.env.NEXT_PUBLIC_LIFF_ID ?? "";
})();

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

        const host = window.location.hostname;
        const path = window.location.pathname;
        const isPortalSubdomain = /^(rubber|admin|store|provider)\./i.test(host) || /^\/(rubber|admin|store|provider)(\/|$)/i.test(path);
        
        const isLanding = path.startsWith("/landing") ||
                          path.startsWith("/register") ||
                          path.startsWith("/terms") ||
                          path.startsWith("/privacy") ||
                          path.startsWith("/contact") ||
                          (!host.startsWith("app.") && !isPortalSubdomain && path === "/");

        await liff.init({ 
          liffId: LIFF_ID,
          withLoginOnExternalBrowser: (!isPortalSubdomain && !isLanding)
        });

        const isLoggedIn = liff.isLoggedIn();
        const isInClient = liff.isInClient();

        // 🔐 Check if user previously logged out intentionally
        // LIFF in LINE's WebView will auto-re-authenticate on every open,
        // so we use a flag to remember the user's logout intent.
        const hasLoggedOut = localStorage.getItem("rubjob_logged_out");
        if (hasLoggedOut && isLoggedIn) {
          // User pressed logout before — honour their intent
          liff.logout();
          localStorage.removeItem("rubjob_logged_out");
          setCtx(prev => ({
            ...prev,
            isReady: true,
            isLoggedIn: false,
            isInClient,
            profile: null,
            login: handleLogin,
            logout: handleLogout,
          }));
          return;
        }

        if (!isLoggedIn) {
          // Only auto-login via LINE on the Customer app portal
          // Rubber, Admin, Store, Provider portals and Landing page use their own auth flow or none
          if (!isPortalSubdomain && !isLanding) {
            liff.login({ redirectUri: window.location.href });
          } else {
            // Non-customer portals and Landing page: just set ready state without auto-login
            setCtx(prev => ({ ...prev, isReady: true, isInClient }));
          }
          return;
        }

        const liffProfile = await liff.getProfile();
        const profile: User = {
          userId: liffProfile.userId,
          displayName: liffProfile.displayName,
          pictureUrl: liffProfile.pictureUrl,
          statusMessage: liffProfile.statusMessage,
        };

        // Set initial profile immediately so UI can unblock
        setCtx(prev => ({
          ...prev,
          isReady: true,
          isLoggedIn: true,
          isInClient,
          profile,
          login: handleLogin,
          logout: handleLogout,
        }));

        // Background Sync with Cloudflare D1
        (async () => {
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

            const dbRes = await fetch(`/api/user/${profile.userId}`);
            if (dbRes.ok) {
              const dbData = await dbRes.json() as any;
              if (dbData.user) {
                const mergedProfile = {
                  ...profile,
                  role: dbData.user.role,
                  assignedStoreId: dbData.user.assignedStoreId,
                  phone: dbData.user.phone
                };
                setCtx(prev => ({ ...prev, profile: mergedProfile }));
              }
            }
          } catch (err) {
            console.error("Background sync failed:", err);
          }
        })();
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
      // Clear the logout flag — user is explicitly choosing to login
      localStorage.removeItem("rubjob_logged_out");
      if (!liff.isLoggedIn()) {
        // Preserve current path so user returns to the same page after login
        const currentUrl = window.location.href;
        liff.login({ redirectUri: currentUrl });
      }
    } catch (err) {
      console.error("[RUBJOB] Login failed:", err);
    }
  };

  const handleLogout = async (redirectPath?: string) => {
    try {
      const liff = (await import("@line/liff")).default;
      
      // 🔐 Set the logout flag BEFORE clearing the token
      // This ensures that even if LINE's WebView auto-re-authenticates,
      // our init() will detect the flag and refuse to proceed.
      localStorage.setItem("rubjob_logged_out", "true");
      
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
      localStorage.setItem("rubjob_logged_out", "true");
      window.location.href = redirectPath || "/";
    }
  };

  return (
    <LiffContext.Provider value={{ ...ctx, login: handleLogin, logout: handleLogout }}>
      {children}
      
      {/* 🛠️ Debug Mock UI (Visible only in development) */}
      {process.env.NODE_ENV === "development" && !ctx.isLoggedIn && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-white rounded-xl shadow-2xl border border-slate-100 p-4 space-y-3 stagger animate-fade-in translate-y-0">
           <p className="text-[10px] font-black text-slate-400 uppercase text-center">Debug Switcher</p>
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
                onClick={() => { localStorage.setItem("rubjob_mock_user", "RUBBER-001"); window.location.reload(); }}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors"
              >
                Be Rubber
              </button>
           </div>
           <button 
            onClick={() => { window.location.href = "/api/debug/init-accounts"; }}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercaseer"
           >
             Reset DB to 1 User Each
           </button>
        </div>
      )}
    </LiffContext.Provider>
  );
}
