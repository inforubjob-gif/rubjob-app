"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface StepConfig {
  selector: string;
  text: string;
  page: string;
  /** How to place arrow+text relative to the highlighted element */
  placement: "below" | "above";
  /** CSS transform for the arrow image */
  arrowTransform: string;
  /** Horizontal align of text */
  textAlign: "left" | "center" | "right";
}

const STEPS: StepConfig[] = [
  {
    // Step 1: Home — เลือกบริการ
    selector: '[data-tutorial-step="1"]',
    text: "เลือกบริการที่ต้องการ",
    page: "/",
    placement: "below",
    arrowTransform: "scaleY(-1) rotate(-30deg)",
    textAlign: "right",
  },
  {
    // Step 2: Booking — ตรวจสอบประเภทบริการและที่อยู่รับผ้า
    selector: '[data-tutorial-step="2"]',
    text: "ตรวจสอบประเภทบริการ\nและที่อยู่รับผ้า",
    page: "/booking",
    placement: "below",
    arrowTransform: "scaleY(-1)",
    textAlign: "right",
  },
  {
    // Step 3: Booking — เพิ่มโน้ตถึงคนขับ
    selector: '[data-tutorial-step="3"]',
    text: "เพิ่มโน้ตถึงคนขับในการรับ\n- ส่งผ้า",
    page: "/booking",
    placement: "below",
    arrowTransform: "scaleY(-1) scaleX(-1)",
    textAlign: "right",
  },
  {
    // Step 4: Booking — เลือกน้ำหนักผ้า
    selector: '[data-tutorial-step="4"]',
    text: "เลือกน้ำหนักผ้าที่ต้องการ",
    page: "/booking",
    placement: "below",
    arrowTransform: "scaleY(-1) scaleX(-1)",
    textAlign: "right",
  },
  {
    // Step 5: Booking — เลือกเวลารับผ้า
    selector: '[data-tutorial-step="5"]',
    text: "เลือกเวลารับผ้า\nและรูปแบบส่งคืน",
    page: "/booking",
    placement: "above",
    arrowTransform: "rotate(0deg)",
    textAlign: "left",
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
}: {
  onComplete: () => void;
  startStep?: number;
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
        // Element never appeared — skip this step
        const nextIdx = currentStep + 1;
        if (nextIdx >= STEPS.length) {
          onComplete();
        } else {
          setCurrentStep(nextIdx);
        }
        return;
      }
      retryRef.current = setTimeout(findElement, 200);
      return;
    }

    retryCount.current = 0;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Wait for scroll to finish
    setTimeout(() => measureElement(el), 400);
  }, [step, currentStep, measureElement, onComplete]);

  useEffect(() => {
    setReady(false);
    setTargetRect(null);
    retryCount.current = 0;
    if (retryRef.current) clearTimeout(retryRef.current);

    const timer = setTimeout(findElement, 150);
    return () => {
      clearTimeout(timer);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [currentStep, findElement]);

  // Keep rect updated on scroll
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
      sessionStorage.setItem("rubjob_tutorial_step", String(nextIdx));
      // Use correct service ID: wash_fold (not "washing")
      router.push(`${nextStep.page}?service=wash_fold&tutorial=${nextIdx}`);
      return;
    }
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

  // Calculate arrow + text positions relative to element
  const ARROW_H = 70;
  const GAP = 8;

  let arrowStyle: React.CSSProperties;
  let textStyle: React.CSSProperties;

  if (step.placement === "below") {
    // Arrow sits below the element, text below the arrow
    arrowStyle = {
      position: "fixed",
      top: targetRect.top + targetRect.height + GAP,
      left: targetRect.left + targetRect.width * 0.35,
      width: ARROW_H,
      transform: step.arrowTransform,
      zIndex: 10002,
    };
    textStyle = {
      position: "fixed",
      top: targetRect.top + targetRect.height + GAP + ARROW_H + 8,
      ...(step.textAlign === "right"
        ? { right: 16, maxWidth: "65%" }
        : step.textAlign === "left"
        ? { left: 16, maxWidth: "65%" }
        : { left: "50%", transform: "translateX(-50%)", maxWidth: "80%" }),
      zIndex: 10003,
    };
  } else {
    // "above" — arrow sits above the element, text above the arrow
    arrowStyle = {
      position: "fixed",
      top: targetRect.top - GAP - ARROW_H,
      left: targetRect.left + targetRect.width * 0.35,
      width: ARROW_H,
      transform: step.arrowTransform,
      zIndex: 10002,
    };
    textStyle = {
      position: "fixed",
      top: targetRect.top - GAP - ARROW_H - 50,
      ...(step.textAlign === "left"
        ? { left: 16, maxWidth: "65%" }
        : step.textAlign === "right"
        ? { right: 16, maxWidth: "65%" }
        : { left: "50%", transform: "translateX(-50%)", maxWidth: "80%" }),
      zIndex: 10003,
    };
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ touchAction: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dark overlay with spotlight hole */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.7)",
          clipPath: `polygon(
            0% 0%, 0% 100%,
            ${targetRect.left}px 100%,
            ${targetRect.left}px ${targetRect.top}px,
            ${targetRect.left + targetRect.width}px ${targetRect.top}px,
            ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
            ${targetRect.left}px ${targetRect.top + targetRect.height}px,
            ${targetRect.left}px 100%,
            100% 100%, 100% 0%
          )`,
        }}
      />

      {/* Arrow (PNG) */}
      <img
        key={`arrow-${currentStep}`}
        src="/images/arrow-curved.png"
        alt=""
        className="pointer-events-none"
        style={{
          ...arrowStyle,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
        }}
      />

      {/* Text */}
      <div
        key={`text-${currentStep}`}
        className="pointer-events-none"
        style={textStyle}
      >
        <p
          className="text-white text-[17px] font-black leading-relaxed whitespace-pre-line"
          style={{
            textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.4)",
            textAlign: step.textAlign,
          }}
        >
          {step.text}
        </p>
      </div>

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
