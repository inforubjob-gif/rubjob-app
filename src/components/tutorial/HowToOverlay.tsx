"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    image: "/images/tutorial_step_1.png",
    customWidth: "60vw",
    customLeft: "25%",
    customTransform: "none",
  },
  {
    // Step 2: Booking — ตรวจสอบประเภทบริการและที่อยู่รับผ้า
    selector: '[data-tutorial-step="2"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_2.png",
  },
  {
    // Step 3: Booking — เพิ่มโน้ตถึงคนขับ
    selector: '[data-tutorial-step="3"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_3.png",
  },
  {
    // Step 4: Booking — เลือกน้ำหนักผ้า
    selector: '[data-tutorial-step="4"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_4.png",
  },
  {
    // Step 5: Booking — เลือกเวลารับผ้า
    selector: '[data-tutorial-step="5"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_5.png",
  },
  {
    // Step 6: Booking — เลือกใช้คูปอง
    selector: '[data-tutorial-step="6"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_6.png",
  },
  {
    // Step 7: Booking Payment — ตรวจสอบความถูกต้อง
    selector: '[data-tutorial-step="7"]',
    page: "/booking",
    placement: "below",
    image: "/images/tutorial_step_7.png",
  },
  {
    // Step 8: Booking Payment — สแกน QR Code
    selector: '[data-tutorial-step="8"]',
    page: "/booking",
    placement: "above",
    image: "/images/tutorial_step_8.png",
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
  const [ready, setReady] = useState(false);
  const retryRef = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  const step = STEPS[currentStep];

  const measureElement = useCallback(
    (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const pad = 6;
      setTargetRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
      setReady(true);
    },
    []
  );

  const findElement = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;

    if (!el) {
      retryCount.current++;
      if (retryCount.current >= 30) {
        const nextIdx = currentStep + 1;
        if (nextIdx >= STEPS.length) {
          onComplete();
        } else {
          setCurrentStep(nextIdx);
          onStepChange?.(nextIdx);
        }
        return;
      }
      retryRef.current = setTimeout(findElement, 200);
      return;
    }

    retryCount.current = 0;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => measureElement(el), 400);
  }, [step, currentStep, measureElement, onComplete, onStepChange]);

  useEffect(() => {
    setReady(false);
    setTargetRect(null);
    retryCount.current = 0;
    if (retryRef.current) clearTimeout(retryRef.current);

    onStepChange?.(currentStep);

    const timer = setTimeout(findElement, 150);
    return () => {
      clearTimeout(timer);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [currentStep, findElement]);

  useEffect(() => {
    if (!step || !ready) return;
    const update = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) return;
      measureElement(el);
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [step, ready, measureElement]);

  function handleNext() {
    const nextIdx = currentStep + 1;
    if (nextIdx >= STEPS.length) {
      onComplete();
      return;
    }
    const nextStep = STEPS[nextIdx];
    if (nextStep.page !== step.page) {
      try {
        sessionStorage.setItem("rubjob_tutorial_step", String(nextIdx));
      } catch (err) {
        console.warn("sessionStorage not accessible", err);
      }
      router.push(`${nextStep.page}?service=wash_fold&tutorial=${nextIdx}`);
      return;
    }
    onStepChange?.(nextIdx);
    setCurrentStep(nextIdx);
  }

  if (!step) return null;

  // Loading state
  if (!targetRect || !ready) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // GAP between element and image
  const GAP = 12;

  let imageStyle: React.CSSProperties = {
    position: "fixed",
    left: step.customLeft || "50%",
    transform: step.customTransform || "translateX(-50%)",
    width: step.customWidth || "85vw",
    maxWidth: "400px",
    objectFit: "contain",
    zIndex: 10003,
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
  };

  // Align vertically
  if (step.placement === "below") {
    imageStyle.top = targetRect.top + targetRect.height + GAP;
  } else {
    imageStyle.bottom = window.innerHeight - targetRect.top + GAP;
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ touchAction: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dark overlay with spotlight hole */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
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
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#tutorial-hole)" />
      </svg>

      {/* Step Image (combines arrow + text) */}
      <img
        key={`image-${currentStep}`}
        src={step.image}
        alt=""
        className="pointer-events-none"
        style={imageStyle}
      />

      {/* Bottom controls */}
      <div className="fixed bottom-0 left-0 right-0 z-[10004] px-5 pb-8 pt-16 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        <button
          onClick={() => onComplete()}
          className="text-white/60 text-[11px] font-black uppercase tracking-widest px-3 py-3"
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
          onClick={handleNext}
          className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-black text-sm shadow-2xl active:scale-95 transition-transform"
        >
          {currentStep === STEPS.length - 1 ? "เสร็จสิ้น" : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
