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
    // Step 1: Home — เลือกบริการ
    selector: '[data-tutorial-step="1"]',
    page: "/",
    placement: "above",
    image: "/images/tutorial_step_1.png?v=2",
    customWidth: "60vw",
    customLeft: "25%",
    customTransform: "none",
  },
  {
    // Step 2: Booking — ตรวจสอบประเภทบริการและที่อยู่รับผ้า
    selector: '[data-tutorial-step="2"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_2.png?v=2",
  },
  {
    // Step 3: Booking — โน้ตถึงคนขับ
    selector: '[data-tutorial-step="3"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_3.png?v=2",
  },
  {
    // Step 4: Booking — เลือกตะกร้า
    selector: '[data-tutorial-step="4"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_4.png?v=2",
  },
  {
    // Step 5: Booking — เลือกเวลารับผ้า
    selector: '[data-tutorial-step="5"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_5.png?v=2",
  },
  {
    // Step 6: Booking — เลือกเวลาส่งผ้า
    selector: '[data-tutorial-step="6"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_6.png?v=2",
  },
  {
    // Step 7: Booking — เลือกจ่ายเงิน
    selector: '[data-tutorial-step="7"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_7.png?v=2",
  },
  {
    // Step 8: Booking — ยืนยันรายการ
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
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  // ── Stable refs to avoid re-render loops ──
  // These prevent inline callbacks from triggering useEffect dependency changes
  const onCompleteRef = useRef(onComplete);
  const onStepChangeRef = useRef(onStepChange);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onStepChangeRef.current = onStepChange; }, [onStepChange]);

  // ── Block manual scroll (touch swipe / mouse wheel) ──
  // This does NOT block programmatic scrollIntoView()
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    document.addEventListener("wheel", prevent, { passive: false });
    return () => {
      document.removeEventListener("touchmove", prevent);
      document.removeEventListener("wheel", prevent);
    };
  }, []);

  // ── Find target element, scroll to it, and measure ──
  useEffect(() => {
    const step = STEPS[currentStep];
    if (!step) return;

    setTargetRect(null);
    onStepChangeRef.current?.(currentStep);

    let cancelled = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout>;
    let measureTimer: ReturnType<typeof setTimeout>;

    function tryFind() {
      if (cancelled) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;

      if (!el) {
        attempts++;
        if (attempts < 30) {
          retryTimer = setTimeout(tryFind, 200);
        }
        // If not found after 6s, show without spotlight (dark overlay only)
        return;
      }

      // Scroll to element center
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Measure position after scroll animation finishes
      measureTimer = setTimeout(() => {
        if (cancelled) return;
        const rect = el.getBoundingClientRect();
        const pad = 8;
        setTargetRect({
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        });
      }, 500);
    }

    retryTimer = setTimeout(tryFind, 150);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearTimeout(measureTimer);
    };
  }, [currentStep]); // ✅ Only depends on currentStep — no callback refs

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
      } catch (err) {
        console.warn("sessionStorage not accessible", err);
      }
      router.push(`${nextPage}?service=wash_fold&tutorial=${nextIdx}`);
      return;
    }
    setCurrentStep(nextIdx);
  }

  const step = STEPS[currentStep];
  if (!step) return null;

  // ── Position tutorial image relative to spotlight ──
  const GAP = 12;
  let imageStyle: React.CSSProperties = {
    position: "fixed",
    left: step.customLeft || "50%",
    transform: step.customTransform || "translateX(-50%)",
    width: step.customWidth || "85vw",
    maxWidth: "400px",
    objectFit: "contain" as const,
    zIndex: 10003,
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
    pointerEvents: "none" as const,
  };

  if (targetRect) {
    if (step.placement === "below") {
      imageStyle.top = targetRect.top + targetRect.height + GAP;
    } else {
      imageStyle.bottom = window.innerHeight - targetRect.top + GAP;
    }
  } else {
    // While finding element: center the image
    imageStyle.top = "45%";
    if (!step.customTransform) {
      imageStyle.transform = "translate(-50%, -50%)";
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ touchAction: "none" }}
      onClick={handleNext}
    >
      {/* Dark overlay with spotlight hole */}
      {targetRect ? (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 10001 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tutorial-hole">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={16}
                ry={16}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#tutorial-hole)"
          />
        </svg>
      ) : (
        /* Solid dark overlay while searching for element */
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.72)", zIndex: 10001 }}
        />
      )}

      {/* Step Image (contains arrow + text) */}
      <img
        key={`image-${currentStep}`}
        src={step.image}
        alt=""
        style={imageStyle}
      />

      {/* Step counter badge */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ top: "env(safe-area-inset-top, 0px)", paddingTop: 48, zIndex: 10004 }}
      >
        <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-black px-4 py-1.5 rounded-full tracking-wider">
          {currentStep + 1} / {STEPS.length}
        </span>
      </div>

      {/* Bottom controls */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-16 flex items-center justify-between"
        style={{
          zIndex: 10004,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompleteRef.current();
          }}
          className="text-white/60 text-[11px] font-black uppercase tracking-widest px-3 py-3 active:text-white/80 transition-colors"
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
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-black text-sm shadow-2xl active:scale-95 transition-transform"
        >
          {currentStep === STEPS.length - 1 ? "เสร็จสิ้น" : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
