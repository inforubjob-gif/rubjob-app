"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface StepConfig {
  selector: string;
  text: string;
  page: string;
  placement: "below" | "above";
  arrowTransform: string;
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
    text: "ตรวจสอบประเภทบริการและที่อยู่รับผ้า",
    page: "/booking",
    placement: "below",
    arrowTransform: "scaleY(-1)",
    textAlign: "right",
  },
  {
    // Step 3: Booking — เพิ่มโน้ตถึงคนขับ
    selector: '[data-tutorial-step="3"]',
    text: "เพิ่มโน้ตถึงคนขับในการรับ-ส่งผ้า",
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
    textAlign: "center",
  },
  {
    // Step 5: Booking — เลือกเวลารับผ้า
    selector: '[data-tutorial-step="5"]',
    text: "เลือกเวลารับผ้าและรูปแบบส่งคืน",
    page: "/booking",
    placement: "above",
    arrowTransform: "rotate(0deg)",
    textAlign: "left",
  },
  {
    // Step 6: Booking — เลือกใช้คูปอง
    selector: '[data-tutorial-step="6"]',
    text: "เลือกใช้คูปอง หรือกรอกโค้ดส่วนลด",
    page: "/booking",
    placement: "above",
    arrowTransform: "rotate(0deg)",
    textAlign: "left",
  },
  {
    // Step 7: Booking Payment — ตรวจสอบความถูกต้อง
    selector: '[data-tutorial-step="7"]',
    text: "ตรวจสอบความถูกต้องก่อนชำระเงิน",
    page: "/booking",
    placement: "below",
    arrowTransform: "scaleY(-1)",
    textAlign: "left",
  },
  {
    // Step 8: Booking Payment — สแกน QR Code
    selector: '[data-tutorial-step="8"]',
    text: "สแกนหรือบันทึก QR Code เพื่อนำไปชำระผ่านแอปธนาคาร",
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
      sessionStorage.setItem("rubjob_tutorial_step", String(nextIdx));
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

  // Arrow size and gap
  const ARROW_SIZE = 50;
  const GAP = 4;

  let arrowStyle: React.CSSProperties;
  let textStyle: React.CSSProperties;

  if (step.placement === "below") {
    // Arrow sits just below the element, text right after arrow (at the tail)
    const arrowTop = targetRect.top + targetRect.height + GAP;
    arrowStyle = {
      position: "fixed",
      top: arrowTop,
      left: targetRect.left + targetRect.width * 0.35,
      width: ARROW_SIZE,
      transform: step.arrowTransform,
      zIndex: 10002,
    };
    // Text directly after arrow with no extra gap
    textStyle = {
      position: "fixed",
      top: arrowTop + ARROW_SIZE,
      ...(step.textAlign === "right"
        ? { right: 16, maxWidth: "70%" }
        : step.textAlign === "left"
        ? { left: 16, maxWidth: "70%" }
        : { left: "50%", transform: "translateX(-50%)", maxWidth: "85%" }),
      zIndex: 10003,
    };
  } else {
    // Arrow sits just above the element, text right above arrow (at the tail)
    const arrowTop = targetRect.top - GAP - ARROW_SIZE;
    arrowStyle = {
      position: "fixed",
      top: arrowTop,
      left: targetRect.left + targetRect.width * 0.35,
      width: ARROW_SIZE,
      transform: step.arrowTransform,
      zIndex: 10002,
    };
    // Text directly above arrow with no extra gap
    textStyle = {
      position: "fixed",
      top: arrowTop - 30,
      ...(step.textAlign === "left"
        ? { left: 16, maxWidth: "70%" }
        : step.textAlign === "right"
        ? { right: 16, maxWidth: "70%" }
        : { left: "50%", transform: "translateX(-50%)", maxWidth: "85%" }),
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
          className="text-white text-[17px] font-black leading-snug"
          style={{
            textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)",
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
