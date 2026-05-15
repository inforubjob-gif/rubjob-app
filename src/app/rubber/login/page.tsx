"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import LoginTemplate from "@/components/auth/LoginTemplate";

export default function RubberLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Validate server-side session before redirecting
    // This prevents infinite loops when localStorage has stale data but cookie is expired
    async function checkExistingSession() {
      try {
        const res = await fetch("/api/rubber/me");
        if (res.ok) {
          router.replace("/rubber");
        }
        // If not ok (401), stay on login page — don't redirect back
      } catch {
        // Network error — stay on login page
      }
    }
    
    const rubberSession = localStorage.getItem("rubjob_rubber_session");
    if (rubberSession) {
      checkExistingSession();
    }
  }, [router]);

  const handleLogin = async (email: string, password: string) => {
    if (!email || !password) {
      setError(t("common.error"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rubber/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as any;

      if (res.ok && data.success) {
        // Store rubber info in localStorage
        localStorage.setItem("rubjob_rubber_session", JSON.stringify(data.rubber));
        router.replace("/rubber");
      } else {
        setError(data.error || t("common.error"));
      }
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginTemplate
      portalName={t("rubber.login.portal")}
      onSubmit={handleLogin}
      error={error}
      isLoading={isLoading}
      theme="primary"
      mode="fullpage"
      emailLabel={t("rubber.login.emailLabel")}
      passwordLabel={t("rubber.login.passwordLabel")}
    />
  );
}
