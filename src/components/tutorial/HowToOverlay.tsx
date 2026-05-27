"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Step config — arrow/text positions are calculated relative to the
 * highlighted element's bounding rect at runtime.
 */
interface StepConfig {
  selector: string;
  text: string;
  page: string;
  /**
   * Where to place the arrow+text relative to the highlighted element:
   * - "below-right": text below element, right-aligned, arrow pointing up
   * - "below-center": text below element, centered
   * - "right": text to the right of element, arrow pointing left
   * - "above-left": text above element, arrow pointing down
   */
  placement: "below-right" | "below-center" | "right" | "above-left" | "above-right";
  /** CSS rotation for the arrow image */
  arrowRotate: string;
}

const STEPS: StepConfig[] = [
  {
    selector: '[data-tutorial-step="1"]',
    text: "เลือกบริการที่ต้องการ",
    page: "/",
    placement: "right",
    arrowRotate: "rotate(100deg) scaleX(-1)",
  },
  {
    selector: '[data-tutorial-step="2"]',
    text: "ตรวจสอบประเภทบริการ\nและที่อยู่รับผ้า",
    page: "/booking",
    placement: "below-right",
    arrowRotate: "rotate(10deg)",
  },
  {
    selector: '[data-tutorial-step="3"]',
    text: "เพิ่มโน้ตถึงคนขับในการรับ\n- ส่งผ้า",
    page: "/booking",
    placement: "below-right",
    arrowRotate: "rotate(10deg) scaleX(-1)",
  },
  {
    selector: '[data-tutorial-step="4"]',
    text: "เลือกน้ำหนักผ้าที่ต้องการ",
    page: "/booking",
    placement: "below-right",
    arrowRotate: "rotate(10deg) scaleX(-1)",
  },
  {
    selector: '[data-tutorial-step="5"]',
    text: "เลือกเวลารับผ้า\nและรูปแบบส่งคืน",
    page: "/booking",
    placement: "above-left",
    arrowRotate: "rotate(190deg)",
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
  const retryCount = useRef(0);
  const maxRetries = 20; // 20 * 150ms = 3 seconds max wait

  const step = STEPS[currentStep];

  const findElement = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      // Retry until element appears (e.g., waiting for conditional render)
      retryCount.current++;
      if (retryCount.current < maxRetries) {
        setTimeout(findElement, 150);
      }
      return;
    }

    retryCount.current = 0;

    // Scroll into view first
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Wait for scroll to settle, then measure
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const pad = 6;
      setTargetRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
      setReady(true);
    }, 350);
  }, [step]);

  useEffect(() => {
    setReady(false);
    setTargetRect(null);
    retryCount.current = 0;
    const timer = setTimeout(findElement, 100);
    return () => clearTimeout(timer);
  }, [currentStep, findElement]);

  // Keep rect updated on scroll
  useEffect(() => {
    if (!step || !ready) return;
    const update = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pad = 6;
      setTargetRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [step, ready]);

  function handleNext() {
    const nextIdx = currentStep + 1;
    if (nextIdx >= STEPS.length) {
      onComplete();
      return;
    }
    const nextStep = STEPS[nextIdx];
    if (nextStep.page !== step.page) {
      sessionStorage.setItem("rubjob_tutorial_step", String(nextIdx));
      router.push(`${nextStep.page}?service=washing&tutorial=${nextIdx}`);
      return;
    }
    setCurrentStep(nextIdx);
  }

  if (!step) return null;

  // Loading overlay while searching for element
  if (!targetRect || !ready) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-xs font-bold">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Calculate arrow + text positions based on element rect and placement
  const arrowSize = 70;
  let arrowStyle: React.CSSProperties = {};
  let textStyle: React.CSSProperties = {};

  switch (step.placement) {
    case "right": {
      // Text to the right of element, arrow pointing left toward element
      const textX = Math.min(targetRect.left + targetRect.width + 10, window.innerWidth - 200);
      const textY = targetRect.top + targetRect.height / 2;
      textStyle = {
        position: "fixed",
        top: textY + 30,
        left: textX,
        maxWidth: window.innerWidth - textX - 16,
        textAlign: "left",
      };
      arrowStyle = {
        position: "fixed",
        top: textY - arrowSize / 2,
        left: textX - 10,
        width: arrowSize,
        transform: step.arrowRotate,
      };
      break;
    }
    case "below-right": {
      // Text below element, right side
      textStyle = {
        position: "fixed",
        top: targetRect.top + targetRect.height + arrowSize + 5,
        right: 16,
        maxWidth: "60%",
        textAlign: "right",
      };
      arrowStyle = {
        position: "fixed",
        top: targetRect.top + targetRect.height + 5,
        right: window.innerWidth * 0.3,
        width: arrowSize,
        transform: step.arrowRotate,
      };
      break;
    }
    case "below-center": {
      textStyle = {
        position: "fixed",
        top: targetRect.top + targetRect.height + arrowSize + 5,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "80%",
        textAlign: "center",
      };
      arrowStyle = {
        position: "fixed",
        top: targetRect.top + targetRect.height + 5,
        left: "50%",
        marginLeft: -arrowSize / 2,
        width: arrowSize,
        transform: step.arrowRotate,
      };
      break;
    }
    case "above-left": {
      // Text above element, left side
      textStyle = {
        position: "fixed",
        top: targetRect.top - arrowSize - 40,
        left: 16,
        maxWidth: "60%",
        textAlign: "left",
      };
      arrowStyle = {
        position: "fixed",
        top: targetRect.top - arrowSize - 5,
        left: window.innerWidth * 0.3,
        width: arrowSize,
        transform: step.arrowRotate,
      };
      break;
    }
    case "above-right": {
      textStyle = {
        position: "fixed",
        top: targetRect.top - arrowSize - 40,
        right: 16,
        maxWidth: "60%",
        textAlign: "right",
      };
      arrowStyle = {
        position: "fixed",
        top: targetRect.top - arrowSize - 5,
        right: window.innerWidth * 0.3,
        width: arrowSize,
        transform: step.arrowRotate,
      };
      break;
    }
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

      {/* Arrow image (ASCII filename!) */}
      <img
        key={`arrow-${currentStep}`}
        src="/images/arrow-curved.png"
        alt=""
        className="pointer-events-none"
        style={{
          ...arrowStyle,
          zIndex: 10002,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
        }}
      />

      {/* Text label */}
      <div
        key={`label-${currentStep}`}
        className="pointer-events-none z-[10003]"
        style={{
          ...textStyle,
          padding: "0 4px",
        }}
      >
        <p
          className="text-white text-[17px] font-black leading-relaxed whitespace-pre-line"
          style={{
            textShadow:
              "0 2px 12px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.4)",
          }}
        >
          {step.text}
        </p>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[10004] px-5 pb-8 pt-16 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        <button
          onClick={() => onComplete()}
          className="text-white/60 text-[11px] font-black uppercase tracking-widest px-3 py-3 active:text-white transition-colors"
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
