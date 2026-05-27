"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export interface TutorialStep {
  /** CSS selector for the target element to highlight */
  selector: string;
  /** Thai text to display */
  text: string;
  /** Position of text relative to the highlighted element */
  textPosition: "top" | "bottom" | "left" | "right";
  /** Arrow curve direction */
  arrowDirection: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Page path where this step lives */
  page: string;
  /** Scroll into view before highlighting */
  scrollTo?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    selector: '[data-tutorial-step="1"]',
    text: "เลือกบริการที่ต้องการ",
    textPosition: "right",
    arrowDirection: "bottom-left",
    page: "/",
  },
  {
    selector: '[data-tutorial-step="2"]',
    text: "ตรวจสอบประเภทบริการและที่อยู่รับผ้า",
    textPosition: "bottom",
    arrowDirection: "top-left",
    page: "/booking",
  },
  {
    selector: '[data-tutorial-step="3"]',
    text: "เพิ่มโน้ตถึงคนขับในการรับ - ส่งผ้า",
    textPosition: "bottom",
    arrowDirection: "top-right",
    page: "/booking",
  },
  {
    selector: '[data-tutorial-step="4"]',
    text: "เลือกน้ำหนักผ้าที่ต้องการ",
    textPosition: "bottom",
    arrowDirection: "top-right",
    page: "/booking",
  },
  {
    selector: '[data-tutorial-step="5"]',
    text: "เลือกเวลารับผ้า และรูปแบบส่งคืน",
    textPosition: "top",
    arrowDirection: "bottom-left",
    page: "/booking",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function CurvedArrow({
  from,
  to,
  direction,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  direction: string;
}) {
  // Calculate control point for the curve based on direction
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  let cx: number, cy: number;

  switch (direction) {
    case "top-left":
      cx = from.x + dx * 0.1;
      cy = from.y + dy * 0.7;
      break;
    case "top-right":
      cx = from.x + dx * 0.9;
      cy = from.y + dy * 0.7;
      break;
    case "bottom-left":
      cx = from.x + dx * 0.1;
      cy = from.y + dy * 0.3;
      break;
    case "bottom-right":
      cx = from.x + dx * 0.9;
      cy = from.y + dy * 0.3;
      break;
    default:
      cx = from.x + dx * 0.5;
      cy = from.y + dy * 0.5;
  }

  // Arrowhead angle
  const angle = Math.atan2(to.y - cy, to.x - cx);
  const arrowLen = 12;
  const arrowAngle = Math.PI / 6;

  const a1x = to.x - arrowLen * Math.cos(angle - arrowAngle);
  const a1y = to.y - arrowLen * Math.sin(angle - arrowAngle);
  const a2x = to.x - arrowLen * Math.cos(angle + arrowAngle);
  const a2y = to.y - arrowLen * Math.sin(angle + arrowAngle);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10002 }}
    >
      {/* Curved line */}
      <path
        d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
      />
      {/* Arrowhead */}
      <polygon
        points={`${to.x},${to.y} ${a1x},${a1y} ${a2x},${a2y}`}
        fill="white"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
      />
    </svg>
  );
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
  const [isVisible, setIsVisible] = useState(false);
  const retryRef = useRef<NodeJS.Timeout | null>(null);

  const step = TUTORIAL_STEPS[currentStep];

  const findAndHighlight = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      // Retry a few times for elements that haven't rendered yet
      retryRef.current = setTimeout(findAndHighlight, 300);
      return;
    }

    if (step.scrollTo !== false) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Wait a bit after scroll for position to settle
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setTargetRect({
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
      setIsVisible(true);
    }, 400);
  }, [step]);

  useEffect(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    setIsVisible(false);
    setTargetRect(null);

    // Small delay to let page render
    const timer = setTimeout(findAndHighlight, 200);
    return () => {
      clearTimeout(timer);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [currentStep, findAndHighlight]);

  // Recalculate on resize/scroll
  useEffect(() => {
    const handler = () => {
      if (!step) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setTargetRect({
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [step]);

  function handleNext() {
    const nextStep = currentStep + 1;

    if (nextStep >= TUTORIAL_STEPS.length) {
      // Tutorial complete
      handleComplete();
      return;
    }

    const nextStepData = TUTORIAL_STEPS[nextStep];

    // If next step is on a different page, navigate there
    if (nextStepData.page !== step.page) {
      // Store tutorial state before navigating
      sessionStorage.setItem("rubjob_tutorial_step", String(nextStep));
      router.push(
        `${nextStepData.page}?service=washing&tutorial=${nextStep}`
      );
      return;
    }

    setCurrentStep(nextStep);
  }

  function handleSkip() {
    handleComplete();
  }

  function handleComplete() {
    setIsVisible(false);
    onComplete();
  }

  if (!step || !isVisible || !targetRect) {
    // Show loading state while finding element
    if (step && !isVisible) {
      return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      );
    }
    return null;
  }

  // Calculate text + arrow positions based on targetRect
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const scrollY = window.scrollY;

  // Target center (relative to viewport)
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetTopViewport = targetRect.top - scrollY;
  const targetBottomViewport = targetTopViewport + targetRect.height;
  const targetCenterY = targetTopViewport + targetRect.height / 2;

  // Text position
  let textStyle: React.CSSProperties = {};
  let arrowFrom = { x: 0, y: 0 };
  let arrowTo = { x: 0, y: 0 };

  const textOffset = 30; // gap between element and text

  switch (step.textPosition) {
    case "top":
      textStyle = {
        position: "fixed",
        bottom: viewportH - targetTopViewport + textOffset,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: viewportW - 40,
      };
      arrowFrom = {
        x: targetCenterX,
        y: targetTopViewport - textOffset + 10,
      };
      arrowTo = {
        x: targetCenterX,
        y: targetTopViewport + 5,
      };
      break;
    case "bottom":
      textStyle = {
        position: "fixed",
        top: targetBottomViewport + textOffset,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: viewportW - 40,
      };
      arrowFrom = {
        x: targetCenterX,
        y: targetBottomViewport + textOffset - 10,
      };
      arrowTo = {
        x: targetCenterX,
        y: targetBottomViewport - 5,
      };
      break;
    case "right":
      textStyle = {
        position: "fixed",
        top: targetCenterY - 20,
        right: 20,
        maxWidth: viewportW * 0.45,
      };
      arrowFrom = {
        x: viewportW - 20 - 80,
        y: targetCenterY + 20,
      };
      arrowTo = {
        x: targetRect.left + targetRect.width + 5,
        y: targetCenterY,
      };
      break;
    case "left":
      textStyle = {
        position: "fixed",
        top: targetCenterY - 20,
        left: 20,
        maxWidth: viewportW * 0.45,
      };
      arrowFrom = {
        x: 100,
        y: targetCenterY + 20,
      };
      arrowTo = {
        x: targetRect.left - 5,
        y: targetCenterY,
      };
      break;
  }

  return (
    <div className="fixed inset-0 z-[9999]" onClick={(e) => e.stopPropagation()}>
      {/* Dark overlay with hole cut out */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.65)",
          // Use box-shadow to create the spotlight hole
          clipPath: `polygon(
            0% 0%, 0% 100%, 
            ${targetRect.left}px 100%, 
            ${targetRect.left}px ${targetTopViewport}px, 
            ${targetRect.left + targetRect.width}px ${targetTopViewport}px, 
            ${targetRect.left + targetRect.width}px ${targetTopViewport + targetRect.height}px, 
            ${targetRect.left}px ${targetTopViewport + targetRect.height}px, 
            ${targetRect.left}px 100%, 
            100% 100%, 100% 0%
          )`,
        }}
      />

      {/* Curved Arrow */}
      <CurvedArrow
        from={arrowFrom}
        to={arrowTo}
        direction={step.arrowDirection}
      />

      {/* Text Annotation */}
      <div
        style={textStyle}
        className="z-[10003] text-center animate-fade-in"
      >
        <p
          className="text-white text-lg font-black leading-snug drop-shadow-lg"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
        >
          {step.text}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="fixed bottom-0 left-0 right-0 z-[10004] p-6 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent">
        <button
          onClick={handleSkip}
          className="text-white/70 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors px-4 py-3"
        >
          ข้าม
        </button>

        {/* Step dots */}
        <div className="flex gap-2">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "bg-white w-6"
                  : i < currentStep
                  ? "bg-white/60"
                  : "bg-white/30"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm shadow-xl active:scale-95 transition-transform"
        >
          {currentStep === TUTORIAL_STEPS.length - 1 ? "เสร็จสิ้น" : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
