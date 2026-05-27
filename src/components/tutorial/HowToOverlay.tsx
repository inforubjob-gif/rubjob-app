"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Each tutorial step has:
 * - selector: CSS selector for the element to spotlight
 * - text: Thai annotation text
 * - page: which page this step lives on
 * - arrow: position & transform for the PNG arrow image
 * - label: position for the text label
 */
interface StepConfig {
  selector: string;
  text: string;
  page: string;
  arrow: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform: string;
    width: string;
  };
  label: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    textAlign?: "left" | "center" | "right";
    maxWidth?: string;
  };
}

const STEPS: StepConfig[] = [
  // Step 1: Home — เลือกบริการ (ลูกศรชี้จากขวาไปซ้ายที่การ์ด)
  {
    selector: '[data-tutorial-step="1"]',
    text: "เลือกบริการที่ต้องการ",
    page: "/",
    arrow: {
      top: "50%",
      right: "5%",
      transform: "rotate(120deg) scaleY(-1)",
      width: "80px",
    },
    label: {
      top: "58%",
      right: "5%",
      textAlign: "right",
      maxWidth: "180px",
    },
  },
  // Step 2: Booking — ตรวจสอบประเภทบริการและที่อยู่รับผ้า
  {
    selector: '[data-tutorial-step="2"]',
    text: "ตรวจสอบประเภทบริการ\nและที่อยู่รับผ้า",
    page: "/booking",
    arrow: {
      bottom: "52%",
      left: "42%",
      transform: "rotate(0deg)",
      width: "70px",
    },
    label: {
      bottom: "42%",
      right: "5%",
      textAlign: "right",
      maxWidth: "220px",
    },
  },
  // Step 3: Booking — เพิ่มโน้ตถึงคนขับ
  {
    selector: '[data-tutorial-step="3"]',
    text: "เพิ่มโน้ตถึงคนขับในการรับ\n- ส่งผ้า",
    page: "/booking",
    arrow: {
      bottom: "52%",
      left: "45%",
      transform: "rotate(0deg) scaleX(-1)",
      width: "70px",
    },
    label: {
      bottom: "42%",
      right: "5%",
      textAlign: "right",
      maxWidth: "220px",
    },
  },
  // Step 4: Booking — เลือกน้ำหนักผ้า
  {
    selector: '[data-tutorial-step="4"]',
    text: "เลือกน้ำหนักผ้าที่ต้องการ",
    page: "/booking",
    arrow: {
      bottom: "48%",
      left: "40%",
      transform: "rotate(10deg) scaleX(-1)",
      width: "80px",
    },
    label: {
      bottom: "38%",
      right: "5%",
      textAlign: "right",
      maxWidth: "220px",
    },
  },
  // Step 5: Booking — เลือกเวลารับผ้า
  {
    selector: '[data-tutorial-step="5"]',
    text: "เลือกเวลารับผ้า\nและรูปแบบส่งคืน",
    page: "/booking",
    arrow: {
      top: "28%",
      left: "38%",
      transform: "rotate(180deg)",
      width: "70px",
    },
    label: {
      top: "22%",
      left: "5%",
      textAlign: "left",
      maxWidth: "220px",
    },
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
  const [isAnimating, setIsAnimating] = useState(false);

  const step = STEPS[currentStep];

  const findElement = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return;

    // Scroll element into view
    el.scrollIntoView({ behavior: "instant", block: "center" });

    // Get rect immediately
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const pad = 6;
      setTargetRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
      setIsAnimating(true);
    });
  }, [step]);

  useEffect(() => {
    setIsAnimating(false);
    setTargetRect(null);

    // Minimal delay — just enough for DOM to be ready
    const timer = setTimeout(findElement, 100);
    return () => clearTimeout(timer);
  }, [currentStep, findElement]);

  // Recalculate on scroll (for position updates)
  useEffect(() => {
    const handler = () => {
      if (!step) return;
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
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [step]);

  function handleNext() {
    const nextIdx = currentStep + 1;
    if (nextIdx >= STEPS.length) {
      onComplete();
      return;
    }

    const nextStep = STEPS[nextIdx];
    if (nextStep.page !== step.page) {
      // Navigate to next page with tutorial param
      sessionStorage.setItem("rubjob_tutorial_step", String(nextIdx));
      router.push(`${nextStep.page}?service=washing&tutorial=${nextIdx}`);
      return;
    }

    setCurrentStep(nextIdx);
  }

  function handleSkip() {
    onComplete();
  }

  if (!step) return null;

  // While finding element, show simple overlay
  if (!targetRect || !isAnimating) {
    return (
      <div
        className="fixed inset-0 z-[9999]"
        style={{ background: "rgba(0,0,0,0.7)" }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ touchAction: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dark overlay with spotlight hole via clip-path */}
      <div
        className="absolute inset-0 transition-all duration-300"
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

      {/* Arrow image */}
      <img
        key={`arrow-${currentStep}`}
        src="/images/ลูกศร.png"
        alt=""
        className="absolute pointer-events-none animate-fade-in"
        style={{
          ...step.arrow,
          zIndex: 10002,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
        }}
      />

      {/* Text label */}
      <div
        key={`label-${currentStep}`}
        className="absolute pointer-events-none z-[10003] animate-fade-in"
        style={{
          ...step.label,
          padding: "0 8px",
        }}
      >
        <p
          className="text-white text-[17px] font-black leading-relaxed whitespace-pre-line"
          style={{
            textShadow: "0 2px 12px rgba(0,0,0,0.6), 0 0px 4px rgba(0,0,0,0.3)",
            textAlign: step.label.textAlign || "center",
          }}
        >
          {step.text}
        </p>
      </div>

      {/* Bottom bar: ข้าม / dots / ถัดไป */}
      <div className="fixed bottom-0 left-0 right-0 z-[10004] px-5 pb-8 pt-16 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        <button
          onClick={handleSkip}
          className="text-white/60 text-[11px] font-black uppercase tracking-widest px-3 py-3 active:text-white transition-colors"
        >
          ข้าม
        </button>

        {/* Step dots */}
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
