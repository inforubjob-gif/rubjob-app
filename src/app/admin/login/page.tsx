"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import LoginTemplate from "@/components/auth/LoginTemplate";

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    if (!email || !password) {
      setError(t("admin.login.fillBoth"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as any;

      if (res.ok && data.success) {
        // Cookie is set by the API
        router.replace("/admin");
      } else {
        setError(data.error || t("admin.login.loginFailed"));
      }
    } catch (err) {
      setError(t("admin.login.connectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginTemplate
      portalName={t("admin.login.portal")}
      onSubmit={handleLogin}
      error={error}
      isLoading={isLoading}
      theme="dark"
      mode="fullpage"
      emailLabel={t("admin.login.emailLabel")}
      passwordLabel={t("admin.login.passwordLabel")}
      footerText={t("admin.login.secureAccess")}
    />
  );
}
