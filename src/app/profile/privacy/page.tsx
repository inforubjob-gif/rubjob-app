"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { Icons } from "@/components/ui/Icons";

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <header className="px-5 pt-12 pb-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 bg-white z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
        >
          <Icons.Back size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">{t("profile.privacyPage.title")}</h1>
      </header>

      <main className="p-6 space-y-6 text-slate-600">
        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">{t("profile.privacyPage.collectionTitle")}</h2>
          <p className="text-sm leading-relaxed">
            {t("profile.privacyPage.collectionDesc")}
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">{t("profile.privacyPage.usageTitle")}</h2>
          <p className="text-sm leading-relaxed">
            {t("profile.privacyPage.usageDesc")}
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">{t("profile.privacyPage.securityTitle")}</h2>
          <p className="text-sm leading-relaxed">
            {t("profile.privacyPage.securityDesc")}
          </p>
        </section>

        <div className="pt-8 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-400">{t("profile.privacyPage.footer")}</p>
        </div>
      </main>
    </div>
  );
}
