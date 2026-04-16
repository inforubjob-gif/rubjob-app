"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/LanguageProvider";

const WASH_PRICES = [
  { size: 9, cold: 40, warm: 50, hot: 60 },
  { size: 14, cold: 60, warm: 70, hot: 80 },
  { size: 18, cold: 70, warm: 80, hot: 90 },
  { size: 28, cold: 100, warm: 120, hot: 140 },
];

const DRY_PRICES = [
  { size: 15, basePrice: 50, extraPrice: 10, extraMinutes: 6 },
  { size: 28, basePrice: 70, extraPrice: 10, extraMinutes: 5 },
];

export default function PricingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-br from-primary via-amber-400 to-primary-dark">
      {/* ─── Header ─── */}
      <header className="px-5 pt-12 pb-6 text-center relative">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-5 top-12 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
          <span className="text-white text-xs font-semibold tracking-wide">RUBJOB</span>
        </div>
        <h1 className="text-white text-xl font-bold leading-snug mb-2">
          {t("pricing.title").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 && <br/>}</span>
          ))}
        </h1>

        <div className="mt-4 bg-white/15 backdrop-blur rounded-2xl px-5 py-4 mx-auto max-w-xs">
          <p className="text-white text-sm font-bold mb-2">{t("pricing.serviceTypes")}</p>
          <ul className="text-white/90 text-sm space-y-1 text-left list-disc list-inside">
            <li>{t("items.general")}</li>
            <li>{t("items.duvet")}</li>
            <li>{t("items.blanket")}</li>
            <li>{t("items.topper")}</li>
          </ul>
        </div>
      </header>

      {/* ─── Pricing Cards ─── */}
      <div className="px-4 pb-28 space-y-5 animate-fade-in">

        {/* ━━━ ราคาซักผ้า ━━━ */}
        <section className="bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl shadow-black/5">
          {/* Section Title */}
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full px-6 py-2 shadow-md">
              <h2 className="text-primary-dark font-bold text-base">{t("pricing.washTitle")}</h2>
            </div>
          </div>

          {/* Tab-like header */}
          <div className="flex gap-1.5 mb-4 justify-center">
            {[t("pricing.machineSize"), t("pricing.cold"), t("pricing.warm"), t("pricing.hot")].map((label, i) => (
              <span
                key={label}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full ${
                  i === 0
                    ? "bg-primary-dark text-white"
                    : "bg-white/80 text-primary-dark"
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Pricing Grid */}
          <div className="bg-white/90 rounded-2xl p-3 space-y-2">
            {WASH_PRICES.map((row) => (
              <div
                key={row.size}
                className="grid grid-cols-4 items-center gap-2 py-2.5 px-3 rounded-2xl bg-white shadow-sm"
              >
                {/* Machine icon + size */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl">🫧</span>
                  <span className="text-[10px] font-bold text-primary-dark mt-0.5">
                    {row.size} {t("pricing.kg")}
                  </span>
                </div>
                {/* Prices */}
                <PriceCell value={row.cold} unit={t("pricing.baht")} />
                <PriceCell value={row.warm} unit={t("pricing.baht")} />
                <PriceCell value={row.hot} unit={t("pricing.baht")} />
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ ราคาอบผ้า ━━━ */}
        <section className="bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl shadow-black/5">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full px-6 py-2 shadow-md">
              <h2 className="text-primary-dark font-bold text-base">{t("pricing.dryTitle")}</h2>
            </div>
          </div>

          {/* Tab-like header */}
          <div className="flex gap-1.5 mb-4 justify-center">
            {[t("pricing.machineSize"), t("pricing.startPrice"), t("pricing.extraPrice")].map((label, i) => (
              <span
                key={label}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full ${
                  i === 0
                    ? "bg-primary-dark text-white"
                    : "bg-white/80 text-primary-dark"
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {DRY_PRICES.map((item) => (
              <div
                key={item.size}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm"
              >
                {/* Machine icon */}
                <div className="flex flex-col items-center shrink-0 w-16">
                  <span className="text-3xl">🌀</span>
                  <span className="text-xs font-bold text-primary-dark mt-1">
                    {item.size} {t("pricing.kg")}
                  </span>
                </div>

                {/* Base price */}
                <div className="flex-1 text-center">
                  <span className="text-2xl font-extrabold text-foreground">
                    {item.basePrice}
                  </span>
                  <p className="text-xs text-muted font-semibold">{t("pricing.baht")}</p>
                </div>

                {/* Extra per-time price */}
                <div className="flex-1 text-center">
                  <span className="text-lg font-bold text-primary-dark">
                    {item.extraPrice} {t("pricing.baht")}
                  </span>
                  <p className="text-[11px] text-muted font-medium">
                    + {item.extraMinutes} {t("pricing.minutes")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ ราคาค่าส่ง ━━━ */}
        <section className="bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl shadow-black/5">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full px-6 py-2 shadow-md">
              <h2 className="text-primary-dark font-bold text-base">{t("pricing.deliveryTitle")}</h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            {/* Highlight badge */}
            <div className="inline-block bg-primary-dark text-white text-xs font-bold px-4 py-1.5 rounded-full mb-3">
              {t("pricing.deliveryOnly")}
            </div>

            {/* Big price */}
            <div className="mb-3">
              <span className="text-5xl font-extrabold text-foreground leading-none">39</span>
              <p className="text-lg font-bold text-muted mt-1">{t("pricing.baht")}</p>
            </div>

            <p className="text-sm text-muted font-medium mb-4">{t("pricing.perOrder")}</p>

            {/* Size chips */}
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {[t("pricing.size9"), t("pricing.size14")].map((text) => (
                <span
                  key={text}
                  className="bg-amber-50 text-primary-dark text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                >
                  {text}
                </span>
              ))}
            </div>

            <p className="text-primary-dark text-sm font-bold">
              {t("pricing.orMore")}
              <br />
              <span className="text-xs font-medium text-muted">{t("pricing.sameFee")}</span>
            </p>

            <p className="text-[10px] text-muted/60 mt-3">
              {t("pricing.deliveryNote")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Helper ─── */
function PriceCell({ value, unit }: { value: number, unit: string }) {
  return (
    <div className="text-center">
      <span className="text-lg font-extrabold text-foreground">{value}</span>
      <p className="text-[10px] text-muted font-semibold">{unit}</p>
    </div>
  );
}
