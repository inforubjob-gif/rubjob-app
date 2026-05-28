"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface StepConfig {
  selector: string;
  page: string;
  placement: "below" | "above";
  image: string;
  customWidth?: string;
  customLeft?: string;
  customTransform?: string;
}

const STEPS: StepConfig[] = [
  {
    selector: '[data-tutorial-step="1"]',
    page: "/",
    placement: "above",
    image: "/images/tutorial_step_1.png?v=2",
    customWidth: "60vw",
    customLeft: "25%",
    customTransform: "none",
  },
  {
    selector: '[data-tutorial-step="2"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_2.png?v=2",
  },
  {
    selector: '[data-tutorial-step="3"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_3.png?v=2",
  },
  {
    selector: '[data-tutorial-step="4"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_4.png?v=2",
  },
  {
    selector: '[data-tutorial-step="5"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_5.png?v=2",
  },
  {
    selector: '[data-tutorial-step="6"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_6.png?v=2",
  },
  {
    selector: '[data-tutorial-step="7"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_7.png?v=2",
  },
  {
    selector: '[data-tutorial-step="8"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_8.png?v=2",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function HowToOverlay({
  onComplete,
  startStep = 0,
  onStepChange,
}: {
  onComplete: () => void;
  startStep?: number;
  onStepChange?: (stepIndex: number) => void;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(startStep);
  const [targetRect, setTargetRect] = useState<Rect>({
    // Start as a tiny dot at center — will animate open to the real target
    top: typeof window !== "undefined" ? window.innerHeight / 2 : 400,
    left: typeof window !== "undefined" ? window.innerWidth / 2 : 200,
    width: 0,
    height: 0,
  });
  const [imageVisible, setImageVisible] = useState(false);
  const [spotlightReady, setSpotlightReady] = useState(false);

  // ── Stable refs ──
  const onCompleteRef = useRef(onComplete);
  const onStepChangeRef = useRef(onStepChange);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onStepChangeRef.current = onStepChange; }, [onStepChange]);

  // ── Block manual scroll ──
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    document.addEventListener("wheel", prevent, { passive: false });
    return () => {
      document.removeEventListener("touchmove", prevent);
      document.removeEventListener("wheel", prevent);
    };
  }, []);

  // ── Find, scroll, measure ──
  useEffect(() => {
    const step = STEPS[currentStep];
    if (!step) return;

    // Fade out the image while moving
    setImageVisible(false);
    onStepChangeRef.current?.(currentStep);

    let cancelled = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout>;
    let measureTimer: ReturnType<typeof setTimeout>;
    let showTimer: ReturnType<typeof setTimeout>;

    function measure(el: HTMLElement) {
      if (cancelled) return;
      const rect = el.getBoundingClientRect();
      const pad = 8;
      setTargetRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
      setSpotlightReady(true);
      // Show image after spotlight finishes animating (400ms transition)
      showTimer = setTimeout(() => {
        if (!cancelled) setImageVisible(true);
      }, 420);
    }

    function tryFind() {
      if (cancelled) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;

      if (!el) {
        attempts++;
        if (attempts < 30) {
          retryTimer = setTimeout(tryFind, 200);
        }
        return;
      }

      // Scroll to element
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Measure after scroll settles
      measureTimer = setTimeout(() => measure(el), 450);
    }

    // Small initial delay for page to settle
    retryTimer = setTimeout(tryFind, 100);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearTimeout(measureTimer);
      clearTimeout(showTimer);
    };
  }, [currentStep]);

  // ── Handle tap / next ──
  function handleNext() {
    const nextIdx = currentStep + 1;
    if (nextIdx >= STEPS.length) {
      onCompleteRef.current();
      return;
    }
    const currentPage = STEPS[currentStep].page;
    const nextPage = STEPS[nextIdx].page;

    if (nextPage !== currentPage) {
      try {
        sessionStorage.setItem("rubjob_tutorial_step", String(nextIdx));
      } catch {}
      router.push(`${nextPage}?service=wash_fold&tutorial=${nextIdx}`);
      return;
    }
    setCurrentStep(nextIdx);
  }

  const step = STEPS[currentStep];
  if (!step) return null;

  // ── Image position ──
  const GAP = 12;
  let imgTop: number | undefined;
  let imgBottom: number | undefined;

  if (spotlightReady) {
    if (step.placement === "below") {
      imgTop = targetRect.top + targetRect.height + GAP;
    } else {
      imgBottom = (typeof window !== "undefined" ? window.innerHeight : 800) - targetRect.top + GAP;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ touchAction: "none" }}
      onClick={handleNext}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* ── Spotlight overlay ──
          Uses box-shadow trick: a div IS the hole, its enormous
          box-shadow covers everything else. CSS transition makes
          the hole glide smoothly between positions. */}
      <div
        style={{
          position: "fixed",
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: 16,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
          transition: "top 0.4s cubic-bezier(0.4,0,0.2,1), left 0.4s cubic-bezier(0.4,0,0.2,1), width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 10001,
          pointerEvents: "none",
        }}
      />

      {/* ── Tutorial Image ── */}
      <img
        key={`img-${currentStep}`}
        src={step.image}
        alt=""
        style={{
          position: "fixed",
          left: step.customLeft || "50%",
          transform: step.customTransform || "translateX(-50%)",
          width: step.customWidth || "85vw",
          maxWidth: "400px",
          objectFit: "contain" as const,
          zIndex: 10003,
          pointerEvents: "none",
          filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
          // Smooth fade + slide in
          opacity: imageVisible ? 1 : 0,
          transition: "opacity 0.35s ease, transform 0.35s ease",
          ...(imgTop !== undefined ? { top: imgTop } : {}),
          ...(imgBottom !== undefined ? { bottom: imgBottom } : {}),
          ...(!spotlightReady ? { top: "45%", transform: "translate(-50%, -50%)" } : {}),
        }}
      />

      {/* ── Step counter ── */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ top: 48, zIndex: 10004 }}
      >
        <span
          className="text-white text-[11px] font-black px-4 py-1.5 rounded-full tracking-wider backdrop-blur-md"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          {currentStep + 1} / {STEPS.length}
        </span>
      </div>

      {/* ── Bottom controls ── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-16 flex items-center justify-between"
        style={{
          zIndex: 10004,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onCompleteRef.current(); }}
          className="text-white/50 text-[11px] font-black uppercase tracking-widest px-3 py-3 active:text-white/80 transition-colors"
        >
          ข้าม
        </button>

        <div className="flex gap-1.5 items-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "bg-white w-5 h-2"
                  : i < currentStep
                    ? "bg-white/50 w-2 h-2"
                    : "bg-white/25 w-2 h-2"
              }`}
            />
          ))}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-black text-sm shadow-2xl active:scale-95 transition-transform"
        >
          {currentStep === STEPS.length - 1 ? "เสร็จสิ้น" : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
