"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import LoginTemplate from "@/components/auth/LoginTemplate";

export default function PartnerLogin() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/partner/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        if (data.type === "store") router.push("/partner-store");
        else router.push("/partner-service");
      } else {
        setError(data.error || t("store.login.failed"));
      }
    } catch (err) {
      setError(t("store.login.errorConn"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginTemplate
      portalName={t("store.login.portal")}
      onSubmit={handleLogin}
      error={error}
      isLoading={loading}
      theme="primary"
      mode="fullpage"
      emailLabel={t("store.login.email")}
      passwordLabel={t("store.login.password")}
    />
  );
}
